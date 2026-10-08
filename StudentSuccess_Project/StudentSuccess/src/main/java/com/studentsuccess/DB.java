package com.studentsuccess;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;
import java.io.InputStream;

public final class DB {

    private DB() {}

    public static Connection open() throws Exception {

        Properties p = new Properties();

        try (InputStream in = DB.class.getResourceAsStream("/db.properties")) {
            if (in != null) {
                p.load(in);
            }
        }

        Class.forName("com.mysql.cj.jdbc.Driver");

        String url = value("STUDENT_DB_URL", p.getProperty("db.url"));
        String user = value("STUDENT_DB_USER", p.getProperty("db.user"));
        String password = value("STUDENT_DB_PASSWORD", p.getProperty("db.password"));

        if (url == null || user == null || password == null) {
            throw new IllegalStateException("Database configuration is missing");
        }

        return DriverManager.getConnection(url, user, password);
    }

    private static String value(String key, String fallback) {
        String value = System.getenv(key);
        return (value == null || value.isBlank()) ? fallback : value;
    }
}