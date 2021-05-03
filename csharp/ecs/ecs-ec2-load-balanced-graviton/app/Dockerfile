FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build
WORKDIR /source

COPY *.sln .
COPY webapp/*.csproj ./webapp/
RUN dotnet restore -r linux-musl-arm64

# copy everything else and build app
COPY webapp/. ./webapp/
WORKDIR /source/webapp
RUN dotnet publish -c release -o /app -r linux-musl-arm64 --self-contained false --no-restore

# final stage/image
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine-arm64v8
WORKDIR /app
COPY --from=build /app ./
ENTRYPOINT ["./webapp"]