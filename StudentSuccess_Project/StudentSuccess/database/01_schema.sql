-- Run the ENTIRE script in MySQL Workbench. No DROP DATABASE commands.
CREATE DATABASE IF NOT EXISTS student_success CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_success;
CREATE TABLE IF NOT EXISTS users (
 user_id INT AUTO_INCREMENT PRIMARY KEY,username VARCHAR(50) NOT NULL UNIQUE,
 full_name VARCHAR(100) NOT NULL,password_hash VARCHAR(200) NOT NULL,role ENUM('ADMIN','TEACHER') NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS students (
 student_id INT AUTO_INCREMENT PRIMARY KEY,roll_no VARCHAR(30) NOT NULL UNIQUE,
 full_name VARCHAR(100) NOT NULL,class_name VARCHAR(50) NOT NULL,semester INT NOT NULL DEFAULT 5
) ENGINE=InnoDB;
-- Handles the earlier students table created in chat, which lacked semester.
SET @migration = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='student_success' AND table_name='students' AND column_name='semester')=0,'ALTER TABLE students ADD COLUMN semester INT NOT NULL DEFAULT 5','SELECT 1');
PREPARE stmt FROM @migration; EXECUTE stmt; DEALLOCATE PREPARE stmt;
CREATE TABLE IF NOT EXISTS academic_records (
 record_id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,record_date DATE NOT NULL,
 attendance DECIMAL(5,2) NULL,marks DECIMAL(5,2) NULL,pending_assignments INT NULL,entered_by INT NOT NULL,
 UNIQUE KEY uq_snapshot(student_id,record_date),FOREIGN KEY(student_id) REFERENCES students(student_id),FOREIGN KEY(entered_by) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS alerts (
 alert_id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,record_id INT NOT NULL UNIQUE,
 reasons TEXT NOT NULL,signal_level VARCHAR(30) NOT NULL,review_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
 reviewed_by INT NULL,reviewed_at TIMESTAMP NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(student_id) REFERENCES students(student_id),FOREIGN KEY(record_id) REFERENCES academic_records(record_id),FOREIGN KEY(reviewed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS interventions (
 intervention_id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,alert_id INT NOT NULL UNIQUE,teacher_id INT NOT NULL,
 decision VARCHAR(30) NOT NULL,remarks TEXT NOT NULL,action TEXT NOT NULL,followup_date DATE NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'Open',outcome TEXT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(student_id) REFERENCES students(student_id),FOREIGN KEY(alert_id) REFERENCES alerts(alert_id),FOREIGN KEY(teacher_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
-- Demo accounts. Existing accounts are preserved if script is rerun.
INSERT INTO users(username,full_name,password_hash,role)
SELECT 'admin','Project Admin','210000:cbNlPQXVJKrTMF0hG3xjOg==:Mjqnruyk2rvgItQExiGOPEOT3uiEXVz9xmYNOcj/ihU=','ADMIN' WHERE NOT EXISTS(SELECT 1 FROM users WHERE username='admin');
INSERT INTO users(username,full_name,password_hash,role)
SELECT 'teacher','Demo Teacher','210000:g6Y/G0K46uL3VZ8N5f5DDg==:lHgctLDLe8E1w843Iq/XnUhS7s5yptey7LCtennP2f0=','TEACHER' WHERE NOT EXISTS(SELECT 1 FROM users WHERE username='teacher');
SELECT user_id,username,full_name,role FROM users;
