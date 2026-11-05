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

public sealed class SubindicesSeccionTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public SubindicesSeccionTests()
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
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, "ClaveFicticiaSubindices92"), debeCambiarContrasena: false);
        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveFicticiaSubindices92"));
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return persona.Id;
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
                "Campaña Ficticia 2026",
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
            "respaldo-ficticio.pdf",
            "application/pdf",
            1024,
            "hashficticio123",
            "ruta/ficticia/respaldo.pdf",
            "respaldo-seccion");
        db.ArchivosAdjuntos.Add(archivo);
        await db.SaveChangesAsync();
        return archivo.Id;
    }

    [Fact]
    public async Task Admin_puede_crear_listar_editar_y_desactivar_subindice_libre()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var crear = new GuardarSubindiceSeccionRequest(
            Seccion: "experiencia",
            Nombre: "Títulos de 3er Nivel",
            Descripcion: "Cargar certificado o respaldo de tercer nivel",
            TipoFuncionarioId: null,
            EsObligatorio: true,
            Orden: 1,
            Activo: true);

        var resCrear = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", crear);
        Assert.Equal(HttpStatusCode.Created, resCrear.StatusCode);
        var creado = await resCrear.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(creado);
        Assert.Equal("experiencia", creado.Seccion);
        Assert.Equal("Títulos de 3er Nivel", creado.Nombre);
        Assert.True(creado.EsObligatorio);
        Assert.True(creado.Activo);

        var lista = await _cliente.GetFromJsonAsync<List<SubindiceSeccionDto>>("/api/configuracion/subindices");
        Assert.NotNull(lista);
        Assert.Contains(lista, s => s.Id == creado.Id && s.Nombre == "Títulos de 3er Nivel");

        var editar = crear with { Nombre = "Título SENESCYT", EsObligatorio = false, Orden = 2 };
        var resEditar = await _cliente.PutAsJsonAsync($"/api/configuracion/subindices/{creado.Id}", editar);
        Assert.Equal(HttpStatusCode.OK, resEditar.StatusCode);
        var editado = await resEditar.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(editado);
        Assert.Equal("Título SENESCYT", editado.Nombre);
        Assert.False(editado.EsObligatorio);
        Assert.Equal(2, editado.Orden);

        var resEliminar = await _cliente.DeleteAsync($"/api/configuracion/subindices/{creado.Id}");
        Assert.Equal(HttpStatusCode.NoContent, resEliminar.StatusCode);

        var trasEliminar = await _cliente.GetFromJsonAsync<List<SubindiceSeccionDto>>("/api/configuracion/subindices");
        Assert.NotNull(trasEliminar);
        Assert.False(trasEliminar.Single(s => s.Id == creado.Id).Activo);
    }

    [Fact]
    public async Task Validaciones_de_duplicado_seccion_no_soportada_permisos_y_aislamiento()
    {
        var instA = InstitucionId.Nuevo();
        var instB = InstitucionId.Nuevo();

        await AutenticarAsync(RolUsuario.Admin, instA);

        var reqValido = new GuardarSubindiceSeccionRequest("formacion", "Títulos de 4to Nivel");
        var res1 = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", reqValido);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        var creadoA = await res1.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(creadoA);

        // Duplicado activo insensible a mayúsculas en misma sección y alcance -> 409
        var resDuplicado = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", reqValido with { Nombre = "  títulos de 4to nivel " });
        Assert.Equal(HttpStatusCode.Conflict, resDuplicado.StatusCode);

        // Sección no soportada (ficha) -> 400
        var resFicha = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", new GuardarSubindiceSeccionRequest("ficha", "No permitido"));
        Assert.Equal(HttpStatusCode.BadRequest, resFicha.StatusCode);

        // Tipo de funcionario inexistente -> 404
        var resTipo = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", reqValido with { Nombre = "Otro", TipoFuncionarioId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.NotFound, resTipo.StatusCode);

        // Aislamiento entre instituciones
        await AutenticarAsync(RolUsuario.Admin, instB);
        var listaB = await _cliente.GetFromJsonAsync<List<SubindiceSeccionDto>>("/api/configuracion/subindices");
        Assert.NotNull(listaB);
        Assert.DoesNotContain(listaB, s => s.Id == creadoA.Id);

        // Usuario sin rol Admin recibe 403
        await AutenticarAsync(RolUsuario.Usuario, instA);
        var resUsuario = await _cliente.PostAsJsonAsync("/api/configuracion/subindices", new GuardarSubindiceSeccionRequest("experiencia", "Intento"));
        Assert.Equal(HttpStatusCode.Forbidden, resUsuario.StatusCode);
    }

    [Fact]
    public async Task Usuario_clasifica_items_por_subindice_preserva_existentes_e_historial_inactivo()
    {
        await AsegurarCampanaActivaAsync();
        await AutenticarAsync(RolUsuario.Admin);

        var resSubExp = await _cliente.PostAsJsonAsync("/api/configuracion/subindices",
            new GuardarSubindiceSeccionRequest("experiencia", "Docencia Superior", "Certificados docentes", null, true, 1));
        var subExp = await resSubExp.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(subExp);

        var resSubForm = await _cliente.PostAsJsonAsync("/api/configuracion/subindices",
            new GuardarSubindiceSeccionRequest("formacion", "Registro SENESCYT", null, null, true, 1));
        var subForm = await resSubForm.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(subForm);

        var usuarioId = await AutenticarAsync(RolUsuario.Usuario);
        var archivo1 = await CrearArchivoAdjuntoAsync(usuarioId);
        var archivo2 = await CrearArchivoAdjuntoAsync(usuarioId);

        // 1. Estado inicial en hoja de vida: pendiente
        var hdvInicial = await _cliente.GetFromJsonAsync<HojaDeVidaDto>("/api/mis-datos/hoja-de-vida");
        Assert.NotNull(hdvInicial);
        Assert.NotNull(hdvInicial.SubindicesSeccion);
        Assert.Contains(hdvInicial.SubindicesSeccion, s => s.Id == subExp.Id && s.Estado == "pendiente");

        // 2. Registrar experiencia general sin subíndice (compatibilidad con datos previos)
        var resGeneral = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/experiencias",
            new GuardarExperienciaLaboralRequest(
                Empleador: "Empresa Ficticia General",
                Cargo: "Analista",
                FechaInicio: new DateOnly(2022, 1, 10),
                FechaFin: new DateOnly(2023, 1, 10),
                ArchivoId: archivo1,
                SubindiceSeccionId: null));
        Assert.Equal(HttpStatusCode.Created, resGeneral.StatusCode);
        var expGeneral = await resGeneral.Content.ReadFromJsonAsync<ExperienciaLaboralDto>();
        Assert.NotNull(expGeneral);
        Assert.Null(expGeneral.SubindiceSeccionId);

        // 3. Intentar asociar un subíndice de otra sección ("formacion" en "experiencias") -> 400
        var resSeccionIncorrecta = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/experiencias",
            new GuardarExperienciaLaboralRequest(
                Empleador: "Instituto Ficticio",
                Cargo: "Docente",
                FechaInicio: new DateOnly(2024, 1, 10),
                TrabajaActualmente: true,
                ArchivoId: archivo2,
                SubindiceSeccionId: subForm.Id));
        Assert.Equal(HttpStatusCode.BadRequest, resSeccionIncorrecta.StatusCode);

        // 4. Registrar experiencia asociada al subíndice correcto
        var resClasificada = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/experiencias",
            new GuardarExperienciaLaboralRequest(
                Empleador: "Instituto Tecnológico Ficticio",
                Cargo: "Docente Titular",
                FechaInicio: new DateOnly(2024, 2, 1),
                TrabajaActualmente: true,
                ArchivoId: archivo2,
                SubindiceSeccionId: subExp.Id));
        Assert.Equal(HttpStatusCode.Created, resClasificada.StatusCode);
        var expClasificada = await resClasificada.Content.ReadFromJsonAsync<ExperienciaLaboralDto>();
        Assert.NotNull(expClasificada);
        Assert.Equal(subExp.Id, expClasificada.SubindiceSeccionId);

        // 5. Hoja de vida refleja estado "cargado"
        var hdvCargada = await _cliente.GetFromJsonAsync<HojaDeVidaDto>("/api/mis-datos/hoja-de-vida");
        Assert.NotNull(hdvCargada?.SubindicesSeccion);
        Assert.Contains(hdvCargada.SubindicesSeccion, s => s.Id == subExp.Id && s.Estado == "cargado");

        // 6. Si el Admin desactiva el subíndice, el ítem existente conserva su SubindiceSeccionId y la etiqueta histórica sigue viajando
        await AutenticarAsync(RolUsuario.Admin);
        var resDesactivar = await _cliente.DeleteAsync($"/api/configuracion/subindices/{subExp.Id}");
        Assert.Equal(HttpStatusCode.NoContent, resDesactivar.StatusCode);

        await AutenticarAsync(RolUsuario.Supervisor);
        var hdvRevision = await _cliente.GetFromJsonAsync<HojaDeVidaDto>($"/api/revision/{hdvCargada.Documento}/hoja-de-vida");
        Assert.NotNull(hdvRevision);
        Assert.Contains(hdvRevision.Experiencias, e => e.Id == expClasificada.Id && e.SubindiceSeccionId == subExp.Id);
        Assert.NotNull(hdvRevision.SubindicesSeccion);
        Assert.Contains(hdvRevision.SubindicesSeccion, s => s.Id == subExp.Id && !s.Activo && s.Nombre == "Docencia Superior");
    }

    [Fact]
    public async Task Validador_completitud_y_conteo_secciones_respetan_obligatoriedad_alcance_y_seccion_cerrada()
    {
        await AsegurarCampanaActivaAsync();
        await AutenticarAsync(RolUsuario.Admin);

        var resTipoDocente = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario",
            new GuardarTipoFuncionarioRequest("DOC", "Docente", EsDocente: true));
        var tipoDocente = await resTipoDocente.Content.ReadFromJsonAsync<TipoFuncionarioDto>();
        Assert.NotNull(tipoDocente);

        var resTipoAdmin = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario",
            new GuardarTipoFuncionarioRequest("ADM", "Administrativo", EsDocente: false));
        var tipoAdmin = await resTipoAdmin.Content.ReadFromJsonAsync<TipoFuncionarioDto>();
        Assert.NotNull(tipoAdmin);

        // Subíndice obligatorio exclusivo para Docente en experiencia
        var resSubDocente = await _cliente.PostAsJsonAsync("/api/configuracion/subindices",
            new GuardarSubindiceSeccionRequest("experiencia", "Títulos 3er y 4to Nivel", null, tipoDocente.Id, EsObligatorio: true, Orden: 1));
        var subDocente = await resSubDocente.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(subDocente);

        // Subíndice opcional para todos en referencias
        var resSubOpcional = await _cliente.PostAsJsonAsync("/api/configuracion/subindices",
            new GuardarSubindiceSeccionRequest("referencias", "Referencia Académica", null, null, EsObligatorio: false, Orden: 1));
        var subOpcional = await resSubOpcional.Content.ReadFromJsonAsync<SubindiceSeccionDto>();
        Assert.NotNull(subOpcional);

        // Crear usuario Administrativo y usuario Docente
        var idAdmin = await AutenticarAsync(RolUsuario.Usuario);
        var idDocente = await AutenticarAsync(RolUsuario.Usuario);

        await AutenticarAsync(RolUsuario.Admin);
        await _cliente.PutAsJsonAsync($"/api/personas/{idAdmin}/tipo-funcionario", new AsignarTipoFuncionarioRequest(tipoAdmin.Id));
        await _cliente.PutAsJsonAsync($"/api/personas/{idDocente}/tipo-funcionario", new AsignarTipoFuncionarioRequest(tipoDocente.Id));

        // El conteo de secciones para experiencia refleja que el docente aún no cumple el subíndice obligatorio
        var seccionesAntes = await _cliente.GetFromJsonAsync<List<SeccionConfiguracionDto>>("/api/configuracion/secciones");
        Assert.NotNull(seccionesAntes);
        var expAntes = seccionesAntes.Single(s => s.Codigo == "experiencia");
        Assert.True(expAntes.PersonasIncompletas >= 1);
        Assert.True(expAntes.TotalPersonas > expAntes.PersonasCompletas);

        // Al usuario Administrativo NO le bloquea el subíndice exclusivo de Docente ni el opcional
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var docAdmin = (await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == idAdmin)).Documento;
            await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(docAdmin, "ClaveFicticiaSubindices92"));
        }

        var faltantesAdmin = await _cliente.GetFromJsonAsync<ResultadoValidacionEnvioDto>("/api/mis-datos/hoja-de-vida/faltantes");
        Assert.NotNull(faltantesAdmin);
        Assert.DoesNotContain(faltantesAdmin.Faltantes, f => f.Codigo == $"experiencia.subindice.{subDocente.Id}");
        Assert.DoesNotContain(faltantesAdmin.Faltantes, f => f.Codigo == $"referencias.subindice.{subOpcional.Id}");

        // Al usuario Docente SÍ le exige el subíndice obligatorio cuando experiencia está abierta
        string docDocente;
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            docDocente = (await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == idDocente)).Documento;
        }

        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(docDocente, "ClaveFicticiaSubindices92"));
        var faltantesDocente1 = await _cliente.GetFromJsonAsync<ResultadoValidacionEnvioDto>("/api/mis-datos/hoja-de-vida/faltantes");
        Assert.NotNull(faltantesDocente1);
        Assert.Contains(faltantesDocente1.Faltantes, f => f.Codigo == $"experiencia.subindice.{subDocente.Id}" && f.Seccion == "experiencia");

        // Si el Admin cierra la sección "experiencia", ya NO bloquea el envío
        await AutenticarAsync(RolUsuario.Admin);
        var resCerrar = await _cliente.PutAsJsonAsync("/api/configuracion/secciones/experiencia", new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.OK, resCerrar.StatusCode);

        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(docDocente, "ClaveFicticiaSubindices92"));
        var faltantesCerrada = await _cliente.GetFromJsonAsync<ResultadoValidacionEnvioDto>("/api/mis-datos/hoja-de-vida/faltantes");
        Assert.NotNull(faltantesCerrada);
        Assert.DoesNotContain(faltantesCerrada.Faltantes, f => f.Codigo == $"experiencia.subindice.{subDocente.Id}");

        // Reabrir sección y cargar ítem con respaldo -> cumple faltante
        await AutenticarAsync(RolUsuario.Admin);
        await _cliente.PutAsJsonAsync("/api/configuracion/secciones/experiencia", new CambiarEstadoSeccionRequest(true));

        var archivoDocente = await CrearArchivoAdjuntoAsync(idDocente);
        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(docDocente, "ClaveFicticiaSubindices92"));
        var resExp = await _cliente.PostAsJsonAsync("/api/mis-datos/hoja-de-vida/experiencias",
            new GuardarExperienciaLaboralRequest(
                Empleador: "Universidad Ficticia",
                Cargo: "Docente",
                FechaInicio: new DateOnly(2023, 5, 1),
                TrabajaActualmente: true,
                ArchivoId: archivoDocente,
                SubindiceSeccionId: subDocente.Id));
        Assert.Equal(HttpStatusCode.Created, resExp.StatusCode);

        var faltantesCumplido = await _cliente.GetFromJsonAsync<ResultadoValidacionEnvioDto>("/api/mis-datos/hoja-de-vida/faltantes");
        Assert.NotNull(faltantesCumplido);
        Assert.DoesNotContain(faltantesCumplido.Faltantes, f => f.Codigo == $"experiencia.subindice.{subDocente.Id}");
    }
}
