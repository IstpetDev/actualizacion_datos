namespace Istpet.ActualizacionDatos.WebApi.Tests;

using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

public sealed class ArmadorDatosDocumentoTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly AplicacionDbContext _db;
    private readonly IAlmacenArchivos _almacenArchivos = new AlmacenArchivosPrueba();
    private readonly ArmadorDatosDocumento _armador;
    private readonly InstitucionId _institucionId = InstitucionId.Nuevo();

    private sealed class AlmacenArchivosPrueba : IAlmacenArchivos
    {
        public Task<string> GuardarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, Stream contenido, CancellationToken ct = default) => Task.FromResult("/ruta/ficticia");
        public Task<Stream?> AbrirAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default) => Task.FromResult<Stream?>(null);
        public Task<bool> EliminarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default) => Task.FromResult(true);
        public Task<bool> ExisteAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default) => Task.FromResult(true);
    }

    public ArmadorDatosDocumentoTests()
    {
        _conexion.Open();
        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseSqlite(_conexion)
            .UseSnakeCaseNamingConvention()
            .Options;

        _db = new AplicacionDbContext(opciones);
        _db.Database.EnsureCreated();

        // Sembrar catálogos de prueba con códigos únicos para niveles y grados académicos
        _db.ElementosCatalogo.AddRange(
            new ElementoCatalogo(9001, TipoCatalogo.NivelAcademico, "NIVEL_3_TEST", "Tercer Nivel", orden: 3),
            new ElementoCatalogo(9002, TipoCatalogo.NivelAcademico, "NIVEL_6_TEST", "Maestría", orden: 6),
            new ElementoCatalogo(9010, TipoCatalogo.GradoAcademico, "ING_TEST", "Ingeniería en Sistemas", padreId: 9001, orden: 1),
            new ElementoCatalogo(9020, TipoCatalogo.GradoAcademico, "MSC_TEST", "Máster en Ciencias", padreId: 9002, orden: 2),
            new ElementoCatalogo(9030, TipoCatalogo.Pais, "PAIS_TEST", "País de Prueba", orden: 1),
            new ElementoCatalogo(9040, TipoCatalogo.EstadoCivil, "ESTADO_CIVIL_TEST", "Soltero/a", orden: 1));

        _db.Instituciones.Add(new Institucion(_institucionId, "Institución de Prueba Armador"));
        _db.SaveChanges();

        _armador = new ArmadorDatosDocumento(_db, _almacenArchivos);
    }

    public void Dispose()
    {
        _db.Dispose();
        _conexion.Dispose();
    }

    [Fact]
    public async Task ArmarDatosPersona_MapeaCampos_Y_CalculaTituloMayorNivel_PD_PLA_08()
    {
        var persona = new Persona(
            Guid.NewGuid(),
            _institucionId,
            "0000000001",
            RolUsuario.Usuario,
            "Pérez Juan",
            "juan.perez@ejemplo.test",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Aprobado);
        _db.Personas.Add(persona);

        var ficha = new FichaPersonal(_institucionId, persona.Id);
        ficha.Actualizar(new DatosFichaPersonal(
            PrimerNombre: "Juan",
            SegundoNombre: "Carlos",
            PrimerApellido: "Pérez",
            SegundoApellido: "Gómez",
            FechaNacimiento: new DateOnly(1990, 5, 15),
            Celular: "0999999999",
            CallePrincipal: "Av. Siempre Viva",
            NumeroCasa: "742",
            EstadoCivilId: 9040,
            PaisNacimientoId: 9030));
        _db.FichasPersonales.Add(ficha);

        // Título 1: Tercer nivel
        var t1 = new TituloAcademico(
            Guid.NewGuid(),
            _institucionId,
            persona.Id,
            new DatosTituloAcademico(
                GradoAcademicoId: 9010,
                NombreTitulo: "Ingeniero de Software",
                NombreInstitucionOtra: "Universidad Central de Prueba",
                FechaObtencion: new DateOnly(2015, 6, 20),
                NumeroRegistroSenescyt: "1001-15-123456"));

        // Título 2: Maestría (mayor nivel académico)
        var t2 = new TituloAcademico(
            Guid.NewGuid(),
            _institucionId,
            persona.Id,
            new DatosTituloAcademico(
                GradoAcademicoId: 9020,
                NombreTitulo: "Magíster en Ciberseguridad",
                NombreInstitucionOtra: "Universidad Internacional de Prueba",
                FechaObtencion: new DateOnly(2020, 11, 10),
                NumeroRegistroSenescyt: "2002-20-654321"));

        _db.TitulosAcademicos.AddRange(t1, t2);
        await _db.SaveChangesAsync();

        var resultado = await _armador.ArmarDatosPersonaAsync(persona.Id, _institucionId);

        Assert.NotNull(resultado);
        Assert.Equal("Juan Carlos Pérez Gómez", resultado.DatosPersonales.NombreCompleto);
        Assert.Equal("0000000001", resultado.DatosPersonales.DocumentoIdentidad);
        Assert.False(resultado.EsVistaPrevia);

        // PD-PLA-08: El registro principal debe ser el de mayor nivel (Maestría)
        Assert.NotNull(resultado.DatosPersonales.RegistroSenescyt);
        Assert.Equal("2002-20-654321", resultado.DatosPersonales.RegistroSenescyt.NumeroRegistro);
        Assert.Equal(new DateOnly(2020, 11, 10), resultado.DatosPersonales.RegistroSenescyt.FechaRegistro);

        // Verificar 2 formaciones ordenadas descendente por fecha
        Assert.Equal(2, resultado.Formaciones.Count);
        Assert.Equal("Magíster en Ciberseguridad", resultado.Formaciones[0].Titulo);
        Assert.Equal("Ingeniero de Software", resultado.Formaciones[1].Titulo);
    }

    [Fact]
    public async Task ArmarDatosPersona_EstadoBorrador_MarcaVistaPreviaTrue()
    {
        var persona = new Persona(
            Guid.NewGuid(),
            _institucionId,
            "0000000002",
            RolUsuario.Usuario,
            "López María",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Borrador);
        _db.Personas.Add(persona);
        await _db.SaveChangesAsync();

        var resultado = await _armador.ArmarDatosPersonaAsync(persona.Id, _institucionId);

        Assert.True(resultado.EsVistaPrevia);
    }

    [Fact]
    public async Task ArmarDatosPersona_InstitucionAjena_LanzaExcepcion()
    {
        var persona = new Persona(
            Guid.NewGuid(),
            _institucionId,
            "0000000003",
            RolUsuario.Usuario,
            "García Pedro",
            accesoHabilitado: true);
        _db.Personas.Add(persona);
        await _db.SaveChangesAsync();

        var otraInstitucion = InstitucionId.Nuevo();

        await Assert.ThrowsAsync<ReglaNegocioException>(async () =>
            await _armador.ArmarDatosPersonaAsync(persona.Id, otraInstitucion));
    }
}
