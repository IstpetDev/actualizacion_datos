namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class SemillaTiposInstitucionalesIntegracionTests
{
    [Fact]
    public async Task Migracion_y_alta_generan_los_mismos_tipos_sin_sobrescribir_ni_duplicar()
    {
        await using var contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();
        await contenedor.StartAsync();
        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(contenedor.GetConnectionString()).UseSnakeCaseNamingConvention().Options;
        var superadmin = new ContextoInstitucion(null, esSuperadmin: true);
        await using var db = new AplicacionDbContext(opciones, superadmin);
        var migrador = db.GetService<IMigrator>();
        const string migracionPrevia = "20261022181915_AgregarCuentaBancaria";
        await migrador.MigrateAsync(migracionPrevia);

        var parcial = InstitucionId.Nuevo();
        var vacia = InstitucionId.Nuevo();
        db.Instituciones.AddRange(new Institucion(parcial, "Institución ficticia parcial"), new Institucion(vacia, "Institución ficticia vacía"));
        var docente = new TipoFuncionario(Guid.NewGuid(), parcial, "DOCENTE", "Tipo ficticio personalizado", false, false);
        var cedula = new TipoDocumento(Guid.NewGuid(), parcial, "CEDULA", "Documento ficticio personalizado", "Instrucción ficticia", false, 25, false);
        db.TiposFuncionario.Add(docente);
        db.TiposDocumento.Add(cedula);
        await db.SaveChangesAsync();

        await migrador.MigrateAsync();
        var idsDocumentos = await db.TiposDocumento.OrderBy(t => t.Id).Select(t => t.Id).ToListAsync();
        var idsFuncionarios = await db.TiposFuncionario.OrderBy(t => t.Id).Select(t => t.Id).ToListAsync();
        // Ejecutar nuevamente el SQL real verifica la idempotencia, no solo el historial de EF.
        foreach (var operacion in new AgregarSemillasTiposInstitucionales().UpOperations.Cast<SqlOperation>())
        {
            await db.Database.ExecuteSqlRawAsync(operacion.Sql);
        }
        // Una reversión y reaplicación tampoco debe perder datos editables ni generar duplicados.
        await migrador.MigrateAsync(migracionPrevia);
        await migrador.MigrateAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(idsDocumentos, await db.TiposDocumento.OrderBy(t => t.Id).Select(t => t.Id).ToListAsync());
        Assert.Equal(idsFuncionarios, await db.TiposFuncionario.OrderBy(t => t.Id).Select(t => t.Id).ToListAsync());
        docente = await db.TiposFuncionario.SingleAsync(t => t.Id == docente.Id);
        cedula = await db.TiposDocumento.SingleAsync(t => t.Id == cedula.Id);
        Assert.Equal("Tipo ficticio personalizado", docente.Nombre);
        Assert.False(docente.EsDocente);
        Assert.False(docente.Activo);
        Assert.Equal("Documento ficticio personalizado", cedula.Nombre);
        Assert.Equal("Instrucción ficticia", cedula.Descripcion);
        Assert.False(cedula.TieneVencimiento);
        Assert.Equal(25, cedula.Orden);
        Assert.False(cedula.Activo);

        var nueva = await new ServicioInstituciones(db, superadmin).CrearInstitucionAsync(new CrearInstitucionRequest("Institución ficticia nueva"));
        var idNueva = new InstitucionId(nueva.Id);
        await SemillaTiposInstitucionales.AgregarFaltantesAsync(db, idNueva);
        await SemillaTiposInstitucionales.AgregarFaltantesAsync(db, idNueva);
        Assert.False(db.ChangeTracker.HasChanges());
        var documentosMigrados = await db.TiposDocumento.Where(t => t.InstitucionId == vacia).OrderBy(t => t.Codigo).ToListAsync();
        var documentosNuevos = await db.TiposDocumento.Where(t => t.InstitucionId == idNueva).OrderBy(t => t.Codigo).ToListAsync();
        Assert.Equal(6, documentosMigrados.Count);
        Assert.Equal(documentosMigrados.Select(t => (t.Codigo, t.Nombre, t.Descripcion, t.TieneVencimiento, t.Orden, t.Activo)),
            documentosNuevos.Select(t => (t.Codigo, t.Nombre, t.Descripcion, t.TieneVencimiento, t.Orden, t.Activo)));
        var funcionariosMigrados = await db.TiposFuncionario.Where(t => t.InstitucionId == vacia).OrderBy(t => t.Codigo).ToListAsync();
        var funcionariosNuevos = await db.TiposFuncionario.Where(t => t.InstitucionId == idNueva).OrderBy(t => t.Codigo).ToListAsync();
        Assert.Equal(2, funcionariosMigrados.Count);
        Assert.Equal(funcionariosMigrados.Select(t => (t.Codigo, t.Nombre, t.EsDocente, t.Activo)),
            funcionariosNuevos.Select(t => (t.Codigo, t.Nombre, t.EsDocente, t.Activo)));
        Assert.Empty(await db.RequisitosDocumento.ToListAsync());

        await using var dbParcial = new AplicacionDbContext(opciones, new ContextoInstitucion(parcial));
        Assert.Equal(6, await dbParcial.TiposDocumento.CountAsync());
        Assert.Equal(2, await dbParcial.TiposFuncionario.CountAsync());
        Assert.Null(await dbParcial.TiposDocumento.FirstOrDefaultAsync(t => t.InstitucionId == idNueva));
    }
}
