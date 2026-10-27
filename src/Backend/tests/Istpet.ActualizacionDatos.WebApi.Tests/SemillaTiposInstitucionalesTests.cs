namespace Istpet.ActualizacionDatos.WebApi.Tests;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

public sealed class SemillaTiposInstitucionalesTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly ContextoInstitucion _superadmin = new(null, esSuperadmin: true);
    private readonly AplicacionDbContext _db;

    public SemillaTiposInstitucionalesTests()
    {
        _conexion.Open();
        _db = new AplicacionDbContext(new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options, _superadmin);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _conexion.Dispose();
    }

    [Fact]
    public async Task Alta_siembra_lista_aprobada_sin_crear_requisitos()
    {
        var institucion = await new ServicioInstituciones(_db, _superadmin)
            .CrearInstitucionAsync(new CrearInstitucionRequest("Institución ficticia de semilla"));
        _db.ChangeTracker.Clear();
        var id = new InstitucionId(institucion.Id);
        var funcionarios = await _db.TiposFuncionario.Where(t => t.InstitucionId == id).OrderBy(t => t.Codigo).ToListAsync();
        Assert.Equal(["ADMINISTRATIVO", "DOCENTE"], funcionarios.Select(t => t.Codigo));
        Assert.False(funcionarios[0].EsDocente);
        Assert.True(funcionarios[1].EsDocente);
        Assert.All(funcionarios, t => Assert.True(t.Activo));

        var documentos = await _db.TiposDocumento.Where(t => t.InstitucionId == id).OrderBy(t => t.Orden).ToListAsync();
        Assert.Equal(["CEDULA", "PAPELETA_VOTACION", "ANTECEDENTES_PENALES", "DECLARACION_JURAMENTADA", "MECANIZADO_IESS", "CERTIFICADO_MEDICO"], documentos.Select(t => t.Codigo));
        Assert.Equal([1, 2, 3, 4, 5, 6], documentos.Select(t => t.Orden));
        Assert.Equal([true, false, false, false, false, true], documentos.Select(t => t.TieneVencimiento));
        Assert.Equal([
            "Adjunte una copia legible de ambos lados de su cédula.",
            "Adjunte una copia legible de su papeleta de votación.",
            "Adjunte su certificado de antecedentes penales.",
            "Adjunte su declaración juramentada notariada.",
            "Adjunte el mecanizado del IESS correspondiente a su historia laboral.",
            "Adjunte su certificado médico e indique su fecha de vencimiento."
        ], documentos.Select(t => t.Descripcion));
        Assert.All(documentos, t => Assert.True(t.Activo));
        Assert.Empty(await _db.RequisitosDocumento.ToListAsync());
    }

    [Fact]
    public async Task Repeticion_antes_y_despues_de_guardar_completa_solo_faltantes_en_la_institucion_indicada()
    {
        var id = InstitucionId.Nuevo();
        var otra = InstitucionId.Nuevo();
        _db.Instituciones.AddRange(new Institucion(id, "Institución ficticia A"), new Institucion(otra, "Institución ficticia B"));
        var docente = new TipoFuncionario(Guid.NewGuid(), id, "DOCENTE", "Nombre personalizado", esDocente: false, activo: false);
        var cedula = new TipoDocumento(Guid.NewGuid(), id, "CEDULA", "Documento personalizado", "Instrucción personalizada", false, 25, false);
        _db.TiposFuncionario.Add(docente);
        _db.TiposDocumento.Add(cedula);
        await _db.SaveChangesAsync();

        // El contexto de otro tenant no debe ocultar los códigos de la institución solicitada.
        await using var db = new AplicacionDbContext(new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options, new ContextoInstitucion(otra));
        await SemillaTiposInstitucionales.AgregarFaltantesAsync(db, id);
        await SemillaTiposInstitucionales.AgregarFaltantesAsync(db, id);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        await SemillaTiposInstitucionales.AgregarFaltantesAsync(db, id);
        Assert.False(db.ChangeTracker.HasChanges());
        await db.SaveChangesAsync();

        _db.ChangeTracker.Clear();
        Assert.Equal(2, await _db.TiposFuncionario.CountAsync(t => t.InstitucionId == id));
        Assert.Equal(6, await _db.TiposDocumento.CountAsync(t => t.InstitucionId == id));
        Assert.Empty(await _db.TiposFuncionario.Where(t => t.InstitucionId == otra).ToListAsync());
        Assert.Empty(await _db.TiposDocumento.Where(t => t.InstitucionId == otra).ToListAsync());
        docente = await _db.TiposFuncionario.SingleAsync(t => t.Id == docente.Id);
        cedula = await _db.TiposDocumento.SingleAsync(t => t.Id == cedula.Id);
        Assert.Equal("Nombre personalizado", docente.Nombre);
        Assert.False(docente.EsDocente);
        Assert.False(docente.Activo);
        Assert.Equal("Documento personalizado", cedula.Nombre);
        Assert.Equal("Instrucción personalizada", cedula.Descripcion);
        Assert.False(cedula.TieneVencimiento);
        Assert.Equal(25, cedula.Orden);
        Assert.False(cedula.Activo);
    }

    [Fact]
    public async Task Fallo_al_insertar_semilla_revierte_alta_administradores_y_auditoria()
    {
        await _db.Database.ExecuteSqlRawAsync("""
            CREATE TRIGGER impedir_semilla BEFORE INSERT ON tipos_documento
            BEGIN SELECT RAISE(ABORT, 'Fallo ficticio de persistencia'); END;
            """);
        await Assert.ThrowsAsync<DbUpdateException>(() => new ServicioInstituciones(_db, _superadmin)
            .CrearInstitucionAsync(new CrearInstitucionRequest("Institución ficticia fallida",
                [new AdminInicialRequest("0000000000", "Administrador ficticio", "admin@ejemplo.test")])));
        _db.ChangeTracker.Clear();
        Assert.Empty(await _db.Instituciones.ToListAsync());
        Assert.Empty(await _db.Personas.ToListAsync());
        Assert.Empty(await _db.Auditorias.ToListAsync());
        Assert.Empty(await _db.TiposFuncionario.ToListAsync());
        Assert.Empty(await _db.TiposDocumento.ToListAsync());
    }
}
