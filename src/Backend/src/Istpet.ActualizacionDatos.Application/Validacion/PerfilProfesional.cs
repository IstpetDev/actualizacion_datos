namespace Istpet.ActualizacionDatos.Application.Validacion;

// ADR-0025: describe únicamente registros declarados; no afirma competencias ni experiencia verificada.
public static class PerfilProfesional
{
    public static string Generar(int titulos, int estudiosEnCurso, int capacitaciones, int experiencias) =>
        $"Trayectoria declarada en la hoja de vida: {titulos} título(s), {estudiosEnCurso} estudio(s) en curso, {capacitaciones} capacitación(es) y {experiencias} experiencia(s) laboral(es). Este resumen se genera automáticamente a partir de los registros disponibles.";
}
