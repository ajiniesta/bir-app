# syntax=docker/dockerfile:1.7
#
# Imagen de la API (Micronaut). El contexto de build es la RAÍZ del repositorio:
#   docker build -f api/Dockerfile -t bir-app-api .
#
# No hay plugin de fat-jar en los POMs, así que la imagen se monta con las
# clases compiladas (target/classes) más las dependencias de runtime copiadas
# por maven-dependency-plugin (target/dependency).

# --- Compilación -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

# Solo los POMs primero: esta capa se reutiliza mientras no cambien las
# dependencias, que es lo que más tarda en descargarse.
COPY pom.xml ./
COPY api/pom.xml api/
COPY web/pom.xml web/
COPY db-migrations/pom.xml db-migrations/
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -q -pl api -am dependency:go-offline

COPY api/src api/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -pl api -am -DskipTests package dependency:copy-dependencies \
        -DincludeScope=runtime \
        -DoutputDirectory=/workspace/api/target/dependency

# --- Ejecución ---------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build --chown=app:app /workspace/api/target/classes /app/classes
COPY --from=build --chown=app:app /workspace/api/target/dependency /app/dependency

USER app
EXPOSE 18080

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["java", "-cp", "/app/classes:/app/dependency/*", "bir.app.api.Application"]
