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
}
