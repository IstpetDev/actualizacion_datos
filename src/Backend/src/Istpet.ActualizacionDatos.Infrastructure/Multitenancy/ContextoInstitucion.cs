namespace Istpet.ActualizacionDatos.Infrastructure.Multitenancy;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Domain;

public sealed class ContextoInstitucion : IContextoInstitucion
{
    public InstitucionId? InstitucionId { get; set; }
    public bool EsSuperadmin { get; set; }

    public ContextoInstitucion(InstitucionId? institucionId = null, bool esSuperadmin = false)
    {
        InstitucionId = institucionId;
        EsSuperadmin = esSuperadmin;
    }
}
