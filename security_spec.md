# Security Specification for JizPI IT Park Platform

## Data Invariants
1. A student can only view their own attendance, grades, and submissions.
2. A staff member can only manage (mark attendance, give grades) for courses they are assigned to (or all if specified, but let's keep it course-based).
3. The director (`direktor@gmail.com`) has full read/write access to all collections to manage the system.
4. Users cannot change their own `role` or `email` after registration (except director).
5. All IDs must be valid alphanumeric strings.

## The Dirty Dozen Payloads (to be rejected)
1. **Role Escalation**: Registered student tries to update their role to 'director'.
2. **Attendance Forgery**: Student tries to mark themselves as 'present' for a date.
3. **Grade Manipulation**: Student tries to update their own grade on a submission.
4. **Course Deletion**: Staff member tries to delete a course created by the director.
5. **ID Poisoning**: Requesting a document with an ID that is a 2MB string.
6. **Cross-User Data Leak**: Student 'A' tries to 'get' Student 'B's submission.
7. **Bypassing App Logic**: Creating a submission without a valid `homeworkId`.
8. **Shadow Field Injection**: Adding an `isVerified: true` field to a User profile during creation.
9. **Timestamp Spoofing**: Setting `createdAt` to a future date in the client payload.
10. **Orphaned Attendance**: Marking attendance for a `courseId` that doesn't exist.
11. **Bulk Scrape**: Unauthenticated user trying to 'list' all users.
12. **Status Shortcutting**: Setting a submission grade before it's even been reviewed by staff.

## Test Runner (Logic)
The `firestore.rules` will be tested using standard Firebase Emulator rules logic (simulated in `firestore.rules.test.ts`).

1. `get` user profile: Allowed if `request.auth.uid == userId` OR `isAdmin()`.
2. `list` courses: Allowed for all signed-in users.
3. `write` attendance: Allowed for `role == 'staff'` or `role == 'director'`.
4. `write` submissions: Allowed for `role == 'student'` where `request.auth.uid == studentId`.
