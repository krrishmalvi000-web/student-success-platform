FROM tomcat:10.1-jdk17-temurin

WORKDIR /usr/local/tomcat

COPY target/StudentSuccess.war webapps/ROOT.war

EXPOSE 8080

CMD ["catalina.sh", "run"]