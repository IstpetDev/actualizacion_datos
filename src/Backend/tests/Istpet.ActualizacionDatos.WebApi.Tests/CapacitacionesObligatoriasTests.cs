namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class CapacitacionesObligatoriasTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public CapacitacionesObligatoriasTests()
    {
        _conexion.Open();
        _fabrica = new FabricaPruebas().WithWebHostBuilder(builder =>
            builder.ConfigureServices(servicios =>
            {
                servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
                using var proveedor = servicios.BuildServiceProvider();
                using var alcance = proveedor.CreateScope();
                alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            }));
        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private async Task<Guid> AutenticarAsync(RolUsuario rol = RolUsuario.Admin, InstitucionId? institucion = null)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución ficticia de prueba"));
        }
        var persona = new Persona(
            Guid.NewGuid(),
            institucion,
            (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture),
            rol,
            "Persona ficticia",
            accesoHabilitado: true);
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, "ClaveFicticiaCapacitaciones92"), debeCambiarContrasena: false);
        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveFicticiaCapacitaciones92"));
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return persona.Id;
    }

    [Fact]
    public async Task Admin_puede_crear_listar_editar_y_desactivar_capacitacion_obligatoria()
    {
        await AutenticarAsync(RolUsuario.Admin);

        // 1. Crear
        var requestCrear = new GuardarCapacitacionObligatoriaRequest(
            Nombre: "Seguridad y Salud en el Trabajo",
            InstitucionOrganizadora: "ISTPET",
            HorasEsperadas: 20,
            FechaRealizacion: new DateOnly(2026, 3, 15),
            TipoFuncionarioId: null,
            Activo: true,
            Orden: 1);

        var respuestaCrear = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", requestCrear);
        Assert.Equal(HttpStatusCode.Created, respuestaCrear.StatusCode);
        var creado = await respuestaCrear.Content.ReadFromJsonAsync<CapacitacionObligatoriaDto>();
        Assert.NotNull(creado);
        Assert.Equal("Seguridad y Salud en el Trabajo", creado.Nombre);
        Assert.True(creado.Activo);

        // 2. Listar
        var respuestaListar = await _cliente.GetAsync("/api/configuracion/capacitaciones-obligatorias");
        Assert.Equal(HttpStatusCode.OK, respuestaListar.StatusCode);
        var lista = await respuestaListar.Content.ReadFromJsonAsync<List<CapacitacionObligatoriaDto>>();
        Assert.NotNull(lista);
        Assert.Contains(lista, c => c.Id == creado.Id && c.Nombre == "Seguridad y Salud en el Trabajo");

        // 3. Editar
        var requestEditar = requestCrear with { HorasEsperadas = 30 };
        var respuestaEditar = await _cliente.PutAsJsonAsync($"/api/configuracion/capacitaciones-obligatorias/{creado.Id}", requestEditar);
        Assert.Equal(HttpStatusCode.OK, respuestaEditar.StatusCode);
        var editado = await respuestaEditar.Content.ReadFromJsonAsync<CapacitacionObligatoriaDto>();
        Assert.NotNull(editado);
        Assert.Equal(30, editado.HorasEsperadas);

        // 4. Desactivar (Eliminar lógico)
        var respuestaEliminar = await _cliente.DeleteAsync($"/api/configuracion/capacitaciones-obligatorias/{creado.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respuestaEliminar.StatusCode);

        // 5. Verificar que quedó inactiva
        var listaTrasEliminar = await _cliente.GetFromJsonAsync<List<CapacitacionObligatoriaDto>>("/api/configuracion/capacitaciones-obligatorias");
        Assert.NotNull(listaTrasEliminar);
        var itemInactivo = listaTrasEliminar.Single(c => c.Id == creado.Id);
        Assert.False(itemInactivo.Activo);
    }

    [Fact]
    public async Task Crear_con_nombre_repetido_en_misma_institucion_responde_409()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var request = new GuardarCapacitacionObligatoriaRequest(Nombre: "Didáctica Universitaria");
        var res1 = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", request);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);

        var res2 = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", request);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);
    }

    [Fact]
    public async Task Crear_con_tipo_funcionario_de_otra_institucion_responde_404()
    {
        await AutenticarAsync(RolUsuario.Admin);

        // Guid aleatorio o de otra institución
        var request = new GuardarCapacitacionObligatoriaRequest(
            Nombre: "Curso Específico",
            TipoFuncionarioId: Guid.NewGuid());

        var res = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", request);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Usuario_sin_permiso_recibe_403()
    {
        await AutenticarAsync(RolUsuario.Usuario);

        var request = new GuardarCapacitacionObligatoriaRequest(Nombre: "Intento no autorizado");
        var res = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", request);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Aislamiento_entre_instituciones()
    {
        var instA = InstitucionId.Nuevo();
        var instB = InstitucionId.Nuevo();

        // Admin A crea una obligatoria
        await AutenticarAsync(RolUsuario.Admin, instA);
        var resA = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", new GuardarCapacitacionObligatoriaRequest(Nombre: "Exclusivo Inst A"));
        Assert.Equal(HttpStatusCode.Created, resA.StatusCode);
        var creadoA = await resA.Content.ReadFromJsonAsync<CapacitacionObligatoriaDto>();
        Assert.NotNull(creadoA);

        // Admin B lista y no debe ver la de A
        await AutenticarAsync(RolUsuario.Admin, instB);
        var listaB = await _cliente.GetFromJsonAsync<List<CapacitacionObligatoriaDto>>("/api/configuracion/capacitaciones-obligatorias");
        Assert.NotNull(listaB);
        Assert.DoesNotContain(listaB, c => c.Id == creadoA.Id);

        // Admin B no puede editar la de A (404)
        var resEditB = await _cliente.PutAsJsonAsync($"/api/configuracion/capacitaciones-obligatorias/{creadoA.Id}", new GuardarCapacitacionObligatoriaRequest(Nombre: "Modificado por B"));
        Assert.Equal(HttpStatusCode.NotFound, resEditB.StatusCode);
    }

    [Fact]
    public async Task Crear_capacitacion_obligatoria_no_modifica_estado_de_actualizaciones_existentes()
    {
        var adminId = await AutenticarAsync(RolUsuario.Admin);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var personaAprobada = new Persona(Guid.NewGuid(), _institucion, "1700000091", RolUsuario.Usuario, "Persona Aprobada", accesoHabilitado: true, estadoActualizacion: EstadoActualizacion.Aprobado);
        var personaEnviada = new Persona(Guid.NewGuid(), _institucion, "1700000092", RolUsuario.Usuario, "Persona Enviada", accesoHabilitado: true, estadoActualizacion: EstadoActualizacion.Enviado);
        db.Personas.AddRange(personaAprobada, personaEnviada);
        await db.SaveChangesAsync();

        // Admin crea una nueva capacitación obligatoria (RF-CAP-012)
        var resCrear = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias", new GuardarCapacitacionObligatoriaRequest(Nombre: "Curso Nuevo Posterior"));
        Assert.Equal(HttpStatusCode.Created, resCrear.StatusCode);

        // Verificar que los estados de las personas no cambiaron
        using var alcance2 = _fabrica.Services.CreateScope();
        var db2 = alcance2.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var p1 = await db2.Personas.IgnoreQueryFilters().SingleOrDefaultAsync(p => p.Id == personaAprobada.Id);
        var p2 = await db2.Personas.IgnoreQueryFilters().SingleOrDefaultAsync(p => p.Id == personaEnviada.Id);

        Assert.NotNull(p1);
        Assert.NotNull(p2);
        Assert.Equal(EstadoActualizacion.Aprobado, p1.EstadoActualizacion);
        Assert.Equal(EstadoActualizacion.Enviado, p2.EstadoActualizacion);
    }

    [Fact]
    public async Task Cumplimiento_reporta_totales_y_detecta_exencion_por_nuevo_ingreso()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var fechaCurso = new DateOnly(2026, 3, 15);

        // Crear obligatoria con fecha de realización
        var resCrear = await _cliente.PostAsJsonAsync("/api/configuracion/capacitaciones-obligatorias",
            new GuardarCapacitacionObligatoriaRequest(Nombre: "Inducción Marzo 2026", FechaRealizacion: fechaCurso));
        Assert.Equal(HttpStatusCode.Created, resCrear.StatusCode);

        // Agregar una persona con ingreso posterior (exenta) y una con ingreso anterior (pendiente)
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var personaExenta = new Persona(Guid.NewGuid(), _institucion, "1700000081", RolUsuario.Usuario, "Persona Nueva", accesoHabilitado: true);
        personaExenta.AsignarFechaIngreso(new DateOnly(2026, 5, 1)); // Posterior

        var personaAntigua = new Persona(Guid.NewGuid(), _institucion, "1700000082", RolUsuario.Usuario, "Persona Antigua", accesoHabilitado: true);
        personaAntigua.AsignarFechaIngreso(new DateOnly(2025, 11, 1)); // Anterior

        db.Personas.AddRange(personaExenta, personaAntigua);
        await db.SaveChangesAsync();

        // Consultar cumplimiento
        var resCumplimiento = await _cliente.GetAsync("/api/configuracion/capacitaciones-obligatorias/cumplimiento");
        Assert.Equal(HttpStatusCode.OK, resCumplimiento.StatusCode);
        var cumplimiento = await resCumplimiento.Content.ReadFromJsonAsync<List<CumplimientoCapacitacionObligatoriaDto>>();

        Assert.NotNull(cumplimiento);
        var item = cumplimiento.Single(c => c.Nombre == "Inducción Marzo 2026");
        Assert.True(item.TotalAplica >= 2);
        Assert.True(item.TotalExentaOJustificada >= 1);
        Assert.Contains(item.PersonasPendientes, p => p.Documento == "1700000082");
        Assert.DoesNotContain(item.PersonasPendientes, p => p.Documento == "1700000081");
    }

    private async Task AsegurarCampanaActivaAsync(InstitucionId? institucion = null)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución ficticia de prueba"));
            await db.SaveChangesAsync();
        }
        if (!await db.Campanas.AnyAsync(c => c.InstitucionId == institucion && c.Activa))
        {
            db.Campanas.Add(new Campana(
                Guid.NewGuid(),
                institucion,
                "Campaña 2026",
                DateTime.UtcNow.AddDays(-1),
                DateTime.UtcNow.AddDays(30),
                activa: true));
            await db.SaveChangesAsync();
        }
    }

    private async Task<Guid> CrearArchivoAdjuntoAsync(Guid personaId, InstitucionId? institucion = null)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var archivo = new ArchivoAdjunto(
            Guid.NewGuid(),
            institucion,
            personaId,
            "certificado.pdf",
            "application/pdf",
            1024,
            "hash123",
            "ruta/ficticia/cert.pdf",
            "certificado-capacitacion");
        db.ArchivosAdjuntos.Add(archivo);
        await db.SaveChangesAsync();
        return archivo.Id;
    }

    [Fact]
    public async Task Usuario_ve_solo_capacitaciones_que_le_aplican_y_con_su_estado()
    {
        await AsegurarCampanaActivaAsync();

        // 1. Crear tipos de funcionario
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var tipoDocente = new TipoFuncionario(Guid.NewGuid(), _institucion, "DOC", "Docente", esDocente: true);
        var tipoAdmin = new TipoFuncionario(Guid.NewGuid(), _institucion, "ADM", "Administrativo", esDocente: false);
        db.TiposFuncionario.AddRange(tipoDocente, tipoAdmin);

        // 2. Crear capacitaciones obligatorias
        var obGeneral = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso General Todo Personal");
        var obDocente = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso Exclusivo Docente", tipoFuncionarioId: tipoDocente.Id);
        var obAdmin = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso Exclusivo Admin", tipoFuncionarioId: tipoAdmin.Id);
        db.CapacitacionesObligatorias.AddRange(obGeneral, obDocente, obAdmin);
        await db.SaveChangesAsync();

        // 3. Autenticar como Docente
        var usuarioDocenteId = await AutenticarAsync(RolUsuario.Usuario);
        using (var alcanceDoc = _fabrica.Services.CreateScope())
        {
            var dbDoc = alcanceDoc.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var pDoc = await dbDoc.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == usuarioDocenteId);
            pDoc.AsignarTipoFuncionario(tipoDocente.Id);
            await dbDoc.SaveChangesAsync();
        }

        var resDoc = await _cliente.GetAsync("/api/mis-datos/capacitaciones-obligatorias");
        Assert.Equal(HttpStatusCode.OK, resDoc.StatusCode);
        var listaDoc = await resDoc.Content.ReadFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>();
        Assert.NotNull(listaDoc);
        Assert.Contains(listaDoc, c => c.Id == obGeneral.Id && c.Estado == "pendiente");
        Assert.Contains(listaDoc, c => c.Id == obDocente.Id && c.Estado == "pendiente");
        Assert.DoesNotContain(listaDoc, c => c.Id == obAdmin.Id);

        // 4. Autenticar como Persona sin tipo
        await AutenticarAsync(RolUsuario.Usuario);
        var resSinTipo = await _cliente.GetAsync("/api/mis-datos/capacitaciones-obligatorias");
        Assert.Equal(HttpStatusCode.OK, resSinTipo.StatusCode);
        var listaSinTipo = await resSinTipo.Content.ReadFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>();
        Assert.NotNull(listaSinTipo);
        Assert.Contains(listaSinTipo, c => c.Id == obGeneral.Id);
        Assert.DoesNotContain(listaSinTipo, c => c.Id == obDocente.Id);
        Assert.DoesNotContain(listaSinTipo, c => c.Id == obAdmin.Id);
    }

    [Fact]
    public async Task Usuario_puede_subir_capacitacion_vinculada_y_reemplazarla()
    {
        await AsegurarCampanaActivaAsync();
        var usuarioId = await AutenticarAsync(RolUsuario.Usuario);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var ob = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso Primeros Auxilios");
        db.CapacitacionesObligatorias.Add(ob);
        await db.SaveChangesAsync();

        var archivo1 = await CrearArchivoAdjuntoAsync(usuarioId);
        var archivo2 = await CrearArchivoAdjuntoAsync(usuarioId);

        // 1. Subir primera capacitación vinculada
        var req1 = new GuardarCapacitacionRequest(
            NombreEvento: "Taller Primeros Auxilios 2026",
            InstitucionOrganizadora: "Cruz Roja",
            NumeroHoras: 20,
            FechaInicio: new DateOnly(2026, 2, 1),
            FechaFin: new DateOnly(2026, 2, 5),
            ArchivoId: archivo1,
            CapacitacionObligatoriaId: ob.Id);

        var resPost1 = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/capacitaciones", req1);
        Assert.Equal(HttpStatusCode.Created, resPost1.StatusCode);
        var cap1 = await resPost1.Content.ReadFromJsonAsync<CapacitacionDto>();
        Assert.NotNull(cap1);
        Assert.Equal(ob.Id, cap1.CapacitacionObligatoriaId);

        // Verificar que figura como cargada
        var resEstado1 = await _cliente.GetFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>("/api/mis-datos/capacitaciones-obligatorias");
        Assert.NotNull(resEstado1);
        var obEstado1 = resEstado1.Single(c => c.Id == ob.Id);
        Assert.Equal("cargada", obEstado1.Estado);
        Assert.Equal(cap1.Id, obEstado1.CapacitacionId);

        // 2. Subir segunda capacitación vinculada a la misma obligatoria (reemplaza vínculo)
        var req2 = new GuardarCapacitacionRequest(
            NombreEvento: "Taller Avanzado Primeros Auxilios",
            InstitucionOrganizadora: "Cruz Roja",
            NumeroHoras: 40,
            FechaInicio: new DateOnly(2026, 3, 1),
            FechaFin: new DateOnly(2026, 3, 10),
            ArchivoId: archivo2,
            CapacitacionObligatoriaId: ob.Id);

        var resPost2 = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/capacitaciones", req2);
        Assert.Equal(HttpStatusCode.Created, resPost2.StatusCode);
        var cap2 = await resPost2.Content.ReadFromJsonAsync<CapacitacionDto>();
        Assert.NotNull(cap2);
        Assert.Equal(ob.Id, cap2.CapacitacionObligatoriaId);

        // Verificar que en base de datos cap1 quedó sin vínculo
        using var alcanceVerif = _fabrica.Services.CreateScope();
        var dbVerif = alcanceVerif.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var cap1Bd = await dbVerif.Capacitaciones.IgnoreQueryFilters().SingleAsync(c => c.Id == cap1.Id);
        var cap2Bd = await dbVerif.Capacitaciones.IgnoreQueryFilters().SingleAsync(c => c.Id == cap2.Id);
        Assert.Null(cap1Bd.CapacitacionObligatoriaId);
        Assert.Equal(ob.Id, cap2Bd.CapacitacionObligatoriaId);
    }

    [Fact]
    public async Task Vincular_obligatoria_de_otra_institucion_o_invalida_responde_404()
    {
        await AsegurarCampanaActivaAsync();
        var usuarioId = await AutenticarAsync(RolUsuario.Usuario);

        var instOtra = InstitucionId.Nuevo();
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        db.Instituciones.Add(new Institucion(instOtra, "Otra Inst"));
        var obOtra = new CapacitacionObligatoria(Guid.NewGuid(), instOtra, "Curso Otra Inst");
        db.CapacitacionesObligatorias.Add(obOtra);
        await db.SaveChangesAsync();

        var archivo = await CrearArchivoAdjuntoAsync(usuarioId);

        var req = new GuardarCapacitacionRequest(
            NombreEvento: "Curso X",
            InstitucionOrganizadora: "Org",
            ArchivoId: archivo,
            CapacitacionObligatoriaId: obOtra.Id);

        var res = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/capacitaciones", req);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Usuario_puede_vincular_capacitacion_propia_existente()
    {
        await AsegurarCampanaActivaAsync();
        var usuarioId = await AutenticarAsync(RolUsuario.Usuario);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var ob = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso Ética Pública");
        db.CapacitacionesObligatorias.Add(ob);
        await db.SaveChangesAsync();

        var archivo = await CrearArchivoAdjuntoAsync(usuarioId);

        // 1. Subir capacitación personal sin obligatoria
        var req = new GuardarCapacitacionRequest(
            NombreEvento: "Seminario de Ética",
            InstitucionOrganizadora: "Contraloría",
            NumeroHoras: 20,
            FechaInicio: new DateOnly(2026, 1, 10),
            ArchivoId: archivo);

        var resPost = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/capacitaciones", req);
        Assert.Equal(HttpStatusCode.Created, resPost.StatusCode);
        var creada = await resPost.Content.ReadFromJsonAsync<CapacitacionDto>();
        Assert.NotNull(creada);
        Assert.Null(creada.CapacitacionObligatoriaId);

        // 2. Vincular vía endpoint
        var resVincular = await _cliente.PostAsJsonAsync($"/api/mis-datos/capacitaciones-obligatorias/{ob.Id}/vincular",
            new VincularCapacitacionObligatoriaRequest(creada.Id));
        Assert.Equal(HttpStatusCode.OK, resVincular.StatusCode);

        // 3. Verificar estado
        var resEstado = await _cliente.GetFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>("/api/mis-datos/capacitaciones-obligatorias");
        Assert.NotNull(resEstado);
        var estadoOb = resEstado.Single(c => c.Id == ob.Id);
        Assert.Equal("cargada", estadoOb.Estado);
        Assert.Equal(creada.Id, estadoOb.CapacitacionId);
    }

    [Fact]
    public async Task No_puede_vincular_con_actualizacion_enviada()
    {
        await AsegurarCampanaActivaAsync();

        // Crear persona en estado Enviado
        var doc = (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture);
        var personaEnviada = new Persona(
            Guid.NewGuid(),
            _institucion,
            doc,
            RolUsuario.Usuario,
            "Persona Enviada",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Enviado);
        personaEnviada.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(personaEnviada, "ClaveFicticiaCapacitaciones92"), debeCambiarContrasena: false);

        var ob = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Curso Seguridad Laboral");

        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Personas.Add(personaEnviada);
            db.CapacitacionesObligatorias.Add(ob);
            await db.SaveChangesAsync();
        }

        var resLogin = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(doc, "ClaveFicticiaCapacitaciones92"));
        Assert.Equal(HttpStatusCode.OK, resLogin.StatusCode);

        var res = await _cliente.PostAsJsonAsync($"/api/mis-datos/capacitaciones-obligatorias/{ob.Id}/vincular",
            new VincularCapacitacionObligatoriaRequest(Guid.NewGuid()));
        Assert.True(res.StatusCode == HttpStatusCode.BadRequest || res.StatusCode == HttpStatusCode.Forbidden || res.StatusCode == HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Persona_puede_justificar_por_nuevo_ingreso_manualmente()
    {
        await AsegurarCampanaActivaAsync();
        await AutenticarAsync(RolUsuario.Usuario);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var ob = new CapacitacionObligatoria(Guid.NewGuid(), _institucion, "Inducción Año 2025");
        db.CapacitacionesObligatorias.Add(ob);
        await db.SaveChangesAsync();

        // Justificar
        var resJust = await _cliente.PostAsJsonAsync($"/api/mis-datos/capacitaciones-obligatorias/{ob.Id}/justificar-nuevo-ingreso",
            new JustificarNuevoIngresoRequest("Ingresé a la institución recientemente y no alcancé a cursarla"));
        Assert.Equal(HttpStatusCode.OK, resJust.StatusCode);

        // Consultar estado
        var resLista = await _cliente.GetFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>("/api/mis-datos/capacitaciones-obligatorias");
        Assert.NotNull(resLista);
        var estadoOb = resLista.Single(c => c.Id == ob.Id);
        Assert.Equal("justificada-nuevo-ingreso", estadoOb.Estado);
        Assert.Equal("Ingresé a la institución recientemente y no alcancé a cursarla", estadoOb.JustificacionNuevoIngreso);
    }
}
