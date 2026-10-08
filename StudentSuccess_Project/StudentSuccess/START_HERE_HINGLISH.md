# StudentSuccess — Run karne ke steps

Stack: JDK 17, NetBeans 23, Tomcat 10.0/10.1, MySQL 8.x, MySQL Workbench.
Java backend + Servlet/JDBC; HTML/CSS/JavaScript frontend. Maven project.
Tomcat 10 uses jakarta.servlet; this project compiles against Servlet 5 for compatibility with both Tomcat 10.0 and 10.1. Use a maintained Tomcat 10.1 patch for your own installation.

## 1. ZIP extract kar

ZIP ko right-click → Extract All. Andar `StudentSuccess` folder hai. Usi mein `pom.xml` hai; wahi project folder open karna hai.
Kisi manually-created empty project mein files one-by-one paste karne ki zarurat nahi.

## 2. Database bana — Workbench

1. MySQL Workbench open → apna Local connection open → password enter.
2. File → Open SQL Script → `StudentSuccess/database/01_schema.sql`.
3. Poora script run kar: lightning bolt for entire script, ya Ctrl+Shift+Enter.
4. Optional demo: `02_demo_data.sql` open karke poora run kar.
5. SCHEMAS refresh → `student_success` expand kar.
6. Tables: users, students, academic_records, alerts, interventions.

Earlier chat mein banayi students table bhi handle hoti hai: script missing semester column add karta hai. Database drop nahi hota. Demo script rerun karne se same demo students/snapshots duplicate nahi honge.
Demo data fictional hai. Teacher meeting/field survey ka replacement nahi hai.

## 3. Project open — NetBeans

1. File → Open Project.
2. Extracted `StudentSuccess` folder select kar, jisme pom.xml hai.
3. Open Project click kar.
4. Project expand → Other Sources → src/main/resources → db.properties.
   Agar panel mein file na mile: Window → Files → src → main → resources.
5. `db.password=CHANGE_ME` ko apne MySQL password se replace kar.
   `db.user=root` local connection ke username ke hisaab se change kar.
   Agar port 3306 nahi hai, db.url mein apna port set kar.
6. Save. Password chat mein mat bhejna.

Java properties mein backslash special hai. Password mein literal backslash ho toh usko double backslash likh. Alternatively STUDENT_DB_PASSWORD environment variable set kar aur NetBeans restart kar.

## 4. Tomcat select kar

1. Project right-click → Properties → Run.
2. Server: registered Apache Tomcat 10 select kar.
3. Context Path: `/StudentSuccess` (agar field available hai).
4. Java Platform JDK 17 select kar. Missing platform: Tools → Java Platforms → Add Platform.
5. Services → Servers mein Tomcat listed hona chahiye. Nahi ho toh Servers right-click → Add Server → Apache Tomcat → installation folder (bin/conf folders wala root), server manager credentials.
6. Server dropdown empty ho toh Tools → Plugins mein Java Web support installed/active check kar; phir NetBeans restart kar.

## 5. Build aur run

1. Project right-click → Clean and Build. First build ke liye internet chahiye (Maven dependencies).
2. Output mein BUILD SUCCESS aane de.
3. Project right-click → Run.
4. Browser normally automatically khulega. Otherwise:
   http://localhost:8080/StudentSuccess/
5. Agar Tomcat kisi aur port par hai, URL mein wahi port use kar.

Optional terminal build: `mvn clean verify` from the folder containing pom.xml.
Manual deployment: build ke baad `target/StudentSuccess.war` Tomcat ke webapps folder mein copy kar; server start kar. NetBeans deployment aur manual WAR ek saath use mat karna.

## 6. Demo login

| Role | Username | Initial password |
|---|---|---|
| Admin | admin | Admin@12345 |
| Teacher | teacher | Teacher@12345 |

Admin students add/edit aur teacher accounts create karta hai.
Teacher aur Admin academic records, reviews aur follow-ups manage kar sakte hain.
Account page se password change hota hai. Real data dalne se pehle demo passwords change kar.
All teachers in this class-wide prototype can see the same class records. Separate class allocation is not implemented.

## 7. Sir ke saamne demo

1. Admin login → Students → dummy student add: TEST001, Test Student, TY BSc IT, Semester 5.
2. + Record → aaj se pehle ki date choose kar. Attendance 92, marks 75, overdue 0. Save. No signal.
3. + Record → usse baad ki date (aaj ya past): attendance 65, marks 35, overdue 3. Save.
4. Overview/Signal reviews mein alert aur reasons dikhengi.
5. Sign out → teacher login.
6. Review signal → Needs support → remarks: 'Student discussion completed; revision support needed.'
7. Action: 'Weekly doubt-solving session and assignment completion plan.'
8. Follow-up date select → Save.
9. Follow-ups → Update → outcome note add → Completed.
10. Student Profile mein records graph aur teacher support history dikhao.
11. Later date par better academic snapshot add karke progress check kar. Intervention se improvement caused hua hai aisa scientific claim mat karna; graph recorded change dikhata hai.

Record dates strictly increasing honi chahiye; one student/date snapshot. Future academic record allowed nahi hai. Two snapshots se marks trend compare hota hai. Missing field blank reh sakta hai; zero ka matlab genuine zero hai.
Reviewed alerts retained hain. Fresh normal record se old unresolved alerts automatically close nahi hote: teacher review zaroori hai.
Academic snapshots are append-only in this version; if a source record was entered incorrectly, dismiss its alert with a reason and add a corrected snapshot on a later date. Student identity details can be edited by Admin.

## 8. Demo thresholds

Attendance <75%, marks <40%, overdue assignments >=2, marks decline >=15 percentage points from immediately previous snapshot (if both marks available).
One reason: Monitor. Two or more: Priority review. Reasons explain each alert.
Missing data: shown separately; never treated as failure.
These are demonstration rules, not a validated prediction model or college policy.
Change thresholds in src/main/java/com/studentsuccess/Signals.java and rebuild. Existing alerts remain historical and are not recalculated.

## 9. Common problems

- MySQL connection refused: MySQL Server service start kar; Workbench alone database server nahi hai.
- Access denied: db.properties mein correct local username/password; save → Clean and Build → Run.
- Unknown database/table: 01_schema.sql poora run kar.
- BUILD FAILURE: last error ka screenshot bhej. JDK 17 selected hai ya nahi check kar.
- `javax.servlet` errors: is project mein jakarta.servlet use hai. Tomcat 10 select kar, Tomcat 9 nahi.
- 404: project successfully deployed? Output check, actual context path/port check.
- Port already in use: second Tomcat process stop kar, ya server HTTP port change kar.
- Sign-in attempts blocked: five failed attempts ke baad five-minute wait.
- Refresh/session issue: sign out ya page refresh; phir login.
- Duplicate roll/date: unique roll number aur later snapshot date use kar.

## 10. Group field project

Two-person report mein dono names add kar sakte ho, but contribution honestly describe karna. Fieldwork: teacher requirements discussion, permission, anonymised sample records, feedback notes, screenshots, and test results collect kar. Report separately ban sakti hai after actual demo/field findings.

## Important scope

Local academic prototype. Password hashing, role checks, prepared SQL, CSRF tokens and session authentication included. Not a production deployment: no class-by-class authorisation, password recovery, automated emails, or validated ML. Use dummy/anonymised records for your presentation. Use HTTPS, appropriate DB privileges and access policy before any real deployment.
