namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class PersonaTests
{
    [Fact]
    public void Crear_persona_con_datos_validos_inicializa_en_borrador()
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
}
