namespace Istpet.ActualizacionDatos.Application.Documentos;

public sealed record ResultadoValidacionPlantilla(bool EsValida, IReadOnlyList<string> Errores);

public static class ValidadorConfiguracionPlantilla
{
    public static ResultadoValidacionPlantilla Validar(ConfiguracionPlantilla configuracion)
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(configuracion.DisenoBase))
        {
            errores.Add("El diseño base es obligatorio.");
        }
        else if (!CatalogoCamposDocumento.EsDisenoSoportado(configuracion.DisenoBase))
        {
            errores.Add($"El diseño base '{configuracion.DisenoBase}' no es reconocido en el sistema.");
        }

        if (configuracion.Secciones is null || configuracion.Secciones.Count == 0)
        {
            errores.Add("La configuración debe contener al menos una sección.");
            return new ResultadoValidacionPlantilla(false, errores);
        }

        var seccionesVistas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var seccion in configuracion.Secciones)
        {
            if (string.IsNullOrWhiteSpace(seccion.CodigoSeccion))
            {
                errores.Add("Se encontró una sección sin código especificado.");
                continue;
            }

            if (!CatalogoCamposDocumento.EsSeccionValida(seccion.CodigoSeccion))
            {
                errores.Add($"La sección '{seccion.CodigoSeccion}' no existe en el catálogo cerrado de la plantilla.");
                continue;
            }

            if (!seccionesVistas.Add(seccion.CodigoSeccion))
            {
                errores.Add($"La sección '{seccion.CodigoSeccion}' se encuentra repetida en la configuración.");
            }

            if (seccion.Campos is null) continue;

            var camposVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var campo in seccion.Campos)
            {
                if (string.IsNullOrWhiteSpace(campo)) continue;

                if (!CatalogoCamposDocumento.EsCampoValido(seccion.CodigoSeccion, campo))
                {
                    errores.Add($"El campo '{campo}' no es válido para la sección '{seccion.CodigoSeccion}'.");
                    continue;
                }

                if (!camposVistos.Add(campo))
                {
                    errores.Add($"El campo '{campo}' se encuentra repetido dentro de la sección '{seccion.CodigoSeccion}'.");
                }
            }
        }

        return new ResultadoValidacionPlantilla(errores.Count == 0, errores);
    }
}
