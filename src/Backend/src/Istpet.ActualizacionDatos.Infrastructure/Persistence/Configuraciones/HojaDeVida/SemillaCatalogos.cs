namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, consecuencias: la migración solo siembra listas cortas y estables.
// Universidades, campos UNESCO, división política y niveles o grados académicos se
// importan aparte desde fuentes oficiales, con su codigo_externo.
// Los identificadores sembrados van de 1 a 999; las importaciones usan valores mayores.
internal static class SemillaCatalogos
{
    public static IEnumerable<ElementoCatalogo> Elementos() =>
    [
        new(1, TipoCatalogo.Sexo, "HOMBRE", "Hombre", orden: 1),
        new(2, TipoCatalogo.Sexo, "MUJER", "Mujer", orden: 2),

        new(11, TipoCatalogo.EstadoCivil, "SOLTERO", "Soltero(a)", orden: 1),
        new(12, TipoCatalogo.EstadoCivil, "CASADO", "Casado(a)", orden: 2),
        new(13, TipoCatalogo.EstadoCivil, "DIVORCIADO", "Divorciado(a)", orden: 3),
        new(14, TipoCatalogo.EstadoCivil, "VIUDO", "Viudo(a)", orden: 4),
        new(15, TipoCatalogo.EstadoCivil, "UNION_HECHO", "Unión de hecho", orden: 5),

        new(21, TipoCatalogo.TipoSangre, "A_POS", "A+", orden: 1),
        new(22, TipoCatalogo.TipoSangre, "A_NEG", "A-", orden: 2),
        new(23, TipoCatalogo.TipoSangre, "B_POS", "B+", orden: 3),
        new(24, TipoCatalogo.TipoSangre, "B_NEG", "B-", orden: 4),
        new(25, TipoCatalogo.TipoSangre, "AB_POS", "AB+", orden: 5),
        new(26, TipoCatalogo.TipoSangre, "AB_NEG", "AB-", orden: 6),
        new(27, TipoCatalogo.TipoSangre, "O_POS", "O+", orden: 7),
        new(28, TipoCatalogo.TipoSangre, "O_NEG", "O-", orden: 8),

        // Mismos valores y códigos externos que `tipo_curso` del sistema de origen.
        new(41, TipoCatalogo.TipoCapacitacion, "PEDAGOGICA", "Capacitación pedagógica / docente", codigoExterno: "1", orden: 1),
        new(42, TipoCatalogo.TipoCapacitacion, "TECNICA", "Capacitación técnica / profesional", codigoExterno: "2", orden: 2),
        new(43, TipoCatalogo.TipoCapacitacion, "DISCIPLINAR", "Actualización disciplinar", codigoExterno: "3", orden: 3),
        new(44, TipoCatalogo.TipoCapacitacion, "SEMINARIO_TALLER", "Seminario / taller", codigoExterno: "4", orden: 4),
        new(45, TipoCatalogo.TipoCapacitacion, "CONGRESO_SIMPOSIO", "Congreso / simposio", codigoExterno: "5", orden: 5),
        new(46, TipoCatalogo.TipoCapacitacion, "CERTIFICACION", "Certificación", codigoExterno: "6", orden: 6),
        new(47, TipoCatalogo.TipoCapacitacion, "OTRO", "Otro", codigoExterno: "7", orden: 7),
    ];
}
