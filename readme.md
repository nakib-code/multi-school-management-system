==================================================
SCHOOL MANAGEMENT SYSTEM — COMPLETED API DOCUMENT
==================================================

Base URL:
http://localhost:5000/api


==================================================
1. HEALTH CHECK
==================================================

GET /health

Auth:
No authentication required.

Response:

{
  "success": true,
  "message": "School Management System API is running"
}


==================================================
2. AUTHENTICATION
==================================================

POST /auth/login

Auth:
No authentication required.

Body:

{
  "email": "admin@example.com",
  "password": "your-password"
}

Used for:
- SUPER_ADMIN
- ADMIN
- MANAGER
- TEACHER
- STUDENT

Successful login returns:
- User information
- JWT token
- schoolId when applicable


==================================================
3. SCHOOL REGISTRATION
==================================================

POST /schools/register

Auth:
No authentication required.

Body:

{
  "name": "Example School",
  "code": "SCH001",
  "email": "school@example.com",
  "phone": "01700000000",
  "address": "Dhaka, Bangladesh",
  "logo": "https://example.com/logo.png",

  "adminName": "School Admin",
  "adminEmail": "admin@example.com",
  "adminPhone": "01700000000",
  "adminPassword": "StrongPassword123"
}

Initial School Status:

PENDING

Important:
- Admin account is NOT created during registration.
- Admin password is securely hashed and stored with the pending school.
- Verification code is stored in Redis.
- Verification code expires after 10 minutes.
- Verification email is sent through SMTP.


==================================================
4. VERIFY SCHOOL ADMIN EMAIL
==================================================

POST /schools/verify-admin-email

Auth:
No authentication required.

Body:

{
  "email": "admin@example.com",
  "code": "123456"
}

Verification:
- OTP is checked from Redis.
- OTP expires after 10 minutes.
- If correct, adminEmailVerified becomes true.

Successful Response:

{
  "success": true,
  "message": "Admin email verified successfully",
  "data": {
    "schoolId": 5,
    "adminEmail": "admin@example.com",
    "emailVerified": true
  }
}


==================================================
5. SUPER ADMIN — APPROVE SCHOOL
==================================================

PATCH /schools/:id/approve

Example:

PATCH /schools/5/approve

Auth:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Role:
SUPER_ADMIN only.

Requirements:
- School must be PENDING.
- Admin email must be verified.
- Admin information must exist.

After approval:

PENDING
   ↓
ACTIVE

Then:
- School becomes ACTIVE.
- ADMIN user account is created.
- Registration password is used.
- ADMIN user gets schoolId.
- mustChangePassword = false.


==================================================
6. SUPER ADMIN — REJECT SCHOOL
==================================================

PATCH /schools/:id/reject

Example:

PATCH /schools/6/reject

Auth:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Role:
SUPER_ADMIN only.

Body:

{
  "rejectionReason": "Required documents were not provided."
}

Status flow:

PENDING
   ↓
REJECTED

Only PENDING schools can be rejected.


==================================================
7. SUPER ADMIN — BLOCK SCHOOL
==================================================

PATCH /schools/:id/block

Example:

PATCH /schools/5/block

Auth:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Role:
SUPER_ADMIN only.

Status flow:

ACTIVE
   ↓
BLOCKED

Only ACTIVE schools can be blocked.

Effect:
- School becomes BLOCKED.
- School users cannot login because their school is not ACTIVE.


==================================================
8. SUPER ADMIN — UNBLOCK SCHOOL
==================================================

PATCH /schools/:id/unblock

Example:

PATCH /schools/5/unblock

Auth:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Role:
SUPER_ADMIN only.

Status flow:

BLOCKED
   ↓
ACTIVE

Only BLOCKED schools can be unblocked.


==================================================
9. SUPER ADMIN — DELETE REJECTED SCHOOL
==================================================

DELETE /schools/:id

Example:

DELETE /schools/6

Auth:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Role:
SUPER_ADMIN only.

Rule:

Only REJECTED schools can be deleted.

Status flow:

REJECTED
   ↓
DELETED

