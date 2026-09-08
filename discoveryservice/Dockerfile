FROM maven:3.8.8-eclipse-temurin-11 AS build
WORKDIR /build

COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests clean package \
    && JAR_FILE="$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*.original' | head -n 1)" \
    && test -n "$JAR_FILE" \
    && cp "$JAR_FILE" /app.jar

FROM eclipse-temurin:11-jre-jammy
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/logs

COPY --from=build /app.jar /app/app.jar
EXPOSE 8000 8761 9001 9002 9003
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
