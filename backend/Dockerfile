FROM gradle:8.5-jdk17 AS build
WORKDIR /workspace

COPY build.gradle settings.gradle gradle.properties ./
COPY gradle ./gradle
COPY src ./src

RUN gradle bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app

ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=25"

COPY --from=build /workspace/build/libs/backend-app-*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
