namespace Istpet.ActualizacionDatos.Infrastructure.Persistence;

using System.Reflection;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Domain;
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
