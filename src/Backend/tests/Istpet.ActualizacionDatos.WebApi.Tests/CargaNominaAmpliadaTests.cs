namespace Istpet.ActualizacionDatos.WebApi.Tests;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

public sealed class CargaNominaAmpliadaTests : IDisposable
{
    private readonly SqliteConnection _conexion;

    public CargaNominaAmpliadaTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
    }

    public void Dispose()
    {
        _conexion.Dispose();
    }

    private DbContextOptions<AplicacionDbContext> CrearOpciones()
    {
        return new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseSqlite(_conexion)
            .UseSnakeCaseNamingConvention()
            .Options;
    }

    private async Task<AplicacionDbContext> CrearContextoAsync(InstitucionId instId)
    {
        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var db = new AplicacionDbContext(CrearOpciones(), contexto);
        await db.Database.EnsureCreatedAsync();
        db.Instituciones.Add(new Institucion(instId, "Institucion de Prueba"));
        await db.SaveChangesAsync();
        return db;
    }

    [Fact]
    public async Task SoloDocumentoRechazaFila_VacioONoNumerico()
    {
        var instId = InstitucionId.Nuevo();
        await using var db = await CrearContextoAsync(instId);
        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var servicio = new ServicioPersonas(db, contexto);

        var request = new CargarPersonasRequest([
            new PersonaCargaItem(Documento: "   ", Nombre: "PERSONA SIN DNI"),
            new PersonaCargaItem(Documento: "17ABC00001", Nombre: "PERSONA DNI NO NUMERICO"),
            new PersonaCargaItem(Documento: "123", Nombre: "PERSONA DNI CORTO"),
            new PersonaCargaItem(Documento: "1700000001", Nombre: "PEREZ GOMEZ JUAN CARLOS")
        ]);

        var resultado = await servicio.CargarPersonasAsync(request);

        Assert.Equal(4, resultado.TotalRecibidos);
        Assert.Equal(1, resultado.TotalCargados);
        Assert.Equal(3, resultado.TotalRechazados);
        Assert.Equal(3, resultado.Rechazos.Count);
        Assert.Single(resultado.DocumentosCargados);
        Assert.Equal("1700000001", resultado.DocumentosCargados[0]);

        // Verificar que los rechazos anonimizan el documento (solo últimos 4 dígitos o fila)
        foreach (var rechazo in resultado.Rechazos)
        {
            if (rechazo.DocumentoAnonimizado != null)
            {
                Assert.True(rechazo.DocumentoAnonimizado.Length <= 4);
            }
        }
    }

    [Fact]
    public async Task DniNueveDigitos_SeCompletaConCeroInicial_GeneraAdvertenciaYCarga()
    {
        var instId = InstitucionId.Nuevo();
        await using var db = await CrearContextoAsync(instId);
        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var servicio = new ServicioPersonas(db, contexto);

        var request = new CargarPersonasRequest([
            new PersonaCargaItem(Documento: "912345678", Nombre: "PEREZ GOMEZ CARLOS ALBERTO")
        ]);

        var resultado = await servicio.CargarPersonasAsync(request);

        Assert.Equal(1, resultado.TotalRecibidos);
        Assert.Equal(1, resultado.TotalCargados);
        Assert.Equal(0, resultado.TotalRechazados);
        Assert.Equal("0912345678", resultado.DocumentosCargados[0]);

        // Debe haber advertencia de autocompletado en DNI
        Assert.Contains(resultado.Advertencias, a => a.Columna == "DNI" && a.Motivo.Contains("cero inicial"));

        var persona = await db.Personas.FirstOrDefaultAsync(p => p.Documento == "0912345678");
        Assert.NotNull(persona);
        Assert.Equal("0912345678", persona.Documento);
    }

    [Fact]
    public async Task DocumentoRepetidoEnArchivo_ConservaPrimeroYRechazaSiguientes()
    {
        var instId = InstitucionId.Nuevo();
        await using var db = await CrearContextoAsync(instId);
        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var servicio = new ServicioPersonas(db, contexto);

        var request = new CargarPersonasRequest([
            new PersonaCargaItem(Documento: "1700000010", Nombre: "DOCENTE PRIMERA APARICION"),
            new PersonaCargaItem(Documento: "1700000010", Nombre: "DOCENTE SEGUNDA APARICION")
        ]);

        var resultado = await servicio.CargarPersonasAsync(request);

        Assert.Equal(2, resultado.TotalRecibidos);
        Assert.Equal(1, resultado.TotalCargados);
        Assert.Equal(1, resultado.TotalRechazados);
        Assert.Contains(resultado.Rechazos, r => r.Fila == 2 && r.Motivo.Contains("repetido dentro del mismo archivo"));

        var persona = await db.Personas.FirstOrDefaultAsync(p => p.Documento == "1700000010");
        Assert.NotNull(persona);
        Assert.Equal("DOCENTE PRIMERA APARICION", persona.Nombre);
    }

    [Fact]
    public async Task PersonaExistenteEnInstitucion_SeOmiteComoDuplicadaSinSobrescribir()
    {
        var instId = InstitucionId.Nuevo();
        await using var db = await CrearContextoAsync(instId);

        db.Personas.Add(new Persona(
            Guid.NewGuid(),
            instId,
            "1700000020",
            RolUsuario.Usuario,
            "DOCENTE YA EXISTENTE EN INSTITUCION"));
        await db.SaveChangesAsync();

        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var servicio = new ServicioPersonas(db, contexto);

        var request = new CargarPersonasRequest([
            new PersonaCargaItem(Documento: "1700000020", Nombre: "INTENTO DE SOBRESCRITURA")
        ]);

        var resultado = await servicio.CargarPersonasAsync(request);

        Assert.Equal(1, resultado.TotalRecibidos);
        Assert.Equal(0, resultado.TotalCargados);
        Assert.Equal(1, resultado.TotalDuplicadosOmitidos);
        Assert.Equal(0, resultado.TotalRechazados);

        var persona = await db.Personas.FirstOrDefaultAsync(p => p.Documento == "1700000020");
        Assert.NotNull(persona);
        Assert.Equal("DOCENTE YA EXISTENTE EN INSTITUCION", persona.Nombre);
    }

    [Fact]
    public async Task ColumnasVaciasOInvalidas_QuedanEnNuloConAdvertenciaYCreanFichaPersonal()
    {
        var instId = InstitucionId.Nuevo();
        await using var db = await CrearContextoAsync(instId);

        // Sembrar catálogos de prueba
        var tipoFunc = new TipoFuncionario(Guid.NewGuid(), instId, "DOC", "Docente Tiempo Completo", esDocente: true);
        db.TiposFuncionario.Add(tipoFunc);

        var ecPais = new ElementoCatalogo(601, TipoCatalogo.Pais, "EC", "Ecuador");
        db.ElementosCatalogo.Add(ecPais);
        await db.SaveChangesAsync();

        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        var servicio = new ServicioPersonas(db, contexto);

        var request = new CargarPersonasRequest([
            // Fila 1: Datos completos y válidos
            new PersonaCargaItem(
                Documento: "1700000050",
                Nombre: "DE LA TORRE GOMEZ ANA MARIA",
                CargoTrabajo: "Docente Tiempo Completo",
                Nacimiento: "15/08/1985",
                EstadoCivil: "Casado",
                Nacionalidad: "Ecuatoriana",
                Direccion: "Av. Principal 123",
                Sangre: "O+",
                Telefono2: "0991234567"),

            // Fila 2: Columnas vacías o inválidas (deben quedar en nulo con advertencias sin rechazar fila)
            new PersonaCargaItem(
                Documento: "1700000051",
                Nombre: "   ",
                CargoTrabajo: "Cargo Inexistente",
                Nacimiento: "31/02/2099", // Fecha futura e inválida
                EstadoCivil: "Estado Desconocido",
                Nacionalidad: "Pais Desconocido",
                Direccion: new string('A', 250), // Excede 200 caracteres
                Sangre: "Sangre Invalida",
                Telefono2: "123", // Teléfono no reconocido
                Edad: "40", // Ignorado
                Estudios: "Master", // Ignorado
                Ciudad: "Quito", // Ignorado
                FecIngreso: "2020-01-01", // Ignorado
                TipoCuentaBanco: "Ahorros", // Ignorado hasta T-10
                Banco: "Pichincha", // Ignorado hasta T-10
                NumCuentaBanco: "123456789") // Ignorado hasta T-10
        ]);

        var resultado = await servicio.CargarPersonasAsync(request);

        Assert.Equal(2, resultado.TotalRecibidos);
        Assert.Equal(2, resultado.TotalCargados);
        Assert.Equal(0, resultado.TotalRechazados);

        // Verificaciones Fila 1 (completa)
        var p1 = await db.Personas.FirstOrDefaultAsync(p => p.Documento == "1700000050");
        Assert.NotNull(p1);
        Assert.Equal("DE LA TORRE GOMEZ ANA MARIA", p1.Nombre);
        Assert.Equal(tipoFunc.Id, p1.TipoFuncionarioId);

        var f1 = await db.FichasPersonales.FirstOrDefaultAsync(f => f.PersonaId == p1.Id);
        Assert.NotNull(f1);
        Assert.Equal("DE LA TORRE", f1.PrimerApellido);
        Assert.Equal("GOMEZ", f1.SegundoApellido);
        Assert.Equal("ANA", f1.PrimerNombre);
        Assert.Equal("MARIA", f1.SegundoNombre);
        Assert.Equal(new DateOnly(1985, 8, 15), f1.FechaNacimiento);
        Assert.Equal(12, f1.EstadoCivilId);
        Assert.Equal(27, f1.TipoSangreId);
        Assert.Equal(ecPais.Id, f1.PaisNacionalidadId);
        Assert.Equal("Av. Principal 123", f1.CallePrincipal);
        Assert.Equal("0991234567", f1.Celular);

        // Verificaciones Fila 2 (con nulos y advertencias)
        var p2 = await db.Personas.FirstOrDefaultAsync(p => p.Documento == "1700000051");
        Assert.NotNull(p2);
        Assert.Null(p2.Nombre);
        Assert.Null(p2.TipoFuncionarioId);

        var f2 = await db.FichasPersonales.FirstOrDefaultAsync(f => f.PersonaId == p2.Id);
        Assert.NotNull(f2);
        Assert.Null(f2.PrimerNombre);
        Assert.Null(f2.PrimerApellido);
        Assert.Null(f2.FechaNacimiento);
        Assert.Null(f2.EstadoCivilId);
        Assert.Null(f2.TipoSangreId);
        Assert.Null(f2.PaisNacionalidadId);
        Assert.Null(f2.CallePrincipal);
        Assert.Null(f2.Celular);

        // Comprobar que se generaron las advertencias correspondientes por fila y columna
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Nombre");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Cargo de Trabajo");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Nacimiento");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Estado Civil");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Nacionalidad");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Dirección");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Sangre");
        Assert.Contains(resultado.Advertencias, a => a.Fila == 2 && a.Columna == "Teléfono 2");
    }
}
