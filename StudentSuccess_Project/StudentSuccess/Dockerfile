FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

FROM tomcat:10.1-jdk17-temurin

WORKDIR /usr/local/tomcat

RUN rm -rf webapps/*

COPY --from=build /app/target/StudentSuccess.war webapps/ROOT.war

EXPOSE 8080

CMD ["catalina.sh", "run"]