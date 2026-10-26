# Imagen de Istpet.ActualizacionDatos.WebApi. No depende de src/Frontend.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /origen/src/Backend

COPY src/Backend/global.json src/Backend/Directory.Build.props src/Backend/Directory.Packages.props ./
COPY src/Backend/Istpet.ActualizacionDatos.sln ./
COPY src/Backend/src/Istpet.ActualizacionDatos.Domain/Istpet.ActualizacionDatos.Domain.csproj src/Istpet.ActualizacionDatos.Domain/
COPY src/Backend/src/Istpet.ActualizacionDatos.Application/Istpet.ActualizacionDatos.Application.csproj src/Istpet.ActualizacionDatos.Application/
COPY src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Istpet.ActualizacionDatos.Infrastructure.csproj src/Istpet.ActualizacionDatos.Infrastructure/
COPY src/Backend/src/Istpet.ActualizacionDatos.WebApi/Istpet.ActualizacionDatos.WebApi.csproj src/Istpet.ActualizacionDatos.WebApi/
COPY src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/Istpet.ActualizacionDatos.Domain.Tests.csproj tests/Istpet.ActualizacionDatos.Domain.Tests/
COPY src/Backend/tests/Istpet.ActualizacionDatos.Application.Tests/Istpet.ActualizacionDatos.Application.Tests.csproj tests/Istpet.ActualizacionDatos.Application.Tests/
COPY src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Istpet.ActualizacionDatos.WebApi.Tests.csproj tests/Istpet.ActualizacionDatos.WebApi.Tests/

RUN dotnet restore Istpet.ActualizacionDatos.sln

COPY src/Backend/ ./
COPY data/catalogos/ /origen/data/catalogos/

RUN dotnet publish src/Istpet.ActualizacionDatos.WebApi/Istpet.ActualizacionDatos.WebApi.csproj \
      --configuration Release \
      --no-restore \
      --output /publicado \
      -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /publicado ./

ENV ASPNETCORE_HTTP_PORTS=8080
ENV DOTNET_gcServer=0

EXPOSE 8080

# Carpetas de archivos (ADR-0006) escribibles por el usuario sin privilegios: /app/almacen_archivos en
# desarrollo (#46) y /datos/archivos en producción (Almacenamiento__RutaRaiz de docker-compose.prod.yml).
# Un volumen nombrado nuevo hereda este dueño; sin ellas Docker las crea de root y la subida falla.
RUN mkdir -p /app/almacen_archivos && chown -R $APP_UID:$APP_UID /app/almacen_archivos
RUN mkdir -p /datos/archivos && chown -R $APP_UID:$APP_UID /datos/archivos

USER $APP_UID

ENTRYPOINT ["dotnet", "Istpet.ActualizacionDatos.WebApi.dll"]
