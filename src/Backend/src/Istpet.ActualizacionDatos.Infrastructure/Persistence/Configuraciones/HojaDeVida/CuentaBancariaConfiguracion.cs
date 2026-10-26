namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using static ConfiguracionComunHojaDeVida;

// ADR-0013, decisión 1. El número solo existe cifrado; las huellas son HMAC en hexadecimal (64 caracteres).
public class CuentaBancariaConfiguracion : IEntityTypeConfiguration<CuentaBancaria>
{
    public void Configure(EntityTypeBuilder<CuentaBancaria> builder)
    {
        builder.ToTable("cuentas_bancarias", t =>
        {
            t.HasCheckConstraint(
                "ck_cuentas_bancarias_banco",
                "(banco_id IS NOT NULL) <> (nombre_banco_otro IS NOT NULL)");
            t.HasCheckConstraint(
                "ck_cuentas_bancarias_ultimos_digitos",
                "length(ultimos_digitos) = 4");
        });

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.InstitucionId).IsRequired().HasColumnName("institucion_id");
        builder.Property(c => c.PersonaId).IsRequired().HasColumnName("persona_id");
        builder.Property(c => c.NombreBancoOtro).HasMaxLength(200).HasColumnName("nombre_banco_otro");
        builder.Property(c => c.NumeroCifrado).HasMaxLength(500).IsRequired().HasColumnName("numero_cifrado");
        builder.Property(c => c.UltimosDigitos).HasMaxLength(4).IsFixedLength().IsRequired().HasColumnName("ultimos_digitos");
        builder.Property(c => c.HuellaNumero).HasMaxLength(64).IsRequired().HasColumnName("huella_numero");
        builder.Property(c => c.HuellaNomina).HasMaxLength(64).HasColumnName("huella_nomina");
        builder.Property(c => c.Estado)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired()
            .HasColumnName("estado");
        builder.Property(c => c.FechaActualizacionUtc).IsRequired().HasColumnName("fecha_actualizacion_utc");
        builder.Ignore(c => c.NumeroEnmascarado);

        RelacionCatalogoObligatoria(builder, c => c.TipoCuentaId, "tipo_cuenta_id");
        RelacionCatalogo(builder, c => c.BancoId, "banco_id");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(c => c.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(c => c.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Una cuenta por persona.
        builder.HasIndex(c => c.PersonaId)
            .IsUnique()
            .HasDatabaseName("ux_cuentas_bancarias_persona_id");

        builder.HasIndex(c => c.InstitucionId)
            .HasDatabaseName("ix_cuentas_bancarias_institucion_id");
    }
}
