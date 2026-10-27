namespace Istpet.ActualizacionDatos.Infrastructure.Documentos.Disenos;

using System.Globalization;
using Istpet.ActualizacionDatos.Application.Documentos;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public sealed class DisenoClasico : IDisenoBaseHojaDeVida
{
    public string CodigoDiseno => CatalogoCamposDocumento.DisenoClasico;

    public void Componer(IDocumentContainer contenedor, DatosDocumentoHojaDeVida datos, MarcaDocumento marca, ConfiguracionPlantilla configuracion)
    {
        var colorPrimario = Color.FromHex(MarcaDocumento.EsColorHexValido(marca.ColorPrimario) ? marca.ColorPrimario : "#1A365D");
        var colorSecundario = Color.FromHex(MarcaDocumento.EsColorHexValido(marca.ColorSecundario) ? marca.ColorSecundario : "#2B6CB0");
        var seccionesActivas = configuracion.Secciones.ToDictionary(s => s.CodigoSeccion, StringComparer.OrdinalIgnoreCase);

        // 1. Página de Portada (si está configurada)
        if (seccionesActivas.TryGetValue(CatalogoCamposDocumento.Secciones.Portada, out var cfgPortada))
        {
            contenedor.Page(pagina =>
            {
                pagina.Size(PageSizes.A4);
                pagina.Margin(2, Unit.Centimetre);
                pagina.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));

                if (datos.EsVistaPrevia)
                {
                    DibujarMarcaDeAgua(pagina);
                }

                pagina.Content().Column(col =>
                {
                    col.Spacing(20);

                    // Imagen de portada o banner de color
                    if (marca.PortadaBytes is { Length: > 0 } portada)
                    {
                        try
                        {
                            col.Item().Height(160).Image(portada).FitArea();
                        }
                        catch
                        {
                            DibujarBannerColor(col, colorPrimario);
                        }
                    }
                    else
                    {
                        DibujarBannerColor(col, colorPrimario);
                    }

                    // Logotipo institucional centrado
                    if (marca.LogoBytes is { Length: > 0 } logo)
                    {
                        try
                        {
                            col.Item().AlignCenter().Height(75).Image(logo).FitArea();
                        }
                        catch
                        {
                            // Ignora logotipo corrupto o inválido
                        }
                    }

                    // Título institucional y lema
                    col.Item().AlignCenter().Text(marca.NombreVisible)
                        .FontSize(20).Bold().FontColor(colorPrimario);

                    if (!string.IsNullOrWhiteSpace(marca.Lema))
                    {
                        col.Item().AlignCenter().Text(marca.Lema)
                            .FontSize(12).Italic().FontColor(colorSecundario);
                    }

                    col.Item().PaddingTop(40).AlignCenter().Text("HOJA DE VIDA")
                        .FontSize(26).Bold().FontColor(colorPrimario);

                    if (cfgPortada.Campos.Contains(CatalogoCamposDocumento.CamposPortada.NombreCompleto, StringComparer.OrdinalIgnoreCase))
                    {
                        col.Item().PaddingTop(15).AlignCenter().Text(datos.DatosPersonales.NombreCompleto)
                            .FontSize(16).SemiBold();
                    }

                    if (cfgPortada.Campos.Contains(CatalogoCamposDocumento.CamposPortada.TipoPersonal, StringComparer.OrdinalIgnoreCase)
                        && !string.IsNullOrWhiteSpace(datos.DatosPersonales.TipoPersonal))
                    {
                        col.Item().AlignCenter().Text($"Personal: {datos.DatosPersonales.TipoPersonal}")
                            .FontSize(13).FontColor(Colors.Grey.Darken2);
                    }

                    col.Item().AlignCenter().Text($"Fecha de emisión: {datos.FechaGeneracion:yyyy-MM-dd}")
                        .FontSize(10).FontColor(Colors.Grey.Darken1);
                });
            });
        }

        // 2. Páginas de Contenido Principal
        contenedor.Page(pagina =>
        {
            pagina.Size(PageSizes.A4);
            pagina.Margin(2, Unit.Centimetre);
            pagina.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken4));

            if (datos.EsVistaPrevia)
            {
                DibujarMarcaDeAgua(pagina);
            }

            // Encabezado
            pagina.Header().ShowOnce().Column(c =>
            {
                c.Item().Row(fila =>
                {
                    fila.RelativeItem().Column(enc =>
                    {
                        enc.Item().Text(marca.NombreVisible).FontSize(11).Bold().FontColor(colorPrimario);
                        if (!string.IsNullOrWhiteSpace(marca.Lema))
                        {
                            enc.Item().Text(marca.Lema).FontSize(8).Italic().FontColor(colorSecundario);
                        }
                    });

                    if (marca.LogoBytes is { Length: > 0 } logoHeader)
                    {
                        try
                        {
                            fila.ConstantItem(45).Height(30).Image(logoHeader).FitArea();
                        }
                        catch
                        {
                            // Ignora error de imagen
                        }
                    }
                });

                c.Item().PaddingTop(4).PaddingBottom(12).LineHorizontal(1.5f).LineColor(colorPrimario);
            });

            // Pie de página
            pagina.Footer().Column(f =>
            {
                f.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
                f.Item().Row(r =>
                {
                    r.RelativeItem().Text($"{datos.DatosPersonales.NombreCompleto} | C.I. {datos.DatosPersonales.DocumentoIdentidad}")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                    r.RelativeItem().AlignRight().Text(x =>
                    {
                        x.Span("Página ").FontSize(8).FontColor(Colors.Grey.Darken1);
                        x.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Darken1);
                        x.Span(" de ").FontSize(8).FontColor(Colors.Grey.Darken1);
                        x.TotalPages().FontSize(8).FontColor(Colors.Grey.Darken1);
                    });
                });
            });

            // Contenido dinámico según el orden de configuración
            pagina.Content().Column(col =>
            {
                col.Spacing(14);

                foreach (var seccionConfig in configuracion.Secciones)
                {
                    switch (seccionConfig.CodigoSeccion.ToLowerInvariant())
                    {
                        case CatalogoCamposDocumento.Secciones.DatosPersonales:
                            RenderizarDatosPersonales(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Perfil:
                            RenderizarPerfil(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Compromiso:
                            RenderizarCompromiso(col, datos, marca, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Formacion:
                            RenderizarFormacion(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Experiencia:
                            RenderizarExperiencia(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Capacitaciones:
                            RenderizarCapacitaciones(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Referencias:
                            RenderizarReferencias(col, datos, seccionConfig, colorPrimario);
                            break;

                        case CatalogoCamposDocumento.Secciones.Anexos:
                            RenderizarAnexos(col, seccionConfig, colorPrimario);
                            break;
                    }
                }
            });
        });
    }

    private static void DibujarBannerColor(ColumnDescriptor col, Color color)
    {
        col.Item().Height(40).Background(color);
    }

    private static void DibujarMarcaDeAgua(PageDescriptor pagina)
    {
        pagina.Foreground().AlignCenter().AlignMiddle().Rotate(-45).Text("VISTA PREVIA - NO OFICIAL")
            .FontSize(42).Bold().FontColor(Colors.Grey.Lighten2);
    }

    private static void RenderizarTituloSeccion(ColumnDescriptor col, string titulo, Color color)
    {
        col.Item().ShowEntire().Column(c =>
        {
            c.Item().Text(titulo).FontSize(13).Bold().FontColor(color);
            c.Item().PaddingTop(2).PaddingBottom(6).LineHorizontal(1).LineColor(color);
        });
    }

    private static void RenderizarDatosPersonales(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        RenderizarTituloSeccion(col, "1. DATOS PERSONALES", color);

        col.Item().ShowEntire().Row(r =>
        {
            var p = datos.DatosPersonales;

            // Foto de perfil o marcador neutro
            if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.Foto, StringComparer.OrdinalIgnoreCase))
            {
                r.ConstantItem(100).Column(f =>
                {
                    if (datos.FotoBytes is { Length: > 0 } fotoBytes)
                    {
                        try
                        {
                            f.Item().Width(90).Height(115).Border(1).BorderColor(Colors.Grey.Lighten2).Image(fotoBytes).FitArea();
                        }
                        catch
                        {
                            DibujarMarcadorSinFoto(f);
                        }
                    }
                    else
                    {
                        DibujarMarcadorSinFoto(f);
                    }
                });
            }

            // Datos de contacto y personales
            r.RelativeItem().PaddingLeft(10).Column(datosCol =>
            {
                datosCol.Spacing(4);

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.DocumentoIdentidad, StringComparer.OrdinalIgnoreCase))
                {
                    FilaDato(datosCol, "Documento de Identidad:", p.DocumentoIdentidad);
                }

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.LugarFechaNacimiento, StringComparer.OrdinalIgnoreCase))
                {
                    var fechaNac = p.FechaNacimiento?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "No registrado";
                    var lugarNac = !string.IsNullOrWhiteSpace(p.LugarNacimiento) ? $" ({p.LugarNacimiento})" : "";
                    FilaDato(datosCol, "Fecha y Lugar de Nacimiento:", $"{fechaNac}{lugarNac}");
                }

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.EstadoCivil, StringComparer.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(p.EstadoCivil))
                {
                    FilaDato(datosCol, "Estado Civil:", p.EstadoCivil);
                }

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.CiudadDireccion, StringComparer.OrdinalIgnoreCase))
                {
                    var dir = string.Join(" - ", new[] { p.CiudadResidencia, p.DireccionDomicilio }.Where(s => !string.IsNullOrWhiteSpace(s)));
                    if (!string.IsNullOrWhiteSpace(dir))
                    {
                        FilaDato(datosCol, "Residencia y Domicilio:", dir);
                    }
                }

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.TelefonoEmail, StringComparer.OrdinalIgnoreCase))
                {
                    var tels = string.Join(" / ", new[] { p.Celular, p.TelefonoConvencional }.Where(s => !string.IsNullOrWhiteSpace(s)));
                    if (!string.IsNullOrWhiteSpace(tels))
                    {
                        FilaDato(datosCol, "Teléfonos:", tels);
                    }
                    if (!string.IsNullOrWhiteSpace(p.CorreoInstitucional))
                    {
                        FilaDato(datosCol, "Correo Institucional:", p.CorreoInstitucional);
                    }
                }

                if (cfg.Campos.Contains(CatalogoCamposDocumento.CamposDatosPersonales.RegistroSenescyt, StringComparer.OrdinalIgnoreCase)
                    && p.RegistroSenescyt is { } reg && !string.IsNullOrWhiteSpace(reg.NumeroRegistro))
                {
                    var fechaReg = reg.FechaRegistro?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                    var detalle = fechaReg is not null ? $"{reg.NumeroRegistro} (Fecha: {fechaReg})" : reg.NumeroRegistro;
                    FilaDato(datosCol, "Registro SENESCYT Principal:", detalle);
                }
            });
        });
    }

    private static void DibujarMarcadorSinFoto(ColumnDescriptor f)
    {
        f.Item().Width(90).Height(115).Border(1).BorderColor(Colors.Grey.Lighten2)
            .Background(Colors.Grey.Lighten4).AlignCenter().AlignMiddle()
            .Text("Sin foto\nregistrada").FontSize(8).FontColor(Colors.Grey.Darken1).AlignCenter();
    }

    private static void FilaDato(ColumnDescriptor col, string etiqueta, string valor)
    {
        col.Item().Row(r =>
        {
            r.ConstantItem(150).Text(etiqueta).Bold().FontSize(9);
            r.RelativeItem().Text(valor).FontSize(9);
        });
    }

    private static void RenderizarPerfil(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        if (!cfg.Campos.Contains(CatalogoCamposDocumento.CamposPerfil.TextoPerfil, StringComparer.OrdinalIgnoreCase))
            return;

        RenderizarTituloSeccion(col, "2. PERFIL PROFESIONAL", color);
        col.Item().ShowEntire().PaddingBottom(4).Text(datos.PerfilProfesional).FontSize(9.5f).Italic();
    }

    private static void RenderizarCompromiso(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, MarcaDocumento marca, SeccionPlantillaConfig cfg, Color color)
    {
        RenderizarTituloSeccion(col, "3. COMPROMISO INSTITUCIONAL", color);

        var textoCompromiso = !string.IsNullOrWhiteSpace(marca.TextoCompromiso)
            ? marca.TextoCompromiso
            : "Declaro bajo juramento que los datos consignados en esta hoja de vida son verídicos y exactos.";

        var p = datos.DatosPersonales;
        var textoConIdentidad = $"{textoCompromiso}\n\nYo, {p.NombreCompleto}, con documento de identidad N° {p.DocumentoIdentidad}, me comprometo a cumplir con la veracidad de la información registrada.";

        col.Item().ShowEntire().Column(c =>
        {
            c.Item().Text(textoConIdentidad).FontSize(9);

            if (cfg.Campos.Contains(CatalogoCamposCompromiso.BloqueFirma, StringComparer.OrdinalIgnoreCase))
            {
                c.Item().PaddingTop(30).AlignCenter().Column(firmaCol =>
                {
                    firmaCol.Item().Width(220).LineHorizontal(1).LineColor(Colors.Grey.Darken2);
                    firmaCol.Item().PaddingTop(4).AlignCenter().Text(p.NombreCompleto).Bold().FontSize(9);
                    firmaCol.Item().AlignCenter().Text($"C.I. {p.DocumentoIdentidad}").FontSize(8.5f);
                    firmaCol.Item().AlignCenter().Text("Firma del Funcionario / Declaración").FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                });
            }
        });
    }

    private static void RenderizarFormacion(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        if (datos.Formaciones.Count == 0 && !cfg.MostrarSiVacia) return;

        RenderizarTituloSeccion(col, "4. FORMACIÓN ACADÉMICA", color);

        if (datos.Formaciones.Count == 0)
        {
            col.Item().Text("No registra títulos académicos.").FontSize(9).Italic();
            return;
        }

        col.Item().Table(tabla =>
        {
            tabla.ColumnsDefinition(colDef =>
            {
                colDef.RelativeColumn(3); // Título
                colDef.RelativeColumn(2); // Grado / Institución
                colDef.RelativeColumn(1.5f); // Registro SENESCYT
                colDef.RelativeColumn(1); // Fecha
            });

            tabla.Header(h =>
            {
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Título").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Grado / Institución").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Registro SENESCYT").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Obtención").Bold().FontSize(8.5f);
            });

            foreach (var item in datos.Formaciones)
            {
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Titulo).FontSize(8.5f);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text($"{item.GradoAcademico ?? ""}\n{item.Institucion ?? ""}").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.NumeroRegistroSenescyt ?? "—").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.FechaObtencion?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—").FontSize(8);
            }
        });
    }

    private static void RenderizarExperiencia(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        if (datos.Experiencias.Count == 0 && !cfg.MostrarSiVacia) return;

        RenderizarTituloSeccion(col, "5. EXPERIENCIA LABORAL", color);

        if (datos.Experiencias.Count == 0)
        {
            col.Item().Text("No registra experiencia laboral.").FontSize(9).Italic();
            return;
        }

        col.Item().Table(tabla =>
        {
            tabla.ColumnsDefinition(colDef =>
            {
                colDef.RelativeColumn(2); // Empleador
                colDef.RelativeColumn(2); // Cargo
                colDef.RelativeColumn(1.5f); // Periodo
                colDef.RelativeColumn(2.5f); // Funciones
            });

            tabla.Header(h =>
            {
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Empleador").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Cargo").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Periodo").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Funciones").Bold().FontSize(8.5f);
            });

            foreach (var item in datos.Experiencias)
            {
                var inicio = item.FechaInicio.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                var fin = item.TrabajaActualmente ? "Actualidad" : (item.FechaFin?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—");

                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Empleador).FontSize(8.5f);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Cargo).FontSize(8.5f);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text($"{inicio}\nhasta\n{fin}").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Funciones ?? "—").FontSize(8);
            }
        });
    }

    private static void RenderizarCapacitaciones(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        if (datos.Capacitaciones.Count == 0 && !cfg.MostrarSiVacia) return;

        RenderizarTituloSeccion(col, "6. CAPACITACIONES Y TALLERES", color);

        if (datos.Capacitaciones.Count == 0)
        {
            col.Item().Text("No registra capacitaciones.").FontSize(9).Italic();
            return;
        }

        col.Item().Table(tabla =>
        {
            tabla.ColumnsDefinition(colDef =>
            {
                colDef.RelativeColumn(3); // Evento
                colDef.RelativeColumn(2); // Institución Organizadora
                colDef.RelativeColumn(1); // Horas
                colDef.RelativeColumn(1.5f); // Fechas
            });

            tabla.Header(h =>
            {
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Evento / Curso").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Organizador").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Horas").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Periodo").Bold().FontSize(8.5f);
            });

            foreach (var item in datos.Capacitaciones)
            {
                var inicio = item.FechaInicio?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—";
                var fin = item.FechaFin?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—";

                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.NombreEvento).FontSize(8.5f);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.InstitucionOrganizadora ?? "—").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.NumeroHoras?.ToString(CultureInfo.InvariantCulture) ?? "—").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text($"{inicio} a {fin}").FontSize(8);
            }
        });
    }

    private static void RenderizarReferencias(ColumnDescriptor col, DatosDocumentoHojaDeVida datos, SeccionPlantillaConfig cfg, Color color)
    {
        if (datos.Referencias.Count == 0 && !cfg.MostrarSiVacia) return;

        RenderizarTituloSeccion(col, "7. REFERENCIAS PERSONALES Y FAMILIARES", color);

        if (datos.Referencias.Count == 0)
        {
            col.Item().Text("No registra referencias.").FontSize(9).Italic();
            return;
        }

        col.Item().Table(tabla =>
        {
            tabla.ColumnsDefinition(colDef =>
            {
                colDef.RelativeColumn(2.5f); // Nombres
                colDef.RelativeColumn(1.5f); // Tipo
                colDef.RelativeColumn(1.5f); // Teléfono
                colDef.RelativeColumn(2.5f); // Empresa / Cargo
            });

            tabla.Header(h =>
            {
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Nombres y Apellidos").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Tipo").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Teléfono").Bold().FontSize(8.5f);
                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Empresa / Cargo").Bold().FontSize(8.5f);
            });

            foreach (var item in datos.Referencias)
            {
                var cargoEmpresa = string.Join(" - ", new[] { item.Empresa, item.CargoActual }.Where(s => !string.IsNullOrWhiteSpace(s)));

                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.NombresApellidos).FontSize(8.5f);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Tipo ?? "—").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(item.Telefono ?? "—").FontSize(8);
                tabla.Cell().ShowEntire().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(cargoEmpresa).FontSize(8);
            }
        });
    }

    private static void RenderizarAnexos(ColumnDescriptor col, SeccionPlantillaConfig cfg, Color color)
    {
        col.Item().PageBreak();
        col.Item().AlignCenter().PaddingTop(150).Column(c =>
        {
            c.Item().AlignCenter().Text("ANEXOS GENERALES")
                .FontSize(24).Bold().FontColor(color);
            c.Item().AlignCenter().PaddingTop(10).Text("Certificados, títulos y respaldos documentales adjuntos a la hoja de vida.")
                .FontSize(11).FontColor(Colors.Grey.Darken1);
        });
    }

    private static class CatalogoCamposCompromiso
    {
        public const string BloqueFirma = "bloque_firma";
    }
}
