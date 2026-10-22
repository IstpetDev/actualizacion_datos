namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using System.Linq.Expressions;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

internal static class ConfiguracionComunHojaDeVida
{
    // Columnas y relaciones que comparte toda sección con varios registros (ADR-0010, decisiones 3 y 10).
    public static void ConfigurarRegistro<T>(EntityTypeBuilder<T> builder, string tabla)
        where T : RegistroHojaDeVida
    {
        builder.ToTable(tabla);

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id)
            .HasColumnName("id");

        builder.Property(r => r.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(r => r.PersonaId)
            .IsRequired()
            .HasColumnName("persona_id");

        builder.Property(r => r.ArchivoId)
            .HasColumnName("archivo_id");

        builder.Property(r => r.FechaActualizacionUtc)
            .IsRequired()
            .HasColumnName("fecha_actualizacion_utc");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(r => r.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(r => r.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ArchivoAdjunto>()
            .WithMany()
            .HasForeignKey(r => r.ArchivoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(r => r.InstitucionId)
            .HasDatabaseName($"ix_{tabla}_institucion_id");

        builder.HasIndex(r => r.PersonaId)
            .HasDatabaseName($"ix_{tabla}_persona_id");

        builder.HasIndex(r => r.ArchivoId)
            .HasDatabaseName($"ix_{tabla}_archivo_id");
    }

    public static void RelacionCatalogo<T>(
        EntityTypeBuilder<T> builder,
        Expression<Func<T, int?>> propiedad,
        string columna)
        where T : class
    {
        builder.Property(propiedad)
            .HasColumnName(columna);

        builder.HasOne<ElementoCatalogo>()
            .WithMany()
            .HasForeignKey(NombreDe(propiedad.Body))
            .OnDelete(DeleteBehavior.Restrict);
    }

    public static void RelacionCatalogoObligatoria<T>(
        EntityTypeBuilder<T> builder,
        Expression<Func<T, int>> propiedad,
        string columna)
        where T : class
    {
        builder.Property(propiedad)
            .IsRequired()
            .HasColumnName(columna);

        builder.HasOne<ElementoCatalogo>()
            .WithMany()
            .HasForeignKey(NombreDe(propiedad.Body))
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static string NombreDe(Expression cuerpo) =>
        cuerpo is MemberExpression miembro
            ? miembro.Member.Name
            : throw new ArgumentException("La expresión debe ser el acceso a una propiedad.", nameof(cuerpo));
}
