namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class CampanasPersonasIntegracionTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();

        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var contextoMigrador = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true));

        await contextoMigrador.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _contenedor.DisposeAsync();
    }

    private DbContextOptions<AplicacionDbContext> CrearOpciones()
    {
        return new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;
    }

    [Fact]
    public async Task RF_MUL_001_Superadmin_crea_institucion_con_admins_disponible_sin_personas()
    {
        var opciones = CrearOpciones();
        var contextoInstitucion = new ContextoInstitucion(null, esSuperadmin: true, actorActual: "superadmin");
        await using var db = new AplicacionDbContext(opciones, contextoInstitucion);
        var servicio = new ServicioInstituciones(db, contextoInstitucion);

        var request = new CrearInstitucionRequest(
            "Instituto Tecnológico Nacional",
            [
                new AdminInicialRequest("1700000010", "Admin Primero", "admin1@ejemplo.test"),
                new AdminInicialRequest("1700000020", "Admin Segundo", "admin2@ejemplo.test")
            ]);

        var institucionDto = await servicio.CrearInstitucionAsync(request);

        Assert.NotNull(institucionDto);
        Assert.Equal("Instituto Tecnológico Nacional", institucionDto.Nombre);
        Assert.True(institucionDto.Activa);

        var instId = new InstitucionId(institucionDto.Id);

        // La institución queda con sus admins asignados
        var admins = await db.Personas
            .IgnoreQueryFilters()
            .Where(p => p.InstitucionId == instId && p.Rol == RolUsuario.Admin)
            .ToListAsync();

        Assert.Equal(2, admins.Count);
        Assert.All(admins, a => Assert.True(a.AccesoHabilitado));

        // Y sin personas hasta que se carguen
        var personas = await db.Personas
            .IgnoreQueryFilters()
            .Where(p => p.InstitucionId == instId && p.Rol == RolUsuario.Usuario)
            .ToListAsync();

        Assert.Empty(personas);
    }

    [Fact]
    public async Task RF_MUL_002_Superadmin_habilita_personas_para_actualizar_datos()
    {
        var opciones = CrearOpciones();
        var contextoInstitucion = new ContextoInstitucion(null, esSuperadmin: true, actorActual: "superadmin");
        await using var db = new AplicacionDbContext(opciones, contextoInstitucion);
        var servicioInst = new ServicioInstituciones(db, contextoInstitucion);

        var instDto = await servicioInst.CrearInstitucionAsync(new CrearInstitucionRequest("Instituto Habilitaciones"));
        var instId = new InstitucionId(instDto.Id);

        // Carga de personas con acceso deshabilitado por defecto
        var persona1 = new Persona(Guid.NewGuid(), instId, "1700000031", RolUsuario.Usuario, "Persona Uno", accesoHabilitado: false);
        var persona2 = new Persona(Guid.NewGuid(), instId, "1700000032", RolUsuario.Usuario, "Persona Dos", accesoHabilitado: false);

        db.Personas.AddRange(persona1, persona2);
        await db.SaveChangesAsync();

        // Superadmin elige y habilita el acceso de las personas
        var habilitadas = await servicioInst.HabilitarPersonasAsync(
            instDto.Id,
            new HabilitarPersonasRequest(Documentos: ["1700000031"]));

        Assert.Single(habilitadas);
        Assert.Equal("1700000031", habilitadas[0].Documento);
        Assert.True(habilitadas[0].AccesoHabilitado);

        var p2EnBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == persona2.Id);
        Assert.False(p2EnBd.AccesoHabilitado);
    }

    [Fact]
    public async Task RF_MUL_004_Superadmin_opera_entre_instituciones_y_registra_auditoria()
    {
        var opciones = CrearOpciones();
        var contextoSuperadmin = new ContextoInstitucion(null, esSuperadmin: true, actorActual: "superadmin_dev");
        await using var db = new AplicacionDbContext(opciones, contextoSuperadmin);
        var servicio = new ServicioInstituciones(db, contextoSuperadmin);

        await servicio.CrearInstitucionAsync(new CrearInstitucionRequest("Institución Auditada 1"));
        await servicio.CrearInstitucionAsync(new CrearInstitucionRequest("Institución Auditada 2"));

        var lista = await servicio.ListarInstitucionesAsync();
        Assert.True(lista.Count >= 2);

        var auditorias = await db.Auditorias
            .Where(a => a.Actor == "superadmin_dev")
            .ToListAsync();

        Assert.Contains(auditorias, a => a.Accion == "CREAR_INSTITUCION");
        Assert.Contains(auditorias, a => a.Accion == "LISTAR_INSTITUCIONES");
    }

    [Fact]
    public async Task RF_ACC_001_y_PD_09_Admin_carga_personas_con_deduplicacion_y_coexistencia()
    {
        var opciones = CrearOpciones();

        var idInstA = InstitucionId.Nuevo();
        var idInstB = InstitucionId.Nuevo();

        await using (var dbInit = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true)))
        {
            dbInit.Instituciones.AddRange(
                new Institucion(idInstA, "Instituto Deduplicación A"),
                new Institucion(idInstB, "Instituto Deduplicación B"));
            await dbInit.SaveChangesAsync();
        }

        // 1. Carga por admin en Institución A con documentos duplicados en la lista (PD-09)
        var contextoA = new ContextoInstitucion(idInstA, esSuperadmin: false);
        await using (var dbA = new AplicacionDbContext(opciones, contextoA))
        {
            var servicioPersonasA = new ServicioPersonas(dbA, contextoA);

            var request = new CargarPersonasRequest(
            [
                new PersonaCargaItem("1700000040", "Docente A"),
                new PersonaCargaItem("1700000040", "Docente A Duplicado"), // Duplicado en la misma lista
                new PersonaCargaItem("1700000041", "Docente B")
            ]);

            var resultado = await servicioPersonasA.CargarPersonasAsync(request);

            Assert.Equal(3, resultado.TotalRecibidos);
            Assert.Equal(2, resultado.TotalCargados);
            Assert.Equal(1, resultado.TotalDuplicadosOmitidos);
            Assert.Equal(2, resultado.DocumentosCargados.Count);

            var personasEnA = await servicioPersonasA.ListarPersonasAsync();
            Assert.Equal(2, personasEnA.Count);
        }

        // 2. Coexistencia multi-institución (PD-09): El mismo documento se carga en Institución B
        var contextoB = new ContextoInstitucion(idInstB, esSuperadmin: false);
        await using (var dbB = new AplicacionDbContext(opciones, contextoB))
        {
            var servicioPersonasB = new ServicioPersonas(dbB, contextoB);

            var requestB = new CargarPersonasRequest(
            [
                new PersonaCargaItem("1700000040", "Docente Mismo Documento en B")
            ]);

            var resultadoB = await servicioPersonasB.CargarPersonasAsync(requestB);

            Assert.Equal(1, resultadoB.TotalCargados);

            var personasEnB = await servicioPersonasB.ListarPersonasAsync();
            Assert.Single(personasEnB);
            Assert.Equal("1700000040", personasEnB[0].Documento);
            Assert.Equal(idInstB.Valor, personasEnB[0].InstitucionId);
        }
    }

    [Fact]
    public async Task RF_CAM_001_y_PD_07_Admin_crea_campana_y_valida_fechas_y_no_solapamiento()
    {
        var opciones = CrearOpciones();
        var instId = InstitucionId.Nuevo();

        await using (var dbInit = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true)))
        {
            dbInit.Instituciones.Add(new Institucion(instId, "Instituto Campañas"));
            await dbInit.SaveChangesAsync();
        }

        var contextoAdmin = new ContextoInstitucion(instId, esSuperadmin: false);
        await using var db = new AplicacionDbContext(opciones, contextoAdmin);
        var servicio = new ServicioCampanas(db, contextoAdmin);

        // 1. RF-CAM-001: Rechazo de fecha fin anterior a inicio
        var errorFechas = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            servicio.CrearCampanaAsync(new CrearCampanaRequest(
                "Campaña Inválida",
                new DateTime(2026, 6, 10, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc))));

        Assert.Contains("anterior", errorFechas.Message, StringComparison.OrdinalIgnoreCase);

        // 2. Crear campaña válida
        var campana1 = await servicio.CrearCampanaAsync(new CrearCampanaRequest(
            "Campaña Junio",
            new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 6, 30, 23, 59, 59, DateTimeKind.Utc)));

        Assert.NotNull(campana1);

        // 3. PD-07: Rechazo por solapamiento con campaña activa
        var errorSolapamiento = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            servicio.CrearCampanaAsync(new CrearCampanaRequest(
                "Campaña Solapada",
                new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 7, 15, 0, 0, 0, DateTimeKind.Utc))));

        Assert.Contains("solapada", errorSolapamiento.Message, StringComparison.OrdinalIgnoreCase);

        // 4. Campaña sin solapamiento es aceptada
        var campanaJulio = await servicio.CrearCampanaAsync(new CrearCampanaRequest(
            "Campaña Julio",
            new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 7, 31, 23, 59, 59, DateTimeKind.Utc)));

        Assert.NotNull(campanaJulio);
    }

    [Fact]
    public async Task RF_CAM_002_y_RF_CAM_003_Regla_de_edicion_solo_dentro_de_campana_abierta()
    {
        var opciones = CrearOpciones();
        var instId = InstitucionId.Nuevo();

        var ahora = DateTime.UtcNow;
        var campanaAbierta = new Campana(
            Guid.NewGuid(),
            instId,
            "Campaña Actual",
            ahora.AddDays(-5),
            ahora.AddDays(5),
            activa: true);

        var persona = new Persona(
            Guid.NewGuid(),
            instId,
            "1700000050",
            RolUsuario.Usuario,
            "Usuario Con Campaña");

        await using (var dbInit = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true)))
        {
            dbInit.Instituciones.Add(new Institucion(instId, "Instituto Ventana"));
            dbInit.Campanas.Add(campanaAbierta);
            dbInit.Personas.Add(persona);
            await dbInit.SaveChangesAsync();
        }

        var contextoUsuario = new ContextoInstitucion(instId, esSuperadmin: false);
        await using var db = new AplicacionDbContext(opciones, contextoUsuario);
        var servicio = new ServicioCampanas(db, contextoUsuario);

        // 1. RF-CAM-002: Dentro de campaña abierta se permite editar y subir archivos
        var estado = await servicio.ObtenerEstadoEdicionAsync("1700000050");
        Assert.True(estado.PuedeEditar);

        await servicio.ActualizarDatosUsuarioAsync("1700000050", new ActualizarDatosRequest("{\"ciudad\":\"Quito\"}"));
        await servicio.SubirArchivoUsuarioAsync("1700000050", new SubirArchivoRequest("cedula.pdf", "application/pdf", 1024));

        var personaActualizada = await db.Personas.FirstAsync(p => p.Documento == "1700000050");
        Assert.Equal("{\"ciudad\":\"Quito\"}", personaActualizada.DatosPersonalesJson);
        Assert.Equal("cedula.pdf", personaActualizada.ArchivosSubidosJson);

        // 2. RF-CAM-003: Fuera de campaña abierta se rechaza edición y subida de archivos
        // Desactivar la campaña para simular estar fuera de ventana
        var cEnBd = await db.Campanas.FirstAsync(c => c.Id == campanaAbierta.Id);
        // Modificar fechas para que haya expirado
        typeof(Campana).GetProperty(nameof(Campana.FechaFinUtc))!.SetValue(cEnBd, ahora.AddDays(-1));
        await db.SaveChangesAsync();

        var estadoFuera = await servicio.ObtenerEstadoEdicionAsync("1700000050");
        Assert.False(estadoFuera.PuedeEditar);
        Assert.Contains("solo lectura", estadoFuera.Mensaje, StringComparison.OrdinalIgnoreCase);

        var errEdicion = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            servicio.ActualizarDatosUsuarioAsync("1700000050", new ActualizarDatosRequest("{\"ciudad\":\"Guayaquil\"}")));
        Assert.Contains("fuera del período", errEdicion.Message, StringComparison.OrdinalIgnoreCase);

        var errArchivo = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            servicio.SubirArchivoUsuarioAsync("1700000050", new SubirArchivoRequest("foto.png", "image/png", 2048)));
        Assert.Contains("fuera del período", errArchivo.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RF_CAM_004_Campana_vencida_conserva_borrador_sin_enviar_automaticamente()
    {
        var opciones = CrearOpciones();
        var instId = InstitucionId.Nuevo();

        var ahora = DateTime.UtcNow;
        var campanaPasada = new Campana(
            Guid.NewGuid(),
            instId,
            "Campaña Pasada",
            ahora.AddDays(-20),
            ahora.AddDays(-5),
            activa: true);

        var personaConBorrador = new Persona(
            Guid.NewGuid(),
            instId,
            "1700000060",
            RolUsuario.Usuario,
            "Persona Con Borrador",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Borrador);

        personaConBorrador.ActualizarBorrador("{\"datos\":\"borrador anterior\"}");

        await using (var dbInit = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true)))
        {
            dbInit.Instituciones.Add(new Institucion(instId, "Instituto Expirado"));
            dbInit.Campanas.Add(campanaPasada);
            dbInit.Personas.Add(personaConBorrador);
            await dbInit.SaveChangesAsync();
        }

        var contexto = new ContextoInstitucion(instId, esSuperadmin: false);
        await using var db = new AplicacionDbContext(opciones, contexto);

        var personaEnBd = await db.Personas.FirstAsync(p => p.Documento == "1700000060");

        // RF-CAM-004: Se conserva en estado borrador y no pasa automáticamente a enviado
        Assert.Equal(EstadoActualizacion.Borrador, personaEnBd.EstadoActualizacion);
        Assert.Equal("{\"datos\":\"borrador anterior\"}", personaEnBd.DatosPersonalesJson);
    }
}
