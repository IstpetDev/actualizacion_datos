namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

internal static class GeneradorCvHtml
{
    internal sealed record Expediente(FichaPersonal? Ficha, List<TituloAcademico> Titulos, List<TituloEnCurso> EnCurso,
        List<Capacitacion> Capacitaciones, List<ExperienciaLaboral> Experiencias, List<ReferenciaPersonal> Referencias,
        List<DocumentoPersonal> Documentos, CuentaBancaria? Cuenta, Dictionary<int, string> Catalogos)
    {
        public string Perfil => PerfilProfesional.Generar(Titulos.Count, EnCurso.Count, Capacitaciones.Count, Experiencias.Count);
    }

    internal static string Generar(Expediente expediente)
    {
        var html = new StringBuilder("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>Hoja de vida</title><style>body{font:16px sans-serif;max-width:900px;margin:2rem auto;padding:1rem}dt{font-weight:bold}dd{margin-bottom:.5rem;white-space:pre-wrap}article{border-bottom:1px solid #ccc}</style><body><h1>Hoja de vida</h1>");
        void Texto(string etiqueta, object? valor)
        {
            if (valor is null || valor is string cadena && string.IsNullOrWhiteSpace(cadena)) return;
            var texto = valor is DateOnly fecha ? fecha.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : Convert.ToString(valor, CultureInfo.InvariantCulture) ?? "";
            html.Append("<dt>").Append(HtmlEncoder.Default.Encode(etiqueta)).Append("</dt><dd>").Append(HtmlEncoder.Default.Encode(texto)).Append("</dd>");
        }
        string? Catalogo(int? id) => id.HasValue ? expediente.Catalogos.GetValueOrDefault(id.Value) : null;
        html.Append("<h2>Perfil profesional generado</h2><p>").Append(HtmlEncoder.Default.Encode(expediente.Perfil)).Append("</p><h2>Ficha personal</h2><dl>");
        var ficha = expediente.Ficha;
        if (ficha is not null)
        {
            Texto("Primer nombre", ficha.PrimerNombre); Texto("Segundo nombre", ficha.SegundoNombre);
            Texto("Primer apellido", ficha.PrimerApellido); Texto("Segundo apellido", ficha.SegundoApellido);
            Texto("Nacimiento", ficha.FechaNacimiento); Texto("Correo institucional", ficha.CorreoInstitucional);
            Texto("Celular", ficha.Celular); Texto("Teléfono convencional", ficha.TelefonoConvencional);
            Texto("Calle principal", ficha.CallePrincipal); Texto("Calle secundaria", ficha.CalleSecundaria);
            Texto("Número de casa", ficha.NumeroCasa); Texto("Referencia de domicilio", ficha.ReferenciaDomicilio); Texto("Código postal", ficha.CodigoPostal);
            Texto("Sexo", Catalogo(ficha.SexoId)); Texto("Estado civil", Catalogo(ficha.EstadoCivilId)); Texto("Tipo de sangre", Catalogo(ficha.TipoSangreId));
            Texto("Etnia", Catalogo(ficha.EtniaId)); Texto("Nacionalidad indígena", Catalogo(ficha.NacionalidadIndigenaId));
            Texto("Nacionalidad", Catalogo(ficha.PaisNacionalidadId)); Texto("País de nacimiento", Catalogo(ficha.PaisNacimientoId));
            Texto("Parroquia de nacimiento", Catalogo(ficha.ParroquiaNacimientoId)); Texto("Parroquia de residencia", Catalogo(ficha.ParroquiaResidenciaId));
            Texto("Discapacidad", Catalogo(ficha.DiscapacidadId)); Texto("Porcentaje de discapacidad", ficha.PorcentajeDiscapacidad); Texto("Carné", ficha.NumeroCarnetDiscapacidad);
        }
        html.Append("</dl>");
        void Seccion<T>(string titulo, IEnumerable<T> items, Action<T> escribir)
        {
            html.Append("<h2>").Append(titulo).Append("</h2>");
            foreach (var item in items) { html.Append("<article><dl>"); escribir(item); html.Append("</dl></article>"); }
        }
        Seccion("Títulos", expediente.Titulos, t => { Texto("Título", t.NombreTitulo); Texto("Grado académico", Catalogo(t.GradoAcademicoId)); Texto("Institución", Catalogo(t.UniversidadId)); Texto("Campo UNESCO", Catalogo(t.CampoDetalladoUnescoId)); Texto("Otra institución", t.NombreInstitucionOtra); Texto("Obtención", t.FechaObtencion); Texto("Registro", t.NumeroRegistroSenescyt); });
        Seccion("Estudios en curso", expediente.EnCurso, t => { Texto("Programa", t.NombrePrograma); Texto("Grado académico", Catalogo(t.GradoAcademicoId)); Texto("Institución", Catalogo(t.UniversidadId)); Texto("Campo UNESCO", Catalogo(t.CampoDetalladoUnescoId)); Texto("Beca", t.TieneBeca ? "Sí" : "No"); Texto("Tipo de beca", Catalogo(t.TipoBecaId)); Texto("Financiamiento", Catalogo(t.FinanciamientoBecaId)); Texto("Porcentaje de beca", t.PorcentajeBeca); Texto("Monto de beca", t.MontoBeca); Texto("Otra institución", t.NombreInstitucionOtra); Texto("Inicio", t.FechaInicio); Texto("Fin estimado", t.FechaFinEstimada); });
        Seccion("Capacitaciones", expediente.Capacitaciones, c => { Texto("Evento", c.NombreEvento); Texto("Tipo", Catalogo(c.TipoCapacitacionId)); Texto("Participación", c.TipoParticipacion); Texto("Lugar", c.Lugar); Texto("Financiada por institución", c.FinanciadaPorInstitucion ? "Sí" : "No"); Texto("Organizador", c.InstitucionOrganizadora); Texto("Horas", c.NumeroHoras); Texto("Inicio", c.FechaInicio); Texto("Fin", c.FechaFin); });
        Seccion("Experiencias", expediente.Experiencias, e => { Texto("Empleador", e.Empleador); Texto("Cargo", e.Cargo); Texto("Ciudad", e.Ciudad); Texto("País", Catalogo(e.PaisId)); Texto("Inicio", e.FechaInicio); Texto("Fin", e.FechaFin); Texto("Trabajo actual", e.TrabajaActualmente ? "Sí" : "No"); Texto("Funciones", e.Funciones); });
        Seccion("Referencias", expediente.Referencias, r => { Texto("Nombres", r.NombresApellidos); Texto("Título", r.Titulo); Texto("Tipo", r.Tipo); Texto("Teléfono", r.Telefono); Texto("Cargo", r.CargoActual); Texto("Empresa", r.Empresa); });
        Seccion("Documentos", expediente.Documentos, d => { Texto("Número", d.NumeroDocumento); Texto("Emisor", d.EntidadEmisora); Texto("Vencimiento", d.FechaVencimiento); });
        html.Append("<h2>Cuenta bancaria</h2><dl>");
        // La exportación nunca descifra el número ni incluye propuestas de nómina.
        if (expediente.Cuenta is { } cuenta) { Texto("Cuenta", cuenta.NumeroEnmascarado); Texto("Banco", Catalogo(cuenta.BancoId) ?? cuenta.NombreBancoOtro); Texto("Tipo", Catalogo(cuenta.TipoCuentaId)); }
        html.Append("</dl></body></html>");
        return html.ToString();
    }
}
