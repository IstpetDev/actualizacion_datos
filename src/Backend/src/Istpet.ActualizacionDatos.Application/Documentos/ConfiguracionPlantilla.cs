namespace Istpet.ActualizacionDatos.Application.Documentos;

/// <summary>
/// Configuración de una sección dentro de una plantilla (secciones visibles, campos activos y comportamiento si vacía).
/// </summary>
public sealed record SeccionPlantillaConfig(
    string CodigoSeccion,
    IReadOnlyList<string> Campos,
    bool MostrarSiVacia = false);

/// <summary>
/// Configuración declarativa e inmutable de la plantilla global de hoja de vida (ADR-0032).
/// Se serializa en formato JSON en las versiones publicadas.
/// </summary>
public sealed record ConfiguracionPlantilla(
    string DisenoBase,
    IReadOnlyList<SeccionPlantillaConfig> Secciones)
{
    public static ConfiguracionPlantilla Predeterminada() => new(
        CatalogoCamposDocumento.DisenoClasico,
        new List<SeccionPlantillaConfig>
        {
            new(CatalogoCamposDocumento.Secciones.Portada, new[]
            {
                CatalogoCamposDocumento.CamposPortada.NombreCompleto,
                CatalogoCamposDocumento.CamposPortada.TipoPersonal
            }),
            new(CatalogoCamposDocumento.Secciones.DatosPersonales, new[]
            {
                CatalogoCamposDocumento.CamposDatosPersonales.Foto,
                CatalogoCamposDocumento.CamposDatosPersonales.DocumentoIdentidad,
                CatalogoCamposDocumento.CamposDatosPersonales.LugarFechaNacimiento,
                CatalogoCamposDocumento.CamposDatosPersonales.EstadoCivil,
                CatalogoCamposDocumento.CamposDatosPersonales.CiudadDireccion,
                CatalogoCamposDocumento.CamposDatosPersonales.TelefonoEmail,
                CatalogoCamposDocumento.CamposDatosPersonales.RegistroSenescyt
            }),
            new(CatalogoCamposDocumento.Secciones.Perfil, new[]
            {
                CatalogoCamposDocumento.CamposPerfil.TextoPerfil
            }),
            new(CatalogoCamposDocumento.Secciones.Compromiso, new[]
            {
                CatalogoCamposDocumento.CamposCompromiso.TextoCompromiso,
                CatalogoCamposDocumento.CamposCompromiso.BloqueFirma
            }),
            new(CatalogoCamposDocumento.Secciones.Formacion, new[]
            {
                CatalogoCamposDocumento.CamposFormacion.ListaTitulos
            }),
            new(CatalogoCamposDocumento.Secciones.Experiencia, new[]
            {
                CatalogoCamposDocumento.CamposExperiencia.ListaExperiencias
            }),
            new(CatalogoCamposDocumento.Secciones.Capacitaciones, new[]
            {
                CatalogoCamposDocumento.CamposCapacitaciones.ListaCapacitaciones
            }),
            new(CatalogoCamposDocumento.Secciones.Referencias, new[]
            {
                CatalogoCamposDocumento.CamposReferencias.ListaReferencias
            }),
            new(CatalogoCamposDocumento.Secciones.Anexos, new[]
            {
                CatalogoCamposDocumento.CamposAnexos.PortadaAnexos
            })
        });
}
