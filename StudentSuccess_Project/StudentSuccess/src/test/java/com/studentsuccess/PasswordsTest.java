package com.studentsuccess;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PasswordsTest {
 @Test void saltedAndVerifiable()throws Exception{String a=Passwords.hash("Password@123"),b=Passwords.hash("Password@123");assertNotEquals(a,b);assertTrue(Passwords.verify("Password@123",a));assertFalse(Passwords.verify("Wrong@123",a));}
}
