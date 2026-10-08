package com.studentsuccess;
import java.sql.*;
import java.util.Properties;
import java.io.InputStream;
public final class DB {
 private DB() {}
 public static Connection open() throws Exception {
  Properties p=new Properties();
  try(InputStream in=DB.class.getResourceAsStream("/db.properties")){ if(in==null)throw new IllegalStateException("db.properties missing");p.load(in); }
  Class.forName("com.mysql.cj.jdbc.Driver");
  return DriverManager.getConnection(value("STUDENT_DB_URL",p.getProperty("db.url")),value("STUDENT_DB_USER",p.getProperty("db.user")),value("STUDENT_DB_PASSWORD",p.getProperty("db.password")));
 }
 private static String value(String k,String fallback){String v=System.getenv(k);return v==null?fallback:v;}
}
