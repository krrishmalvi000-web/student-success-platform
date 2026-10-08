package com.studentsuccess;
import java.util.*;
public final class Signals {
 private Signals() {}
 public static List<String> reasons(Double attendance,Double marks,Integer pending,Double previousMarks){
  List<String> r=new ArrayList<>();
  if(attendance!=null&&attendance<75)r.add("Attendance below 75% ("+attendance+"%)");
  if(marks!=null&&marks<40)r.add("Marks below 40% ("+marks+"%)");
  if(pending!=null&&pending>=2)r.add(pending+" overdue assignments");
  if(marks!=null&&previousMarks!=null&&previousMarks-marks>=15)r.add("Marks dropped by "+Math.round((previousMarks-marks)*10.0)/10.0+" percentage points");
  return r;
 }
 public static String level(int count){return count>=2?"Priority review":count==1?"Monitor":"No signal";}
}
