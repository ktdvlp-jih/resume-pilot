# Stages: dev (bootRun + debug) | build | runtime (default for compose up)
#
#   docker build --target dev -t resume-api-dev .
#   docker build -t resume-api .
#
# Note: use Debian-based Temurin (not alpine) for Docker Desktop on Windows compatibility.

FROM eclipse-temurin:21-jdk AS dev
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew
EXPOSE 8080 5005
CMD ["./gradlew", "bootRun", "--no-daemon", "-x", "test"]

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew && ./gradlew bootJar -x test

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
