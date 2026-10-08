package com.studentsuccess;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import com.google.gson.*;
import java.io.*;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@WebServlet("/api/*")
public class ApiServlet extends HttpServlet {
 private final Gson gson=new GsonBuilder().serializeNulls().create();
 private final Map<String,Attempt> attempts=new ConcurrentHashMap<>();
 private static class Attempt { int failures; long until; }
 private static class Problem extends RuntimeException { final int status; Problem(int s,String m){super(m);status=s;} }
 @Override protected void service(HttpServletRequest req,HttpServletResponse res)throws IOException{
  req.setCharacterEncoding("UTF-8");res.setContentType("application/json;charset=UTF-8");res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
  try{
   String path=req.getPathInfo()==null?"":req.getPathInfo();String method=req.getMethod();
   if(!method.equals("GET")&&!method.equals("POST"))throw new Problem(405,"Method not allowed");
   HttpSession session=req.getSession(true);
   if(session.getAttribute("csrf")==null)session.setAttribute("csrf",UUID.randomUUID().toString());
   if(method.equals("POST")&&!Objects.equals(session.getAttribute("csrf"),req.getHeader("X-CSRF-Token")))throw new Problem(403,"Refresh the page and try again.");
   if(path.equals("/session")&&method.equals("GET")){send(res,Map.of("user",session.getAttribute("user")==null?Collections.emptyMap():session.getAttribute("user"),"csrf",session.getAttribute("csrf")));return;}
   if(path.equals("/login")&&method.equals("POST")){login(req,res,session);return;}
   if (path.equals("/register") && method.equals("POST")) {
    register(req, res);
    return;
}
   if(session.getAttribute("user")==null)throw new Problem(401,"Please sign in.");
   @SuppressWarnings("unchecked") Map<String,Object> user=(Map<String,Object>)session.getAttribute("user");
   int uid=((Number)user.get("user_id")).intValue();boolean admin=user.get("role").equals("ADMIN");
   if(path.equals("/logout")&&method.equals("POST")){session.invalidate();send(res,Map.of("ok",true));return;}
   boolean studentRole="STUDENT".equals(user.get("role"));
   if(studentRole && !path.equals("/my-profile") && !path.equals("/password"))
       throw new Problem(403,"Student accounts can only access their own profile and password.");

   try(Connection c=DB.open()){
    if(method.equals("GET")){
     switch(path){
      case "/my-profile": {
       if(!studentRole)throw new Problem(403,"Student access required");
       List<Map<String,Object>> linked=rows(c,"SELECT student_id FROM users WHERE user_id=?",uid);
       Object value=linked.isEmpty()?null:linked.get(0).get("student_id");
       if(!(value instanceof Number))throw new Problem(403,"Ask your administrator to link your student profile.");
       int sid=((Number)value).intValue();
       List<Map<String,Object>> found=rows(c,"SELECT * FROM students WHERE student_id=?",sid);
       if(found.isEmpty())throw new Problem(404,"Student profile not found");
       send(res,Map.of("student",found.get(0),
        "records",rows(c,"SELECT record_id,record_date,attendance,marks,pending_assignments FROM academic_records WHERE student_id=? ORDER BY record_date,record_id",sid),
        "interventions",rows(c,"SELECT i.decision,i.action,i.followup_date,i.status,i.outcome,u.full_name AS teacher_name FROM interventions i JOIN users u ON u.user_id=i.teacher_id WHERE i.student_id=? ORDER BY i.intervention_id DESC",sid)));
       break;
      }
      case "/students":send(res,rows(c,"SELECT s.*,r.record_id,r.record_date,r.attendance,r.marks,r.pending_assignments,a.alert_id,a.reasons,a.signal_level,a.review_status FROM students s LEFT JOIN academic_records r ON r.record_id=(SELECT rr.record_id FROM academic_records rr WHERE rr.student_id=s.student_id ORDER BY rr.record_date DESC,rr.record_id DESC LIMIT 1) LEFT JOIN alerts a ON a.record_id=r.record_id ORDER BY s.full_name"));break;
      case "/profile":{
       int id=positive(req.getParameter("id"));List<Map<String,Object>> student=rows(c,"SELECT * FROM students WHERE student_id=?",id);if(student.isEmpty())throw new Problem(404,"Student not found");
       send(res,Map.of("student",student.get(0),"records",rows(c,"SELECT * FROM academic_records WHERE student_id=? ORDER BY record_date,record_id",id),"alerts",rows(c,"SELECT a.*,r.record_date FROM alerts a JOIN academic_records r ON r.record_id=a.record_id WHERE a.student_id=? ORDER BY a.alert_id DESC",id),"interventions",rows(c,"SELECT i.*,u.full_name AS teacher_name FROM interventions i JOIN users u ON u.user_id=i.teacher_id WHERE i.student_id=? ORDER BY i.intervention_id DESC",id)));break;
      }
      case "/reviews":send(res,rows(c,"SELECT a.*,s.full_name,s.roll_no,r.record_date FROM alerts a JOIN students s ON s.student_id=a.student_id JOIN academic_records r ON r.record_id=a.record_id ORDER BY a.alert_id DESC"));break;
      case "/followups":send(res,rows(c,"SELECT i.*,s.full_name,s.roll_no,u.full_name AS teacher_name FROM interventions i JOIN students s ON s.student_id=i.student_id JOIN users u ON u.user_id=i.teacher_id ORDER BY i.followup_date IS NULL,i.followup_date,i.intervention_id DESC"));break;
      case "/users":if(!admin)throw new Problem(403,"Admin access required");send(res,rows(c,"SELECT user_id,username,full_name,role,student_id FROM users ORDER BY user_id"));break;
      default:throw new Problem(404,"Endpoint not found");
     }return;
    }
    JsonObject b=body(req);
    switch(path){
     case "/student-account": {
      if(!admin)throw new Problem(403,"Admin access required");
      int sid=integer(b,"student_id",1,Integer.MAX_VALUE);
      String username=required(b,"username",50);
      if(!username.matches("[a-zA-Z0-9_.-]{3,50}"))throw new Problem(400,"Invalid username");
      String pw=password(b,"password");
      if(!pw.equals(required(b,"confirm_password",200)))throw new Problem(400,"Passwords do not match");
      List<Map<String,Object>> students=rows(c,"SELECT full_name FROM students WHERE student_id=?",sid);
      if(students.isEmpty())throw new Problem(404,"Student not found");
      execute(c,"INSERT INTO users(username,full_name,password_hash,role,student_id) VALUES(?,?,?,?,?)",username,students.get(0).get("full_name"),Passwords.hash(pw),"STUDENT",sid);
      break;
     }
     case "/student":{
      if(!admin)throw new Problem(403,"Only Admin can manage students");
      String roll=required(b,"roll_no",30),name=required(b,"full_name",100),cl=required(b,"class_name",50);int semester=integer(b,"semester",1,12);int id=optionalId(b,"student_id");
      if(id==0)execute(c,"INSERT INTO students(roll_no,full_name,class_name,semester) VALUES(?,?,?,?)",roll,name,cl,semester);
      else if(execute(c,"UPDATE students SET roll_no=?,full_name=?,class_name=?,semester=? WHERE student_id=?",roll,name,cl,semester,id)==0)throw new Problem(404,"Student not found");break;
     }
     case "/record":saveRecord(c,b,uid);break;
     case "/review":saveReview(c,b,uid);break;
     case "/followup":{
      int id=integer(b,"intervention_id",1,Integer.MAX_VALUE);String outcome=required(b,"outcome",2000),status=choice(b,"status",Set.of("Open","Completed"));
      if(execute(c,"UPDATE interventions SET outcome=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE intervention_id=?",outcome,status,id)==0)throw new Problem(404,"Follow-up not found");break;
     }
     case "/user":{
      if(!admin)throw new Problem(403,"Admin access required");String username=required(b,"username",50);if(!username.matches("[a-zA-Z0-9_.-]{3,50}"))throw new Problem(400,"Username: 3–50 letters, numbers, dots, underscores or hyphens");
      execute(c,"INSERT INTO users(username,full_name,password_hash,role) VALUES(?,?,?,?)",username,required(b,"full_name",100),Passwords.hash(password(b,"password")),"TEACHER");break;
     }
     case "/password":{
      String old=required(b,"current_password",200);List<Map<String,Object>> found=rows(c,"SELECT password_hash FROM users WHERE user_id=?",uid);
      if(!Passwords.verify(old,(String)found.get(0).get("password_hash")))throw new Problem(400,"Current password is incorrect");execute(c,"UPDATE users SET password_hash=? WHERE user_id=?",Passwords.hash(password(b,"new_password")),uid);break;
     }
     default:throw new Problem(404,"Endpoint not found");
    }
    send(res,Map.of("ok",true));
   }
  }catch(Problem e){res.setStatus(e.status);send(res,Map.of("error",e.getMessage()));}
   catch(SQLIntegrityConstraintViolationException e){res.setStatus(400);send(res,Map.of("error","Duplicate roll number/username, student already has a login account, or invalid student reference."));}
   catch(Exception e){getServletContext().log("StudentSuccess request failed",e);res.setStatus(500);send(res,Map.of("error","Server/database error. Check db.properties, import database/01_schema.sql, then check NetBeans Output."));}
 }
 private void register(
        HttpServletRequest req,
        HttpServletResponse res
) throws Exception {

    // Change this code before sharing the application.
    final String collegeAccessCode = "StudentSuccess@2026";

    String key = "register:" + req.getRemoteAddr();
    Attempt attempt = attempts.computeIfAbsent(
            key,
            k -> new Attempt()
    );

    synchronized (attempt) {
        long now = System.currentTimeMillis();

        if (attempt.until > now) {
            throw new Problem(
                    429,
                    "Too many registration attempts. Try again in 5 minutes."
            );
        }

        if (attempt.until > 0) {
            attempt.failures = 0;
            attempt.until = 0;
        }

        JsonObject b = body(req);

        String accessCode = required(b, "access_code", 100);

        if (!collegeAccessCode.equals(accessCode)) {
            attempt.failures++;

            if (attempt.failures >= 5) {
                attempt.until = now + 300000;
            }

            throw new Problem(403, "Incorrect college access code.");
        }

        String fullName = required(b, "full_name", 100);
        String username = required(b, "username", 50);

        if (!username.matches("[a-zA-Z0-9_.-]{3,50}")) {
            throw new Problem(
                    400,
                    "Username must contain 3-50 letters, numbers, dots, underscores or hyphens."
            );
        }

        String newPassword = password(b, "password");
        String confirmation = required(b, "confirm_password", 200);

        if (!newPassword.equals(confirmation)) {
            throw new Problem(400, "Passwords do not match.");
        }

        try (Connection c = DB.open()) {

            if (!rows(
                    c,
                    "SELECT user_id FROM users WHERE username=?",
                    username
            ).isEmpty()) {
                throw new Problem(
                        409,
                        "Username already exists. Choose another username."
                );
            }

            try {
                execute(
                        c,
                        "INSERT INTO users(username,full_name,password_hash,role) VALUES(?,?,?,?)",
                        username,
                        fullName,
                        Passwords.hash(newPassword),
                        "TEACHER"
                );
            } catch (SQLIntegrityConstraintViolationException e) {
                throw new Problem(
                        409,
                        "Username already exists. Choose another username."
                );
            }
        }

        attempt.failures = 0;
        attempt.until = 0;

        res.setStatus(201);
        send(res, Map.of("ok", true));
    }
}
 private void login(HttpServletRequest req,HttpServletResponse res,HttpSession s)throws Exception{
  JsonObject b=body(req);String username=required(b,"username",50),password=required(b,"password",200);String key=req.getRemoteAddr();
  Attempt a=attempts.computeIfAbsent(key,k->new Attempt());synchronized(a){
   long now=System.currentTimeMillis();if(a.until>now)throw new Problem(429,"Too many attempts. Try again in 5 minutes.");if(a.until>0){a.failures=0;a.until=0;}
   try(Connection c=DB.open()){
    List<Map<String,Object>> list=rows(c,"SELECT user_id,username,full_name,role,student_id,password_hash FROM users WHERE username=?",username);
    if(list.isEmpty()||!Passwords.verify(password,(String)list.get(0).get("password_hash"))){a.failures++;if(a.failures>=5)a.until=now+300000;throw new Problem(401,"Incorrect username or password");}
    String portal=optional(b,"portal",20);
    if(!Set.of("student","staff").contains(portal))throw new Problem(400,"Choose Student Login or Teacher / Admin Login.");
    boolean isStudent="STUDENT".equals(list.get(0).get("role"));
    if(isStudent!=portal.equals("student"))throw new Problem(403,isStudent?"Use the Student Login section.":"Use the Teacher / Admin Login section.");
    a.failures=0;a.until=0;Map<String,Object> user=list.get(0);user.remove("password_hash");req.changeSessionId();s.setAttribute("user",user);s.setAttribute("csrf",UUID.randomUUID().toString());send(res,Map.of("user",user,"csrf",s.getAttribute("csrf")));
   }
  }
 }
 private void saveRecord(Connection c,JsonObject b,int uid)throws Exception{
  int sid=integer(b,"student_id",1,Integer.MAX_VALUE);String date=date(b,"record_date",true);if(LocalDate.parse(date).isAfter(LocalDate.now()))throw new Problem(400,"Record date cannot be in the future");
  Double attendance=percent(b,"attendance"),marks=percent(b,"marks");Integer pending=nullableInt(b,"pending_assignments",0,100);
  c.setAutoCommit(false);try{
   if(rows(c,"SELECT student_id FROM students WHERE student_id=? FOR UPDATE",sid).isEmpty())throw new Problem(404,"Student not found");
   List<Map<String,Object>> last=rows(c,"SELECT record_date,marks FROM academic_records WHERE student_id=? ORDER BY record_date DESC,record_id DESC LIMIT 1",sid);
   Double previous=null;if(!last.isEmpty()){if(date.compareTo((String)last.get(0).get("record_date"))<=0)throw new Problem(400,"Use a date after the latest record. One snapshot per student per date.");Object v=last.get(0).get("marks");if(v instanceof Number)previous=((Number)v).doubleValue();}
   List<String> reasons=Signals.reasons(attendance,marks,pending,previous);
   int rid=insert(c,"INSERT INTO academic_records(student_id,record_date,attendance,marks,pending_assignments,entered_by) VALUES(?,?,?,?,?,?)",sid,date,attendance,marks,pending,uid);
   if(!reasons.isEmpty())execute(c,"INSERT INTO alerts(student_id,record_id,reasons,signal_level) VALUES(?,?,?,?)",sid,rid,gson.toJson(reasons),Signals.level(reasons.size()));
   c.commit();
  }catch(Exception e){c.rollback();throw e;}finally{c.setAutoCommit(true);}
 }
 private void saveReview(Connection c,JsonObject b,int uid)throws Exception{
  int aid=integer(b,"alert_id",1,Integer.MAX_VALUE);String status=choice(b,"review_status",Set.of("Needs support","Monitor","Dismissed")),remark=required(b,"remarks",2000),action=optional(b,"action",1000),follow=date(b,"followup_date",false);
  if(status.equals("Needs support")&&(action.isEmpty()||follow==null))throw new Problem(400,"Needs support requires a support action and follow-up date");
  c.setAutoCommit(false);try{
   List<Map<String,Object>> a=rows(c,"SELECT student_id,review_status FROM alerts WHERE alert_id=? FOR UPDATE",aid);if(a.isEmpty())throw new Problem(404,"Alert not found");if(!a.get(0).get("review_status").equals("Pending"))throw new Problem(409,"This alert has already been reviewed. Refresh the list.");
   execute(c,"UPDATE alerts SET review_status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE alert_id=?",status,uid,aid);
   execute(c,"INSERT INTO interventions(student_id,alert_id,teacher_id,decision,remarks,action,followup_date,status) VALUES(?,?,?,?,?,?,?,?)",a.get(0).get("student_id"),aid,uid,status,remark,action,follow,status.equals("Dismissed")?"Completed":"Open");c.commit();
  }catch(Exception e){c.rollback();throw e;}finally{c.setAutoCommit(true);}
 }
 private JsonObject body(HttpServletRequest req)throws IOException{
  StringBuilder sb=new StringBuilder();char[] buf=new char[2048];int n;Reader r=req.getReader();while((n=r.read(buf))!=-1){sb.append(buf,0,n);if(sb.length()>20000)throw new Problem(413,"Request too large");}
  try{return JsonParser.parseString(sb.toString()).getAsJsonObject();}catch(Exception e){throw new Problem(400,"Invalid request body");}
 }
 private static String required(JsonObject b,String k,int max){String v=optional(b,k,max);if(v.isBlank())throw new Problem(400,k+" is required");return v;}
 private static String optional(JsonObject b,String k,int max){if(!b.has(k)||b.get(k).isJsonNull())return "";if(!b.get(k).isJsonPrimitive()||!b.get(k).getAsJsonPrimitive().isString())throw new Problem(400,"Invalid "+k);String v=b.get(k).getAsString().trim();if(v.length()>max)throw new Problem(400,k+" is too long");return v;}
 private static String password(JsonObject b,String k){String p=required(b,k,200);if(p.length()<10)throw new Problem(400,"Password must have at least 10 characters");return p;}
 private static String choice(JsonObject b,String k,Set<String> set){String v=required(b,k,40);if(!set.contains(v))throw new Problem(400,"Invalid "+k);return v;}
 private static int integer(JsonObject b,String k,int min,int max){Integer v=nullableInt(b,k,min,max);if(v==null)throw new Problem(400,k+" is required");return v;}
 private static Integer nullableInt(JsonObject b,String k,int min,int max){if(!b.has(k)||b.get(k).isJsonNull()||b.get(k).getAsString().isBlank())return null;try{String v=b.get(k).getAsString();int n=Integer.parseInt(v);if(n<min||n>max)throw new Exception();return n;}catch(Exception e){throw new Problem(400,"Invalid "+k);}}
 private static int optionalId(JsonObject b,String k){return b.has(k)&&!b.get(k).isJsonNull()?integer(b,k,1,Integer.MAX_VALUE):0;}
 private static int positive(String v){try{int n=Integer.parseInt(v);if(n<1)throw new Exception();return n;}catch(Exception e){throw new Problem(400,"Invalid student ID");}}
 private static Double percent(JsonObject b,String k){if(!b.has(k)||b.get(k).isJsonNull()||b.get(k).getAsString().isBlank())return null;try{double n=b.get(k).getAsDouble();if(!Double.isFinite(n)||n<0||n>100)throw new Exception();return n;}catch(Exception e){throw new Problem(400,k+" must be between 0 and 100");}}
 private static String date(JsonObject b,String k,boolean required){String v=optional(b,k,10);if(v.isEmpty()){if(required)throw new Problem(400,k+" is required");return null;}try{return LocalDate.parse(v).toString();}catch(Exception e){throw new Problem(400,"Invalid "+k);}}
 private void send(HttpServletResponse res,Object value)throws IOException{res.getWriter().write(gson.toJson(value));}
 private static List<Map<String,Object>> rows(Connection c,String sql,Object... args)throws SQLException{
  try(PreparedStatement ps=c.prepareStatement(sql)){bind(ps,args);try(ResultSet rs=ps.executeQuery()){List<Map<String,Object>> list=new ArrayList<>();ResultSetMetaData md=rs.getMetaData();while(rs.next()){Map<String,Object> m=new LinkedHashMap<>();for(int i=1;i<=md.getColumnCount();i++){Object v=rs.getObject(i);if(v instanceof java.sql.Date||v instanceof Timestamp)v=v.toString();m.put(md.getColumnLabel(i),v);}list.add(m);}return list;}}
 }
 private static void bind(PreparedStatement p,Object[] args)throws SQLException{for(int i=0;i<args.length;i++)p.setObject(i+1,args[i]);}
 private static int execute(Connection c,String sql,Object...args)throws SQLException{try(PreparedStatement p=c.prepareStatement(sql)){bind(p,args);return p.executeUpdate();}}
 private static int insert(Connection c,String sql,Object...args)throws SQLException{try(PreparedStatement p=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)){bind(p,args);p.executeUpdate();try(ResultSet r=p.getGeneratedKeys()){r.next();return r.getInt(1);}}}
}
