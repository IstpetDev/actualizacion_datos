namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using static ConfiguracionComunHojaDeVida;

public class FichaPersonalConfiguracion : IEntityTypeConfiguration<FichaPersonal>
{
    public void Configure(EntityTypeBuilder<FichaPersonal> builder)
    {
        builder.ToTable("fichas_personales");

        builder.HasKey(f => f.PersonaId);

        builder.Property(f => f.PersonaId)
            .ValueGeneratedNever()
            .HasColumnName("persona_id");

        builder.Property(f => f.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(f => f.PrimerNombre).HasMaxLength(100).HasColumnName("primer_nombre");
        builder.Property(f => f.SegundoNombre).HasMaxLength(100).HasColumnName("segundo_nombre");
        builder.Property(f => f.PrimerApellido).HasMaxLength(100).HasColumnName("primer_apellido");
        builder.Property(f => f.SegundoApellido).HasMaxLength(100).HasColumnName("segundo_apellido");
        builder.Property(f => f.FechaNacimiento).HasColumnName("fecha_nacimiento");

        RelacionCatalogo(builder, f => f.SexoId, "sexo_id");
        RelacionCatalogo(builder, f => f.EstadoCivilId, "estado_civil_id");
        RelacionCatalogo(builder, f => f.TipoSangreId, "tipo_sangre_id");
        RelacionCatalogo(builder, f => f.EtniaId, "etnia_id");
        RelacionCatalogo(builder, f => f.NacionalidadIndigenaId, "nacionalidad_indigena_id");
        RelacionCatalogo(builder, f => f.PaisNacionalidadId, "pais_nacionalidad_id");
        RelacionCatalogo(builder, f => f.PaisNacimientoId, "pais_nacimiento_id");
        RelacionCatalogo(builder, f => f.ParroquiaNacimientoId, "parroquia_nacimiento_id");
        RelacionCatalogo(builder, f => f.ParroquiaResidenciaId, "parroquia_residencia_id");
        RelacionCatalogo(builder, f => f.DiscapacidadId, "discapacidad_id");

        builder.Property(f => f.CallePrincipal).HasMaxLength(200).HasColumnName("calle_principal");
        builder.Property(f => f.CalleSecundaria).HasMaxLength(200).HasColumnName("calle_secundaria");
        builder.Property(f => f.NumeroCasa).HasMaxLength(20).HasColumnName("numero_casa");
        builder.Property(f => f.ReferenciaDomicilio).HasMaxLength(300).HasColumnName("referencia_domicilio");
        builder.Property(f => f.CodigoPostal).HasMaxLength(10).HasColumnName("codigo_postal");
        builder.Property(f => f.TelefonoConvencional).HasMaxLength(20).HasColumnName("telefono_convencional");
        builder.Property(f => f.Celular).HasMaxLength(20).HasColumnName("celular");
        builder.Property(f => f.CorreoInstitucional).HasMaxLength(200).HasColumnName("correo_institucional");
        builder.Property(f => f.PorcentajeDiscapacidad).HasColumnName("porcentaje_discapacidad");
        builder.Property(f => f.NumeroCarnetDiscapacidad).HasMaxLength(30).HasColumnName("numero_carnet_discapacidad");
        builder.Property(f => f.Perfil).HasMaxLength(2000).HasColumnName("perfil");

        builder.Property(f => f.FotoArchivoId)
            .HasColumnName("foto_archivo_id");

        builder.Property(f => f.FechaActualizacionUtc)
            .IsRequired()
            .HasColumnName("fecha_actualizacion_utc");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(f => f.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithOne()
            .HasForeignKey<FichaPersonal>(f => f.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ArchivoAdjunto>()
            .WithMany()
            .HasForeignKey(f => f.FotoArchivoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(f => f.InstitucionId)
            .HasDatabaseName("ix_fichas_personales_institucion_id");

        builder.ToTable(t => t.HasCheckConstraint(
            "ck_fichas_personales_porcentaje_discapacidad",
            "porcentaje_discapacidad IS NULL OR porcentaje_discapacidad BETWEEN 0 AND 100"));
    }
}
