FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /app
COPY ./ .
RUN dotnet publish "./DeleteOne/DeleteOne.csproj" -c Release -o /app/publish

FROM build AS publish

FROM public.ecr.aws/lambda/dotnet:5.0
COPY --from=publish /app/publish  /var/task
CMD [ "DeleteOne::DeleteOne.Function::FunctionHandler" ]
