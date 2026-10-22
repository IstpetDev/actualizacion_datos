namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, decisión 5: catálogos nacionales o universales en una sola tabla.
// El tipo indica a qué campo de la hoja de vida sirve cada elemento; los que
// tienen jerarquía usan el padre indicado en el comentario.
public enum TipoCatalogo
{
    EstadoCivil = 1,
    TipoSangre = 2,
    Etnia = 3,
    NacionalidadIndigena = 4,
    Discapacidad = 5,
    Pais = 6,
    Provincia = 7, // padre: Pais
    Canton = 8, // padre: Provincia
    Parroquia = 9, // padre: Canton
    NivelAcademico = 10,
    GradoAcademico = 11, // padre: NivelAcademico
    CampoAmplioUnesco = 12,
    CampoEspecificoUnesco = 13, // padre: CampoAmplioUnesco
    CampoDetalladoUnesco = 14, // padre: CampoEspecificoUnesco
    Universidad = 15, // padre: Pais
    TipoBeca = 16,
    FinanciamientoBeca = 17,
    TipoCapacitacion = 18,
    Sexo = 19
}
