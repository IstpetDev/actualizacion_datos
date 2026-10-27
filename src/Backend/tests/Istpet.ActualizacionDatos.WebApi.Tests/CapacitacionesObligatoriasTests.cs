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
}
