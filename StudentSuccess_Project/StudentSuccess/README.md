# Student Success Early-Signal Platform

A local Java web application for academic early signals and teacher-led support.
Open START_HERE_HINGLISH.md for setup and presentation steps.

Features: Admin/Teacher authentication, student management, dated academic snapshots, attendance/marks/overdue-work signals, marks decline detection, explainable reasons, teacher review, remarks/support actions, follow-up outcomes, student search, latest class graphs and individual progress graphs. Dark glass interface with responsive layouts. No frontend CDN dependencies.

## Structure

- pom.xml: Maven WAR project, Java 17
- database/01_schema.sql: non-destructive schema, migration from the initial students table, hashed demo accounts
- database/02_demo_data.sql: optional fictional demo records
- src/main/resources/db.properties: local DB connection settings
- src/main/java/com/studentsuccess: servlet API, JDBC, password hashing, signal rules
- src/main/webapp: browser UI and locally rendered SVG graphs
- src/test: meaningful rule-boundary and password tests

## API workflow

Session endpoint returns a CSRF token. Sign-in establishes an authenticated session and rotates the token. All mutations require the token. Students and teacher-account management require ADMIN. All authorised users in this single-class prototype can enter academic records and review signals. Academic record insertion and alert creation are transactional; review and intervention creation are transactional. An alert is reviewed once, with its history retained.

Passwords: PBKDF2-HMAC-SHA256 with independent random salts. Database queries use prepared statements. Browser strings are escaped before insertion in markup. Session cookies are HTTP-only. Local demo uses HTTP and a local DB connection; deployment hardening is outside this package.

## Demo credentials

admin / Admin@12345
teacher / Teacher@12345

Change these under Account before using real data. The database configuration file contains a placeholder password only. The included WAR also contains the placeholder; configure and rebuild from source before running on your laptop.

## Fieldwork

The implementation is a rule-based academic support prototype. It is not a validated machine-learning prediction system. Gather actual teacher requirements, permission, anonymised records and feedback separately for the field-project report. Student alerts are advisory and require a teacher decision.
