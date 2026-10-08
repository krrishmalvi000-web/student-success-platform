package com.studentsuccess;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class SignalsTest {
 @Test void missingIsNotFailure(){assertTrue(Signals.reasons(null,null,null,null).isEmpty());}
 @Test void thresholdBoundaries(){assertTrue(Signals.reasons(75.0,40.0,1,54.0).isEmpty());assertEquals(4,Signals.reasons(74.9,39.9,2,54.9).size());}
 @Test void declineNeedsPreviousRecord(){assertEquals(1,Signals.reasons(90.0,60.0,0,75.0).size());assertTrue(Signals.reasons(90.0,60.0,0,null).isEmpty());}
 @Test void levelIsReviewPriority(){assertEquals("Priority review",Signals.level(2));assertEquals("No signal",Signals.level(0));}
}
