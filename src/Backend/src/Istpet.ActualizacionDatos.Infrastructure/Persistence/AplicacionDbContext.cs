namespace Istpet.ActualizacionDatos.Infrastructure.Persistence;

using System.Reflection;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence.Convertidores;
using Microsoft.EntityFrameworkCore;

public class AplicacionDbContext : DbContext
{
    private readonly IContextoInstitucion _contextoInstitucion;

    public DbSet<Institucion> Instituciones => Set<Institucion>();
    public DbSet<Campana> Campanas => Set<Campana>();
    public DbSet<Persona> Personas => Set<Persona>();
    public DbSet<Auditoria> Auditorias => Set<Auditoria>();
    public DbSet<Observacion> Observaciones => Set<Observacion>();
    public DbSet<MarcaObservacion> MarcasObservacion => Set<MarcaObservacion>();
    public DbSet<ArchivoAdjunto> ArchivosAdjuntos => Set<ArchivoAdjunto>();
    public DbSet<AvisoProteccionDatos> AvisosProteccionDatos => Set<AvisoProteccionDatos>();
    public DbSet<AceptacionProteccionDatos> AceptacionesProteccionDatos => Set<AceptacionProteccionDatos>();

    // Hoja de vida (ADR-0010)
    public DbSet<ElementoCatalogo> ElementosCatalogo => Set<ElementoCatalogo>();
    public DbSet<TipoFuncionario> TiposFuncionario => Set<TipoFuncionario>();
    public DbSet<TipoDocumento> TiposDocumento => Set<TipoDocumento>();
    public DbSet<RequisitoDocumento> RequisitosDocumento => Set<RequisitoDocumento>();
    public DbSet<FichaPersonal> FichasPersonales => Set<FichaPersonal>();
    public DbSet<TituloAcademico> TitulosAcademicos => Set<TituloAcademico>();
    public DbSet<TituloEnCurso> TitulosEnCurso => Set<TituloEnCurso>();
    public DbSet<Capacitacion> Capacitaciones => Set<Capacitacion>();
    public DbSet<ExperienciaLaboral> ExperienciasLaborales => Set<ExperienciaLaboral>();
    public DbSet<ReferenciaPersonal> ReferenciasPersonales => Set<ReferenciaPersonal>();
    public DbSet<DocumentoPersonal> DocumentosPersonales => Set<DocumentoPersonal>();
    public DbSet<CuentaBancaria> CuentasBancarias => Set<CuentaBancaria>();
    public DbSet<SeccionInstitucion> SeccionesInstitucion => Set<SeccionInstitucion>();

    public AplicacionDbContext(
        DbContextOptions<AplicacionDbContext> options,
        IContextoInstitucion? contextoInstitucion = null)
        : base(options)
    {
        _contextoInstitucion = contextoInstitucion ?? new ContextoInstitucionVacio();
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<InstitucionId>()
            .HaveConversion<InstitucionIdConverter>();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidarHistoriaProteccionDatos();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ValidarHistoriaProteccionDatos();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ValidarHistoriaProteccionDatos()
    {
        if (ChangeTracker.Entries<AceptacionProteccionDatos>().Any(e => e.State is EntityState.Modified or EntityState.Deleted) ||
            ChangeTracker.Entries<AvisoProteccionDatos>().Any(e => e.State == EntityState.Deleted ||
                (e.State == EntityState.Modified && e.Properties.Any(p => p.IsModified && p.Metadata.Name != nameof(AvisoProteccionDatos.VigenteHastaUtc)))))
            throw new InvalidOperationException("El contenido de un aviso publicado y su evidencia de aceptación son inmutables.");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AplicacionDbContext).Assembly);

        ConfigurarFiltrosInstitucionales(modelBuilder);
    }

    private void ConfigurarFiltrosInstitucionales(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IEntidadInstitucional).IsAssignableFrom(entityType.ClrType))
            {
                var metodo = typeof(AplicacionDbContext)
                    .GetMethod(nameof(AplicarFiltroInstitucionalGenerico), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);

                metodo.Invoke(this, [modelBuilder]);
            }
        }
    }

    private void AplicarFiltroInstitucionalGenerico<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, IEntidadInstitucional
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            _contextoInstitucion.EsSuperadmin ||
            (_contextoInstitucion.InstitucionId != null && e.InstitucionId == _contextoInstitucion.InstitucionId));
    }

    private sealed class ContextoInstitucionVacio : IContextoInstitucion
    {
        public InstitucionId? InstitucionId => null;
        public bool EsSuperadmin => false;
        public string? ActorActual => null;
        public RolUsuario? RolActual => null;
    }
}
