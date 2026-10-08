package com.studentsuccess;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.util.Base64;
public final class Passwords {
 private static final int ITERATIONS=210000;
 private Passwords() {}
 public static String hash(String password) throws Exception {
  byte[] salt=new byte[16];new SecureRandom().nextBytes(salt);
  return ITERATIONS+":"+Base64.getEncoder().encodeToString(salt)+":"+Base64.getEncoder().encodeToString(derive(password,salt,ITERATIONS));
 }
 public static boolean verify(String password,String stored) throws Exception {
  String[] a=stored.split(":"); if(a.length!=3)return false;
  return MessageDigest.isEqual(Base64.getDecoder().decode(a[2]),derive(password,Base64.getDecoder().decode(a[1]),Integer.parseInt(a[0])));
 }
 private static byte[] derive(String p,byte[] salt,int n)throws Exception{
  PBEKeySpec spec=new PBEKeySpec(p.toCharArray(),salt,n,256);
  try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}
 }
}
