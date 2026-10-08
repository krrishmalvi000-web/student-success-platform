# Validation

- Java 17 Maven clean verify: BUILD SUCCESS.
- Five automated tests passed: missing-data handling, thresholds, marks decline, review priority, salted password hashing/verification.
- SQL schema and optional demo data imported twice successfully on MariaDB 10.11, a MySQL-compatible database. Existing demo accounts/records remained repeat-safe. Native MySQL 8 was not installed in this validation environment; use the provided Workbench scripts on your laptop.
- Tomcat 10.1 servlet integration: authenticated sessions, CSRF rejection, admin/teacher role enforcement, student insertion, academic records, four signal reasons, duplicate date rejection, invalid percentage rejection, mandatory support action/date, single-review concurrency guard, follow-up persistence and missing data behavior passed.
- Headless browser: login, dashboard, search, profile, academic form, review form, follow-ups, teachers, password form, responsive mobile layout and mobile sign-out passed with no JavaScript errors.
- Desktop/mobile screenshots visually inspected. Included under previews; screenshots contain fictional data and an additional integration-test student.

Not validated on your Windows/NetBeans installation yet. Initial setup needs your local MySQL password and selected Tomcat instance. No real field survey or student dataset is fabricated by this package.
