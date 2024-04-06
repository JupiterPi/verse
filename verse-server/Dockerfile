FROM gradle:jdk21 as build
WORKDIR /app
COPY . .
RUN gradle shadowJar

FROM amazoncorretto:21-alpine
WORKDIR /app
COPY --from=build /app/build/libs/verse-server-all.jar /app/verse-server.jar
CMD ["java", "-jar", "verse-server.jar"]