If the school is ACTIVE, BLOCKED or PENDING,
the delete request will be rejected.


==================================================
10. SCHOOL STATUS
==================================================

Available statuses:

PENDING
ACTIVE
REJECTED
BLOCKED


Status Flow:

              ┌──────────────┐
              │    PENDING   │
              └──────┬───────┘
                     │
             Admin Email Verify
                     │
             SUPER_ADMIN Approve
                     ↓
              ┌──────────────┐
              │    ACTIVE    │
              └──────┬───────┘
                     │
                  Block
                     ↓
              ┌──────────────┐
              │   BLOCKED    │
              └──────┬───────┘
                     │
                  Unblock
                     ↓
              ┌──────────────┐
              │    ACTIVE    │
              └──────────────┘


PENDING
   │
   └── SUPER_ADMIN Reject
              ↓
          REJECTED
              │
              └── Delete
                    ↓
                  DELETED


==================================================
11. USER ROLES
==================================================

SUPER_ADMIN
ADMIN
MANAGER
TEACHER
STUDENT


==================================================
12. SUPER_ADMIN PERMISSION
==================================================

SUPER_ADMIN can:

✓ Approve school
✓ Reject school
✓ Block school
✓ Unblock school
✓ Delete rejected school

SUPER_ADMIN CANNOT access:

✗ Students
✗ Teachers
✗ Managers
✗ Attendance
✗ Exams
✗ Results
✗ Student Fees
✗ Student Payments
✗ Teacher Salaries
✗ Salary Payments
✗ Other school internal data


==================================================
13. SCHOOL USER PERMISSION
==================================================

ADMIN
MANAGER
TEACHER
STUDENT

All school-level users are connected to a school
through:

schoolId


Example JWT:

{
  "userId": 6,
  "role": "ADMIN",
  "schoolId": 5
}


==================================================
14. SCHOOL ISOLATION
==================================================

School users can access ONLY their own school.

Example:

User schoolId:

5

Request:

GET /api/schools/5/students

Result:
✓ Allowed


But:

GET /api/schools/6/students

Result:
✗ Forbidden

Because the user's schoolId is 5.


Security middleware:

requireSchoolAccess


It checks:

JWT schoolId
      VS
URL schoolId

If they don't match:

403 Forbidden


==================================================
15. AUTHENTICATION HEADER
==================================================

For protected APIs:

Authorization: Bearer <TOKEN>


Example:

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...


Protected roles are checked using:

authenticate
authorize


Example:

authenticate
    ↓
authorize(SUPER_ADMIN)
    ↓
Controller


==================================================
16. CURRENT COMPLETED API LIST
==================================================

1. GET    /api/health

2. POST   /api/auth/login

3. POST   /api/schools/register

4. POST   /api/schools/verify-admin-email

5. PATCH  /api/schools/:id/approve

6. PATCH  /api/schools/:id/reject

7. PATCH  /api/schools/:id/block

8. PATCH  /api/schools/:id/unblock

9. DELETE /api/schools/:id


==================================================
17. CURRENT BACKEND FEATURES COMPLETED
==================================================

✓ PostgreSQL
✓ Prisma ORM
✓ Prisma 7
✓ Neon Database
✓ TypeScript
✓ Express.js
✓ JWT Authentication
✓ Role-Based Authorization
✓ Password Hashing
✓ Redis
✓ Redis OTP Storage
✓ SMTP Email
✓ Admin Email Verification
✓ School Registration
✓ School Approval
✓ School Rejection
✓ School Blocking
✓ School Unblocking
✓ Rejected School Deletion
✓ School Status Management
✓ schoolId-based Isolation
✓ SUPER_ADMIN Platform-Level Access


==================================================
18. IMPORTANT SECURITY RULE
==================================================

SUPER_ADMIN is a PLATFORM-LEVEL user.

SUPER_ADMIN does NOT belong to any school.

Therefore:

SUPER_ADMIN schoolId = null


School-level users have:

ADMIN      → schoolId required
MANAGER    → schoolId required
TEACHER    → schoolId required
STUDENT    → schoolId required


==================================================
END
==================================================