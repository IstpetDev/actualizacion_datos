namespace Istpet.ActualizacionDatos.Infrastructure.Multitenancy;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Domain;

public sealed class ContextoInstitucion : IContextoInstitucion
{
    public InstitucionId? InstitucionId { get; set; }
    public bool EsSuperadmin { get; set; }
    public string? ActorActual { get; set; }
    public RolUsuario? RolActual { get; set; }

    public ContextoInstitucion(
        InstitucionId? institucionId = null,
        bool esSuperadmin = false,
        string? actorActual = null,
        RolUsuario? rolActual = null)
    {
        InstitucionId = institucionId;
        EsSuperadmin = esSuperadmin;
        ActorActual = actorActual;
        RolActual = rolActual;
    }
}
