# Imagen de Istpet.ActualizacionDatos.WebApi. No depende de src/Frontend.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /origen

COPY global.json Directory.Build.props Directory.Packages.props ./
COPY Istpet.ActualizacionDatos.sln ./
COPY src/Istpet.ActualizacionDatos.Domain/Istpet.ActualizacionDatos.Domain.csproj src/Istpet.ActualizacionDatos.Domain/
COPY src/Istpet.ActualizacionDatos.Application/Istpet.ActualizacionDatos.Application.csproj src/Istpet.ActualizacionDatos.Application/
COPY src/Istpet.ActualizacionDatos.Infrastructure/Istpet.ActualizacionDatos.Infrastructure.csproj src/Istpet.ActualizacionDatos.Infrastructure/
COPY src/Istpet.ActualizacionDatos.WebApi/Istpet.ActualizacionDatos.WebApi.csproj src/Istpet.ActualizacionDatos.WebApi/
COPY tests/Istpet.ActualizacionDatos.Domain.Tests/Istpet.ActualizacionDatos.Domain.Tests.csproj tests/Istpet.ActualizacionDatos.Domain.Tests/
COPY tests/Istpet.ActualizacionDatos.Application.Tests/Istpet.ActualizacionDatos.Application.Tests.csproj tests/Istpet.ActualizacionDatos.Application.Tests/
COPY tests/Istpet.ActualizacionDatos.WebApi.Tests/Istpet.ActualizacionDatos.WebApi.Tests.csproj tests/Istpet.ActualizacionDatos.WebApi.Tests/

RUN dotnet restore Istpet.ActualizacionDatos.sln

COPY . .

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

RUN mkdir -p /app/almacen_archivos && chown -R $APP_UID:$APP_UID /app/almacen_archivos

USER $APP_UID

ENTRYPOINT ["dotnet", "Istpet.ActualizacionDatos.WebApi.dll"]
