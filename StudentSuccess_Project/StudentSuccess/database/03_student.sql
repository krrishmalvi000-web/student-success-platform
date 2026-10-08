USE student_success;

-- Student names
INSERT INTO students (roll_no, full_name, class_name, semester)
VALUES
('DEMO001', 'Janhvi',   'TY BSc IT', 5),
('DEMO002', 'Krrish',   'TY BSc IT', 5),
('DEMO003', 'Aryan',     'TY BSc IT', 5),
('DEMO004', 'Janvi',    'TY BSc IT', 5),
('DEMO005', 'Shantanu', 'TY BSc IT', 5),
('DEMO006', 'Shakti',   'TY BSc IT', 5),
('DEMO007', 'Sachin',   'TY BSc IT', 5),
('DEMO008', 'Sarvesh',  'TY BSc IT', 5),
('DEMO009', 'Aarav',    'TY BSc IT', 5),
('DEMO010', 'Aditi',    'TY BSc IT', 5),
('DEMO011', 'Palak',    'TY BSc IT', 5)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Temporary sample data
CREATE TEMPORARY TABLE demo_scores (
    roll_no VARCHAR(30),
    attendance DECIMAL(5,2),
    previous_marks DECIMAL(5,2),
    current_marks DECIMAL(5,2),
    pending_assignments INT
);

INSERT INTO demo_scores VALUES
('DEMO001', 92, 82, 85, 0),
('DEMO002', 68, 75, 52, 2),
('DEMO003', 79, 60, 35, 0),
('DEMO004', 88, 76, 80, 0),
('DEMO005', 72, 65, 38, 3),
('DEMO006', 96, 89, 92, 0),
('DEMO007', 81, 62, 66, 1),
('DEMO008', 70, 72, 68, 0),
('DEMO009', 90, 80, 84, 0),
('DEMO010', 83, 70, 73, 2),
('DEMO011', 94, 85, 88, 0);

-- First academic snapshot
INSERT INTO academic_records (
    student_id, record_date, attendance,
    marks, pending_assignments, entered_by
)
SELECT
    s.student_id,
    '2026-09-01',
    90,
    d.previous_marks,
    0,
    u.user_id
FROM demo_scores d
JOIN students s ON s.roll_no = d.roll_no
JOIN users u ON u.username = 'teacher'
WHERE NOT EXISTS (
    SELECT 1 FROM academic_records r
    WHERE r.student_id = s.student_id
      AND r.record_date = '2026-09-01'
);

-- Second academic snapshot
INSERT INTO academic_records (
    student_id, record_date, attendance,
    marks, pending_assignments, entered_by
)
SELECT
    s.student_id,
    '2026-09-15',
    d.attendance,
    d.current_marks,
    d.pending_assignments,
    u.user_id
FROM demo_scores d
JOIN students s ON s.roll_no = d.roll_no
JOIN users u ON u.username = 'teacher'
WHERE NOT EXISTS (
    SELECT 1 FROM academic_records r
    WHERE r.student_id = s.student_id
      AND r.record_date = '2026-09-15'
);

-- Generate explainable alerts from saved records
INSERT INTO alerts (
    student_id, record_id, reasons, signal_level
)
SELECT
    x.student_id,
    x.record_id,
    CONCAT(
        '[',
        CONCAT_WS(',',
            IF(x.attendance < 75,
                JSON_QUOTE(CONCAT(
                    'Attendance below 75% (', x.attendance, '%)'
                )), NULL),
            IF(x.marks < 40,
                JSON_QUOTE(CONCAT(
                    'Marks below 40% (', x.marks, '%)'
                )), NULL),
            IF(x.pending_assignments >= 2,
                JSON_QUOTE(CONCAT(
                    x.pending_assignments, ' overdue assignments'
                )), NULL),
            IF(x.previous_marks - x.marks >= 15,
                JSON_QUOTE(CONCAT(
                    'Marks dropped by ',
                    x.previous_marks - x.marks,
                    ' percentage points'
                )), NULL)
        ),
        ']'
    ),
    IF(x.reason_count >= 2, 'Priority review', 'Monitor')
FROM (
    SELECT
        r.student_id,
        r.record_id,
        r.attendance,
        r.marks,
        r.pending_assignments,
        p.marks AS previous_marks,
        (
            IF(r.attendance < 75, 1, 0) +
            IF(r.marks < 40, 1, 0) +
            IF(r.pending_assignments >= 2, 1, 0) +
            IF(p.marks - r.marks >= 15, 1, 0)
        ) AS reason_count
    FROM academic_records r
    JOIN students s ON s.student_id = r.student_id
    JOIN demo_scores d ON d.roll_no = s.roll_no
    JOIN academic_records p
        ON p.student_id = r.student_id
       AND p.record_date = '2026-09-01'
    WHERE r.record_date = '2026-09-15'
) x
WHERE x.reason_count > 0
  AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.record_id = x.record_id
  );

DROP TEMPORARY TABLE demo_scores;

-- Run once in MySQL Workbench BEFORE deploying the new Java code.
-- Existing accounts, students and records are preserved.
USE student_success;
ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','TEACHER','STUDENT') NOT NULL;
SET @migration = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='student_success' AND table_name='users' AND column_name='student_id')=0,'ALTER TABLE users ADD COLUMN student_id INT NULL','SELECT 1');
PREPARE stmt FROM @migration; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @migration = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='student_success' AND table_name='users' AND index_name='uq_users_student')=0,'ALTER TABLE users ADD UNIQUE KEY uq_users_student(student_id)','SELECT 1');
PREPARE stmt FROM @migration; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @migration = IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema='student_success' AND table_name='users' AND constraint_name='fk_users_student')=0,'ALTER TABLE users ADD CONSTRAINT fk_users_student FOREIGN KEY(student_id) REFERENCES students(student_id)','SELECT 1');
PREPARE stmt FROM @migration; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SELECT user_id,username,role,student_id FROM users;


-- Check students
USE student_success;

SHOW TABLES;

SELECT roll_no, full_name, class_name, semester
FROM students
ORDER BY roll_no;

USE student_success;

SELECT user_id, username, full_name, role
FROM users;

SELECT *
FROM students
ORDER BY student_id DESC;

SELECT
    r.record_id,
    s.full_name,
    s.roll_no,
    r.record_date,
    r.attendance,
    r.marks,
    r.pending_assignments,
    u.full_name AS entered_by
FROM academic_records r
JOIN students s ON s.student_id = r.student_id
JOIN users u ON u.user_id = r.entered_by
ORDER BY r.record_date DESC, r.record_id DESC;

SELECT
    i.intervention_id,
    s.full_name AS student,
    u.full_name AS teacher,
    i.decision,
    i.remarks,
    i.action,
    i.followup_date,
    i.status,
    i.outcome
FROM interventions i
JOIN students s ON s.student_id = i.student_id
JOIN users u ON u.user_id = i.teacher_id
ORDER BY i.intervention_id DESC;

SELECT 'users' AS table_name, COUNT(*) AS total FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'academic_records', COUNT(*) FROM academic_records
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'interventions', COUNT(*) FROM interventions;

USE student_success;

SELECT
    u.user_id,
    u.username,
    u.role,
    s.student_id,
    s.full_name,
    s.roll_no,
    s.class_name,
    s.semester
FROM users u
JOIN students s ON s.student_id = u.student_id
WHERE u.role = 'STUDENT';


