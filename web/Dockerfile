# syntax=docker/dockerfile:1.7
#
# Imagen de la web (Micronaut + Thymeleaf). El contexto de build es la RAÍZ del
# repositorio:
#   docker build -f web/Dockerfile -t bir-app-web .

# --- Compilación -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

# Solo los POMs primero: capa cacheada mientras no cambien las dependencias.
COPY pom.xml ./
COPY api/pom.xml api/
COPY web/pom.xml web/
COPY db-migrations/pom.xml db-migrations/
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -q -pl web -am dependency:go-offline

COPY web/src web/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -pl web -am -DskipTests package dependency:copy-dependencies \
        -DincludeScope=runtime \
        -DoutputDirectory=/workspace/web/target/dependency

# --- Ejecución ---------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

# OpenHTMLtoPDF resuelve las fuentes con java.awt: sin fontconfig + una fuente
# instalada, el PDF de los simulacros se genera sin texto.
RUN apk add --no-cache fontconfig ttf-dejavu \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build --chown=app:app /workspace/web/target/classes /app/classes
COPY --from=build --chown=app:app /workspace/web/target/dependency /app/dependency

USER app
EXPOSE 8081

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["java", "-cp", "/app/classes:/app/dependency/*", "bir.app.web.Application"]
