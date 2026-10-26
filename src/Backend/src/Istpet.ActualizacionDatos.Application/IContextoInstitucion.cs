namespace Istpet.ActualizacionDatos.Application;

using Istpet.ActualizacionDatos.Domain;

public interface IContextoInstitucion
{
    InstitucionId? InstitucionId { get; }
    bool EsSuperadmin { get; }
    string? ActorActual { get; }
    RolUsuario? RolActual { get; }
}
