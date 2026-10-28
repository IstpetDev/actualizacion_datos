namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

public class HojaDeVidaTests
{
    private static readonly InstitucionId Institucion = InstitucionId.Nuevo();
    private static readonly Guid PersonaId = Guid.NewGuid();

    [Fact]
    public void Elemento_de_catalogo_jerarquico_sin_padre_lanza_excepcion()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new ElementoCatalogo(1000, TipoCatalogo.Provincia, "PROV_FICTICIA", "Provincia ficticia"));
    }

    [Fact]
    public void Elemento_de_catalogo_normaliza_codigo_y_admite_universidad_sin_pais()
    {
        var universidad = new ElementoCatalogo(1001, TipoCatalogo.Universidad, " univ_ficticia ", "Universidad Ficticia");

        Assert.Equal("UNIV_FICTICIA", universidad.Codigo);
        Assert.Null(universidad.PadreId);
        Assert.Equal(TipoCatalogo.Pais, ElementoCatalogo.TipoPadre(TipoCatalogo.Universidad));
    }

    [Fact]
    public void Ficha_personal_sin_discapacidad_no_admite_porcentaje()
    {
        var ficha = new FichaPersonal(Institucion, PersonaId);

        Assert.Throws<ReglaNegocioException>(() =>
            ficha.Actualizar(new DatosFichaPersonal(PorcentajeDiscapacidad: 40)));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Ficha_personal_rechaza_porcentaje_fuera_de_rango(int porcentaje)
    {
        var ficha = new FichaPersonal(Institucion, PersonaId);

        Assert.Throws<ReglaNegocioException>(() =>
            ficha.Actualizar(new DatosFichaPersonal(DiscapacidadId: 5, PorcentajeDiscapacidad: porcentaje)));
    }

    [Fact]
    public void Ficha_personal_limpia_textos_vacios()
    {
        var ficha = new FichaPersonal(Institucion, PersonaId);

        ficha.Actualizar(new DatosFichaPersonal(PrimerNombre: "  Nombre Ficticio ", SegundoNombre: "   ", Celular: "0990000000"));

        Assert.Equal("Nombre Ficticio", ficha.PrimerNombre);
        Assert.Null(ficha.SegundoNombre);
        Assert.Equal("0990000000", ficha.Celular);
    }

    [Fact]
    public void Titulo_sin_universidad_ni_institucion_lanza_excepcion()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new TituloAcademico(Guid.NewGuid(), Institucion, PersonaId, new DatosTituloAcademico("Título ficticio", 1)));
    }

    [Fact]
    public void Titulo_con_registro_anterior_a_obtencion_lanza_excepcion()
    {
        var datos = new DatosTituloAcademico(
            "Título ficticio",
            1,
            UniversidadId: 1001,
            FechaObtencion: new DateOnly(2020, 6, 1),
            FechaRegistroSenescyt: new DateOnly(2020, 5, 1));

        Assert.Throws<ReglaNegocioException>(() =>
            new TituloAcademico(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Titulo_con_universidad_descarta_nombre_de_otra_institucion()
    {
        var titulo = new TituloAcademico(
            Guid.NewGuid(),
            Institucion,
            PersonaId,
            new DatosTituloAcademico("Título ficticio", 1, UniversidadId: 1001, NombreInstitucionOtra: "Otra ficticia"));

        Assert.Equal(1001, titulo.UniversidadId);
        Assert.Null(titulo.NombreInstitucionOtra);
    }

    [Fact]
    public void Titulo_en_curso_sin_beca_no_guarda_datos_de_beca()
    {
        var titulo = new TituloEnCurso(
            Guid.NewGuid(),
            Institucion,
            PersonaId,
            new DatosTituloEnCurso("Programa ficticio", 1, NombreInstitucionOtra: "Universidad Ficticia", TieneBeca: false, PorcentajeBeca: 50, MontoBeca: 100m));

        Assert.False(titulo.TieneBeca);
        Assert.Null(titulo.PorcentajeBeca);
        Assert.Null(titulo.MontoBeca);
    }

    [Fact]
    public void Capacitacion_con_horas_cero_lanza_excepcion()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new Capacitacion(Guid.NewGuid(), Institucion, PersonaId, new DatosCapacitacion("Curso ficticio", "Organizador ficticio", NumeroHoras: 0)));
    }

    [Fact]
    public void Capacitacion_con_fin_anterior_a_inicio_lanza_excepcion()
    {
        var datos = new DatosCapacitacion(
            "Curso ficticio",
            "Organizador ficticio",
            FechaInicio: new DateOnly(2024, 3, 10),
            FechaFin: new DateOnly(2024, 3, 1));

        Assert.Throws<ReglaNegocioException>(() =>
            new Capacitacion(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Experiencia_actual_con_fecha_fin_lanza_excepcion()
    {
        var datos = new DatosExperienciaLaboral(
            "Empresa Ficticia",
            "Cargo ficticio",
            new DateOnly(2020, 1, 1),
            FechaFin: new DateOnly(2021, 1, 1),
            TrabajaActualmente: true);

        Assert.Throws<ReglaNegocioException>(() =>
            new ExperienciaLaboral(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Experiencia_terminada_sin_fecha_fin_lanza_excepcion()
    {
        var datos = new DatosExperienciaLaboral("Empresa Ficticia", "Cargo ficticio", new DateOnly(2020, 1, 1));

        Assert.Throws<ReglaNegocioException>(() =>
            new ExperienciaLaboral(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Experiencia_actual_valida_se_crea_y_asocia_archivo()
    {
        var experiencia = new ExperienciaLaboral(
            Guid.NewGuid(),
            Institucion,
            PersonaId,
            new DatosExperienciaLaboral("Empresa Ficticia", "Cargo ficticio", new DateOnly(2020, 1, 1), TrabajaActualmente: true));
        var archivoId = Guid.NewGuid();

        experiencia.AsociarArchivo(archivoId);

        Assert.True(experiencia.TrabajaActualmente);
        Assert.Equal(archivoId, experiencia.ArchivoId);
        Assert.Equal(Institucion, experiencia.InstitucionId);
    }

    [Theory]
    [InlineData("", "0990000000")]
    [InlineData("Persona Ficticia", "  ")]
    public void Referencia_sin_nombre_o_sin_telefono_lanza_excepcion(string nombre, string telefono)
    {
        var datos = new DatosReferencia(TipoReferencia.Personal, nombre, telefono);

        Assert.Throws<ReglaNegocioException>(() =>
            new ReferenciaPersonal(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Referencia_con_tipo_invalido_lanza_excepcion()
    {
        var datos = new DatosReferencia((TipoReferencia)99, "Persona Ficticia", "0990000000");

        Assert.Throws<ReglaNegocioException>(() =>
            new ReferenciaPersonal(Guid.NewGuid(), Institucion, PersonaId, datos));
    }

    [Fact]
    public void Referencia_limpia_opcionales_vacios_y_conserva_institucion()
    {
        var referencia = new ReferenciaPersonal(
            Guid.NewGuid(),
            Institucion,
            PersonaId,
            new DatosReferencia(TipoReferencia.Familiar, " Persona Ficticia ", "0990000000", Titulo: "  ", Empresa: "Empresa Ficticia"));

        Assert.Equal("Persona Ficticia", referencia.NombresApellidos);
        Assert.Null(referencia.Titulo);
        Assert.Null(referencia.CargoActual);
        Assert.Equal("Empresa Ficticia", referencia.Empresa);
        Assert.Equal(Institucion, referencia.InstitucionId);
    }

    [Fact]
    public void Ficha_personal_guarda_perfil_y_lo_limpia_si_esta_vacio()
    {
        var ficha = new FichaPersonal(Institucion, PersonaId);

        ficha.Actualizar(new DatosFichaPersonal(Perfil: " Perfil ficticio. "));
        Assert.Equal("Perfil ficticio.", ficha.Perfil);

        ficha.Actualizar(new DatosFichaPersonal(Perfil: "   "));
        Assert.Null(ficha.Perfil);
    }

    [Fact]
    public void Documento_con_vencimiento_anterior_a_emision_lanza_excepcion()
    {
        var datos = new DatosDocumentoPersonal(
            FechaEmision: new DateOnly(2024, 1, 1),
            FechaVencimiento: new DateOnly(2023, 1, 1));

        Assert.Throws<ReglaNegocioException>(() =>
            new DocumentoPersonal(Guid.NewGuid(), Institucion, PersonaId, Guid.NewGuid(), datos));
    }

    [Fact]
    public void Requisito_sin_tipo_de_funcionario_aplica_a_todos()
    {
        var instructor = Guid.NewGuid();
        var universal = new RequisitoDocumento(Guid.NewGuid(), Institucion, Guid.NewGuid());
        var soloInstructor = new RequisitoDocumento(Guid.NewGuid(), Institucion, Guid.NewGuid(), instructor);

        Assert.True(universal.AplicaA(null));
        Assert.True(universal.AplicaA(instructor));
        Assert.True(soloInstructor.AplicaA(instructor));
        Assert.False(soloInstructor.AplicaA(Guid.NewGuid()));
        Assert.False(soloInstructor.AplicaA(null));
    }

    [Theory]
    [InlineData(EstadoActualizacion.Borrador, true)]
    [InlineData(EstadoActualizacion.Devuelto, true)]
    [InlineData(EstadoActualizacion.Enviado, false)]
    [InlineData(EstadoActualizacion.Aprobado, false)]
    public void Persona_permite_editar_hoja_de_vida_solo_en_borrador_o_devuelto(EstadoActualizacion estado, bool permitido)
    {
        var persona = new Persona(Guid.NewGuid(), Institucion, "0000000000", estadoActualizacion: estado);

        Assert.Equal(permitido, persona.PuedeEditarHojaDeVida);
        if (permitido)
        {
            persona.AsegurarEdicionPermitida();
        }
        else
        {
            Assert.Throws<ReglaNegocioException>(persona.AsegurarEdicionPermitida);
        }
    }

    [Fact]
    public void Ficha_personal_no_puede_cerrarse_en_dominio()
    {
        var exCrear = Assert.Throws<ReglaNegocioException>(() =>
            new SeccionInstitucion(Institucion, SeccionHojaDeVida.FichaPersonal, habilitada: false, "admin"));
        Assert.Equal("La ficha personal no puede cerrarse.", exCrear.Message);

        var seccion = new SeccionInstitucion(Institucion, SeccionHojaDeVida.FichaPersonal, habilitada: true, "admin");
        var exModificar = Assert.Throws<ReglaNegocioException>(() =>
            seccion.CambiarEstado(habilitada: false, "admin"));
        Assert.Equal("La ficha personal no puede cerrarse.", exModificar.Message);
    }

    [Theory]
    [InlineData(SeccionHojaDeVida.FormacionAcademica)]
    [InlineData(SeccionHojaDeVida.Capacitaciones)]
    [InlineData(SeccionHojaDeVida.ExperienciaLaboral)]
    [InlineData(SeccionHojaDeVida.Referencias)]
    [InlineData(SeccionHojaDeVida.DocumentosPersonales)]
    [InlineData(SeccionHojaDeVida.CuentaBancaria)]
    public void Otras_secciones_pueden_abrirse_y_cerrarse_correctamente(SeccionHojaDeVida seccionTipo)
    {
        var seccion = new SeccionInstitucion(Institucion, seccionTipo, habilitada: false, "admin_user");
        Assert.False(seccion.Habilitada);
        Assert.Equal("admin_user", seccion.ModificadoPor);

        seccion.CambiarEstado(habilitada: true, "otro_admin");
        Assert.True(seccion.Habilitada);
        Assert.Equal("otro_admin", seccion.ModificadoPor);
    }

    [Fact]
    public void CapacitacionObligatoria_con_nombre_vacio_lanza_excepcion()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "   "));
    }

    [Fact]
    public void CapacitacionObligatoria_con_horas_cero_o_negativas_lanza_excepcion()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Curso Obligatorio", horasEsperadas: 0));
        Assert.Throws<ReglaNegocioException>(() =>
            new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Curso Obligatorio", horasEsperadas: -5));
    }

    [Fact]
    public void CapacitacionObligatoria_aplica_a_todas_las_personas_si_tipo_funcionario_es_nulo()
    {
        var obligatoria = new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Seguridad y Salud", tipoFuncionarioId: null);
        Assert.True(obligatoria.AplicaA(null));
        Assert.True(obligatoria.AplicaA(Guid.NewGuid()));
    }

    [Fact]
    public void CapacitacionObligatoria_aplica_solo_a_su_tipo_de_funcionario()
    {
        var tipoDocente = Guid.NewGuid();
        var tipoAdministrativo = Guid.NewGuid();
        var obligatoria = new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Didáctica activa", tipoFuncionarioId: tipoDocente);

        Assert.True(obligatoria.AplicaA(tipoDocente));
        Assert.False(obligatoria.AplicaA(tipoAdministrativo));
        Assert.False(obligatoria.AplicaA(null));
    }

    [Fact]
    public void CapacitacionObligatoria_inactiva_no_aplica()
    {
        var obligatoria = new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Curso Inactivo", activo: false);
        Assert.False(obligatoria.AplicaA(null));
        Assert.False(obligatoria.AplicaA(Guid.NewGuid()));
    }

    [Fact]
    public void CapacitacionObligatoria_detecta_exencion_automatica_por_nuevo_ingreso()
    {
        var fechaCurso = new DateOnly(2026, 3, 15);
        var obligatoria = new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Inducción 2026", fechaRealizacion: fechaCurso);

        // Ingresó después -> Exento automático
        Assert.True(obligatoria.EsExentoPorNuevoIngreso(new DateOnly(2026, 4, 1)));
        // Ingresó el mismo día o antes -> No exento
        Assert.False(obligatoria.EsExentoPorNuevoIngreso(new DateOnly(2026, 3, 15)));
        Assert.False(obligatoria.EsExentoPorNuevoIngreso(new DateOnly(2026, 1, 10)));
        // Sin fecha de ingreso o sin fecha de realización -> No exento
        Assert.False(obligatoria.EsExentoPorNuevoIngreso(null));

        var sinFechaCurso = new CapacitacionObligatoria(Guid.NewGuid(), Institucion, "Curso Permanente", fechaRealizacion: null);
        Assert.False(sinFechaCurso.EsExentoPorNuevoIngreso(new DateOnly(2026, 4, 1)));
    }

    [Fact]
    public void Capacitacion_vinculada_a_obligatoria_guarda_y_actualiza_vinculo()
    {
        var obligatoriaId = Guid.NewGuid();
        var capacitacion = new Capacitacion(Guid.NewGuid(), Institucion, PersonaId,
            new DatosCapacitacion("Curso", "Org", CapacitacionObligatoriaId: obligatoriaId));
        Assert.Equal(obligatoriaId, capacitacion.CapacitacionObligatoriaId);

        capacitacion.VincularCapacitacionObligatoria(null);
        Assert.Null(capacitacion.CapacitacionObligatoriaId);
    }

    [Fact]
    public void Persona_asigna_y_conserva_fecha_de_ingreso_institucional()
    {
        var persona = new Persona(Guid.NewGuid(), Institucion, "1700000001");
        Assert.Null(persona.FechaIngresoInstitucion);

        var fecha = new DateOnly(2025, 10, 1);
        persona.AsignarFechaIngreso(fecha);
        Assert.Equal(fecha, persona.FechaIngresoInstitucion);
    }
}
