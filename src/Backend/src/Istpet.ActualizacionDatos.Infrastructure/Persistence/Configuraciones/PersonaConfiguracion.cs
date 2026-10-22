namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PersonaConfiguracion : IEntityTypeConfiguration<Persona>
{
    public void Configure(EntityTypeBuilder<Persona> builder)
    {
        builder.ToTable("personas");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("id");

        builder.Property(p => p.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(p => p.Documento)
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("documento");

        builder.Property(p => p.Nombre)
            .HasMaxLength(200)
            .HasColumnName("nombre");

        builder.Property(p => p.Correo)
            .HasMaxLength(200)
            .HasColumnName("correo");

        builder.Property(p => p.Rol)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("rol");

        builder.Property(p => p.AccesoHabilitado)
            .IsRequired()
            .HasColumnName("acceso_habilitado");

        builder.Property(p => p.EstadoActualizacion)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("estado_actualizacion");

        builder.Property(p => p.DatosPersonalesJson)
            .HasColumnName("datos_personales_json");

        builder.Property(p => p.FechaCreacionUtc)
            .IsRequired()
            .HasColumnName("fecha_creacion_utc");

        // Autenticación según ADR-0007
        builder.Property(p => p.PasswordHash)
            .HasMaxLength(500)
            .HasColumnName("password_hash");

        builder.Property(p => p.DebeCambiarContrasena)
            .IsRequired()
            .HasColumnName("debe_cambiar_contrasena");

        builder.Property(p => p.IntentosFallidos)
            .IsRequired()
            .HasColumnName("intentos_fallidos");

        builder.Property(p => p.BloqueadoHastaUtc)
            .HasColumnName("bloqueado_hasta_utc");

        // Verificación de correo según ADR-0007 (RF-ACC-005)
        builder.Property(p => p.CorreoVerificado)
            .IsRequired()
            .HasColumnName("correo_verificado");

        builder.Property(p => p.CodigoVerificacionCorreoHash)
            .HasMaxLength(200)
            .HasColumnName("codigo_verificacion_correo_hash");

        builder.Property(p => p.CodigoVerificacionExpiracionUtc)
            .HasColumnName("codigo_verificacion_expiracion_utc");

        builder.Property(p => p.IntentosCodigoVerificacion)
            .IsRequired()
            .HasColumnName("intentos_codigo_verificacion");

        // Tratamiento de datos según RF-DAT-001
        builder.Property(p => p.TratamientoDatosAceptado)
            .IsRequired()
            .HasColumnName("tratamiento_datos_aceptado");

        builder.Property(p => p.FechaAceptacionTratamientoDatosUtc)
            .HasColumnName("fecha_aceptacion_tratamiento_datos_utc");

        // ADR-0010: tipo de funcionario, del que dependen los documentos que se piden
        builder.Property(p => p.TipoFuncionarioId)
            .HasColumnName("tipo_funcionario_id");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(p => p.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TipoFuncionario>()
            .WithMany()
            .HasForeignKey(p => p.TipoFuncionarioId)
            .OnDelete(DeleteBehavior.SetNull);

        // PD-09: Unicidad del documento dentro de la misma institución;
        // permite que un mismo documento exista en instituciones distintas.
        builder.HasIndex(p => new { p.InstitucionId, p.Documento })
            .IsUnique()
            .HasDatabaseName("ix_personas_institucion_id_documento");
    }
}
