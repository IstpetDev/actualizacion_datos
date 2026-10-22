namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class PersonaTests
{
    [Fact]
    public void Crear_persona_con_datos_validos_inicializa_en_borrador_y_debe_cambiar_clave()
    {
        var institucionId = InstitucionId.Nuevo();
        var persona = new Persona(
            Guid.NewGuid(),
            institucionId,
            "1700000001",
            RolUsuario.Usuario,
            "Persona de Prueba",
            "prueba@ejemplo.test");

        Assert.Equal(institucionId, persona.InstitucionId);
        Assert.Equal("1700000001", persona.Documento);
        Assert.Equal("Persona de Prueba", persona.Nombre);
        Assert.Equal("prueba@ejemplo.test", persona.Correo);
        Assert.Equal(RolUsuario.Usuario, persona.Rol);
        Assert.False(persona.AccesoHabilitado);
        Assert.Equal(EstadoActualizacion.Borrador, persona.EstadoActualizacion);
        Assert.True(persona.DebeCambiarContrasena);
        Assert.False(persona.CorreoVerificado);
        Assert.False(persona.TratamientoDatosAceptado);
        Assert.Null(persona.FechaAceptacionTratamientoDatosUtc);
    }

    [Fact]
    public void Habilitar_y_deshabilitar_acceso_modifica_estado()
    {
        var persona = new Persona(
            Guid.NewGuid(),
            InstitucionId.Nuevo(),
            "1700000002");

        Assert.False(persona.AccesoHabilitado);

        persona.HabilitarAcceso();
        Assert.True(persona.AccesoHabilitado);

        persona.DeshabilitarAcceso();
        Assert.False(persona.AccesoHabilitado);
    }

    [Fact]
    public void Actualizar_borrador_guarda_json_sin_cambiar_estado()
    {
        var persona = new Persona(
            Guid.NewGuid(),
            InstitucionId.Nuevo(),
            "1700000003");

        persona.ActualizarBorrador("{\"telefono\":\"0999999999\"}");

        Assert.Equal("{\"telefono\":\"0999999999\"}", persona.DatosPersonalesJson);
        Assert.Equal(EstadoActualizacion.Borrador, persona.EstadoActualizacion);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Crear_persona_con_documento_vacio_lanza_excepcion(string docInvalido)
    {
        Assert.Throws<ArgumentException>(() =>
            new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), docInvalido));
    }

    [Fact]
    public void Cambiar_contrasena_actualiza_hash_y_desactiva_debe_cambiar_clave()
    {
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000004");
        Assert.True(persona.DebeCambiarContrasena);

        persona.CambiarContrasena("hash_nueva_clave_valida");

        Assert.Equal("hash_nueva_clave_valida", persona.PasswordHash);
        Assert.False(persona.DebeCambiarContrasena);
        Assert.Equal(0, persona.IntentosFallidos);
    }

    [Fact]
    public void Registrar_5_intentos_fallidos_bloquea_cuenta_por_15_minutos()
    {
        var ahoraUtc = new DateTime(2026, 10, 21, 12, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000005");

        for (var i = 1; i <= 4; i++)
        {
            persona.RegistrarIntentoFallido(ahoraUtc);
            Assert.False(persona.EstaBloqueado(ahoraUtc));
            Assert.Equal(i, persona.IntentosFallidos);
        }

        persona.RegistrarIntentoFallido(ahoraUtc);
        Assert.True(persona.EstaBloqueado(ahoraUtc));
        Assert.Equal(ahoraUtc.AddMinutes(15), persona.BloqueadoHastaUtc);

        // Pasados 16 minutos, el bloqueo se desactiva
        Assert.False(persona.EstaBloqueado(ahoraUtc.AddMinutes(16)));
    }

    [Fact]
    public void Validar_codigo_verificacion_correo_exitoso_y_con_intentos_excedidos()
    {
        var ahoraUtc = new DateTime(2026, 10, 21, 12, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000006", correo: "usuario@ejemplo.test");

        persona.GenerarCodigoVerificacionCorreo("hash_codigo_123456", ahoraUtc.AddMinutes(15));
        Assert.False(persona.CorreoVerificado);

        // Código incorrecto
        var resultadoIncorrecto = persona.ValidarCodigoVerificacion("hash_codigo_erroneo", ahoraUtc);
        Assert.False(resultadoIncorrecto);
        Assert.False(persona.CorreoVerificado);

        // Código correcto
        var resultadoCorrecto = persona.ValidarCodigoVerificacion("hash_codigo_123456", ahoraUtc);
        Assert.True(resultadoCorrecto);
        Assert.True(persona.CorreoVerificado);
    }

    // --- Nuevas pruebas de flujo de revisión y tratamiento de datos (RF-FLU-001 a RF-FLU-005, RF-DAT-001) ---

    [Fact]
    public void Aceptar_tratamiento_datos_registra_aceptacion_con_fecha()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000007", correo: "usuario7@ejemplo.test");

        Assert.False(persona.TratamientoDatosAceptado);
        persona.AceptarTratamientoDatos(ahora);

        Assert.True(persona.TratamientoDatosAceptado);
        Assert.Equal(ahora, persona.FechaAceptacionTratamientoDatosUtc);
    }

    [Fact]
    public void Enviar_a_revision_sin_aceptar_tratamiento_datos_falla()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000008", correo: "usuario8@ejemplo.test");

        var ex = Assert.Throws<ReglaNegocioException>(() => persona.EnviarARevision(ahora));
        Assert.Contains("tratamiento de datos", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Enviar_a_revision_sin_correo_registrado_falla()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000009", correo: null);
        persona.AceptarTratamientoDatos(ahora);

        var ex = Assert.Throws<ReglaNegocioException>(() => persona.EnviarARevision(ahora));
        Assert.Contains("correo electrónico", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Enviar_a_revision_con_tratamiento_aceptado_y_correo_pasa_a_enviado_y_bloquea_edicion()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000010", correo: "usuario10@ejemplo.test");
        persona.AceptarTratamientoDatos(ahora);

        persona.EnviarARevision(ahora);

        Assert.Equal(EstadoActualizacion.Enviado, persona.EstadoActualizacion);

        // RF-FLU-001: Bloquea edición
        var exEdicion = Assert.Throws<ReglaNegocioException>(() =>
            persona.ActualizarBorrador("{\"nuevo\":\"dato\"}"));
        Assert.Contains("revisión", exEdicion.Message, StringComparison.OrdinalIgnoreCase);

        var exArchivo = Assert.Throws<ReglaNegocioException>(() =>
            persona.RegistrarArchivoSubido("documento.pdf"));
        Assert.Contains("revisión", exArchivo.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Supervisor_aprueba_actualizacion_en_estado_enviado_pasa_a_aprobado()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000011", correo: "usuario11@ejemplo.test");
        persona.AceptarTratamientoDatos(ahora);
        persona.EnviarARevision(ahora);

        persona.AprobarActualizacion(ahora);

        Assert.Equal(EstadoActualizacion.Aprobado, persona.EstadoActualizacion);

        // Bloqueado para edición
        Assert.Throws<ReglaNegocioException>(() => persona.ActualizarBorrador("{\"nuevo\":\"dato\"}"));
    }

    [Fact]
    public void Supervisor_devuelve_actualizacion_pasa_a_devuelto_y_permite_corregir_y_reenviar()
    {
        var ahora = new DateTime(2026, 10, 22, 10, 0, 0, DateTimeKind.Utc);
        var persona = new Persona(Guid.NewGuid(), InstitucionId.Nuevo(), "1700000012", correo: "usuario12@ejemplo.test");
        persona.AceptarTratamientoDatos(ahora);
        persona.EnviarARevision(ahora);

        persona.DevolverActualizacion(ahora);

        Assert.Equal(EstadoActualizacion.Devuelto, persona.EstadoActualizacion);

        // RF-FLU-004: Ahora el usuario puede corregir datos y archivos
        persona.ActualizarBorrador("{\"corregido\":true}");
        Assert.Equal("{\"corregido\":true}", persona.DatosPersonalesJson);

        persona.RegistrarArchivoSubido("nuevo_doc.pdf");
        Assert.Equal("nuevo_doc.pdf", persona.ArchivosSubidosJson);

        // Y volver a enviar a revisión
        persona.EnviarARevision(ahora.AddHours(1));
        Assert.Equal(EstadoActualizacion.Enviado, persona.EstadoActualizacion);
    }
}
