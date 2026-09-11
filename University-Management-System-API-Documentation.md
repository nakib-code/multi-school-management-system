
# University Management System
## API Documentation

**API Version:** v1  
**Backend:** Node.js + TypeScript + Express.js  
**Database:** PostgreSQL + Prisma ORM  
**Authentication:** JWT Bearer Token  
**Validation:** Zod  
**Payment Gateway:** SSLCommerz  
**OAuth:** Google OAuth 2.0  
**API Documentation:** Postman

---

# 1. API Base URL

### Local Development

```text
http://localhost:5001/api/v1
Production
https://university-management-system-plum-alpha.vercel.app/api/v1

Replace the production URL if the deployed URL changes.

2. Authentication

Protected endpoints use Bearer Token authentication.

Header
Authorization: Bearer <JWT_TOKEN>

Example:

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Public endpoints do not require authentication.

3. Standard API Response
Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
Error Response
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
4. User Roles

The system contains the following roles:

Role	Description
SUPER_ADMIN	Platform-level administration
ADMIN	School administrator
MANAGER	School management staff
TEACHER	Teacher account
STUDENT	Student account
SUPER_ADMIN

SUPER_ADMIN manages the platform-level school lifecycle.

Allowed:

Approve school
Reject school
Block school
Unblock school
Delete school

SUPER_ADMIN cannot access internal school data.

ADMIN

ADMIN manages school-level operations.

Allowed:

Manage students
Manage teachers
Manage admissions
Manage school settings
Confirm cash payments
MANAGER

MANAGER can perform selected school management operations.

Allowed:

View/manage admissions
Manage students
Create teachers
Verify teacher email
Manage admission settings
TEACHER

Teacher access is limited to teacher-related functionality.

STUDENT

Student can access their own student profile.

5. API Versioning

All application APIs use version v1.

Example:

/api/v1/auth/login
/api/v1/schools/:schoolId/students
/api/v1/schools/:schoolId/admissions
6. Health Check
GET /health

Checks whether the API server is running.

Authentication

Public

Request
GET /api/v1/health
Success Response
{
  "success": true,
  "message": "University Management System API is running"
}
7. Authentication APIs
7.1 Login
POST /auth/login

Logs in a registered user using email and password.

Authentication

Public

Request Body
{
  "email": "admin@example.com",
  "password": "Password123"
}
Supported Users
SUPER_ADMIN
ADMIN
MANAGER
TEACHER
STUDENT
Success Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": 1,
      "name": "Test Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "schoolId": 5
    }
  }
}
Possible Errors
400 - Invalid request data
401 - Invalid email or password
403 - Account is not active
403 - School is not active
8. Google Admin Login

Google OAuth is available only for existing ADMIN accounts.

Google login does not create a new ADMIN account.

8.1 Start Google Login
GET /auth/google

Redirects the user to Google's OAuth consent page.

Authentication

Public

Request
GET /api/v1/auth/google
OAuth Scopes
openid
email
profile
8.2 Google OAuth Callback
GET /auth/google/callback

Handles Google's OAuth callback and authenticates an existing ADMIN account.

Authentication

Public

Query Parameter
code=<GOOGLE_AUTHORIZATION_CODE>
Example
GET /api/v1/auth/google/callback?code=AUTHORIZATION_CODE
Security Rules

The backend verifies:

Google authorization code
Google ID token
Google email
Google email verification
Existing user account
User role must be ADMIN
User status must be ACTIVE
User must belong to a school
School status must be ACTIVE
Success Response
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": 6,
      "name": "Test Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "schoolId": 5
    }
  }
}
Possible Errors
400 - Google authorization code is missing
400 - Google ID token not received
400 - Google account email is not verified
404 - No account found with this Google email
403 - Google login is available only for ADMIN accounts
403 - Account is not active
403 - Account is not associated with a school
403 - School is not active
9. School Registration APIs
9.1 Register School
POST /schools/register

Creates a new school registration request.

Authentication

Public

Request Body
{
  "name": "Test School",
  "code": "TEST001",
  "email": "school@example.com",
  "phone": "01700000000",
  "address": "Dhaka, Bangladesh",
  "adminName": "Test Admin",
  "adminEmail": "admin@example.com",
  "adminPhone": "01800000000",
  "adminPassword": "TestAdmin@123"
}
Initial Status
PENDING

The school administrator's email must be verified before the school can be approved.

9.2 Verify Admin Email
POST /schools/verify-admin-email

Verifies the admin email using the OTP/code sent through email.

Authentication

Public

Request Body
{
  "email": "admin@example.com",
  "code": "846587"
}
Success

The admin email becomes verified.

adminEmailVerified = true
10. School Platform Administration

These endpoints are available only to SUPER_ADMIN.

10.1 Approve School
PATCH /schools/:id/approve

Approves a pending school.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Example
PATCH /api/v1/schools/5/approve
Business Rule

The school must satisfy the required verification/registration conditions before approval.

After approval:

School status = ACTIVE

The registered ADMIN account can then be created/activated according to the school approval flow.

10.2 Reject School
PATCH /schools/:id/reject

Rejects a school registration.

Required Role
SUPER_ADMIN
Request Body
{
  "rejectionReason": "Required documents are incomplete"
}
Example
PATCH /api/v1/schools/5/reject
10.3 Block School
PATCH /schools/:id/block

Blocks an active school.

Required Role
SUPER_ADMIN
Example
PATCH /api/v1/schools/5/block
Business Rule

A blocked school cannot normally perform active school operations.

10.4 Unblock School
PATCH /schools/:id/unblock

Restores a blocked school.

Required Role
SUPER_ADMIN
Example
PATCH /api/v1/schools/5/unblock
10.5 Delete School
DELETE /schools/:id

Deletes/deactivates a school according to the application's deletion policy.

Required Role
SUPER_ADMIN
Example
DELETE /api/v1/schools/5
Important

This operation is restricted to the platform-level SUPER_ADMIN.


**এটাই Part 1।**

এরপর একই file-এ **Part 2**-এর নিচে আমি দেব:

- School Settings
- Admission
- Admission Email Verification
- Cash Payment
- SSLCommerz Online Payment
- Payment Success/Fail/Cancel/IPN
- Admission Approve/Reject

আর **Part 3** হবে:

- Student APIs
- Teacher APIs
- RBAC table
- Pagination/Search
- Error codes
- Complete API endpoint table
- Assignment requirement mapping

তোমার দেওয়া route অনুযায়ী **আর ভুল `get-me`, ভুল `/api`, ভুল port বা ভুল method রাখব না।**

# BACKEND_URL=https://university-management-system-plum-alpha.vercel.app

BACKEND_URL=http://localhost:5001 aibar amaon vabe dew jate copy paste korte pai one click

হ্যাঁ, একদম copy-paste করার মতো এভাবে রাখো:

BACKEND_URL=https://university-management-system-plum-alpha.vercel.app

Local development-এর জন্য:

BACKEND_URL=http://localhost:5001
.env-এ একসাথে
BACKEND_URL=https://university-management-system-plum-alpha.vercel.app

আর local .env ব্যবহার করলে:

BACKEND_URL=http://localhost:5001

Important: Production Vercel-এ BACKEND_URL হিসেবে প্রথমটাই দেবে।

documataion ta copy paste akare dew

অবশ্যই। নিচে পুরো documentation copy-paste format-এ দিচ্ছি। তুমি সরাসরি copy করে এই নামে save করবে:

University-Management-System-API-Documentation.md

আমি Part 1, Part 2, Part 3 একসাথে দিলাম। Part 1/2/3 লেখা চাইলে পরে remove করে দিতে পারো।

Part 1/3
# University Management System
## API Documentation

**API Version:** v1  
**Backend:** Node.js + TypeScript + Express.js  
**Database:** PostgreSQL + Prisma ORM  
**Validation:** Zod  
**Authentication:** JWT Bearer Token  
**Payment Gateway:** SSLCommerz  
**Social Login:** Google OAuth 2.0  
**API Testing:** Postman  

---

# 1. Base URL

## Local Development

```text
http://localhost:5001/api/v1
Production
https://university-management-system-plum-alpha.vercel.app/api/v1
2. Authentication

Protected APIs use JWT Bearer Token authentication.

Request Header
Authorization: Bearer <JWT_TOKEN>

Example:

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Public APIs do not require authentication.

3. Standard API Response
Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
Error Response
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
4. User Roles

The system supports the following roles:

Role	Description
SUPER_ADMIN	Platform-level administrator
ADMIN	School administrator
MANAGER	School management staff
TEACHER	Teacher
STUDENT	Student
SUPER_ADMIN

SUPER_ADMIN manages the platform-level school lifecycle.

Permissions:

Approve school
Reject school
Block school
Unblock school
Delete school

SUPER_ADMIN cannot access internal school data.

ADMIN

ADMIN manages school-level operations.

Permissions:

Manage students
Manage teachers
Manage admissions
Manage school settings
Confirm cash payments
MANAGER

MANAGER manages selected school-level operations.

Permissions:

View admissions
Approve/reject admissions
Manage students
Create teachers
Verify teacher email
Manage admission settings
Confirm cash payments
TEACHER

Teacher access is limited to teacher-related functionality.

STUDENT

Students can access their own student profile.

5. API Versioning

All application APIs use /api/v1.

Example:

/api/v1/auth/login
/api/v1/schools/:schoolId/students
/api/v1/schools/:schoolId/admissions
6. Health Check
GET /health

Checks whether the API server is running.

Authentication

Public

Endpoint
GET /api/v1/health
Success Response
{
  "success": true,
  "message": "University Management System API is running"
}
7. Authentication APIs
7.1 Login
POST /auth/login

Logs in users using email and password.

Authentication

Public

Allowed Users
SUPER_ADMIN
ADMIN
MANAGER
TEACHER
STUDENT
Request Body
{
  "email": "admin@example.com",
  "password": "Password123"
}
Success Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": 1,
      "name": "Test Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "schoolId": 5
    }
  }
}
Possible Errors
400 - Invalid request data
401 - Invalid email or password
403 - Account is not active
403 - School is not active
8. Google Admin Login

Google OAuth is available only for existing ADMIN accounts.

Google login does not create a new ADMIN account.

8.1 Start Google Login
GET /auth/google

Redirects the user to Google's OAuth consent page.

Authentication

Public

Endpoint
GET /api/v1/auth/google
OAuth Scopes
openid
email
profile
8.2 Google OAuth Callback
GET /auth/google/callback

Handles the Google OAuth callback.

Authentication

Public

Query Parameter
code=<GOOGLE_AUTHORIZATION_CODE>
Example
GET /api/v1/auth/google/callback?code=AUTHORIZATION_CODE
Security Checks

The backend verifies:

Google authorization code
Google ID token
Google email
Google email verification
Existing user account
User role must be ADMIN
User status must be ACTIVE
User must belong to a school
School status must be ACTIVE
Success Response
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": 6,
      "name": "Test Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "schoolId": 5
    }
  }
}
Possible Errors
400 - Google authorization code is missing
400 - Google ID token not received
400 - Google account email is not verified
404 - No account found with this Google email
403 - Google login is available only for ADMIN accounts
403 - Your account is not active
403 - Your account is not associated with a school
403 - Your school is not active
9. School Registration APIs
9.1 Register School
POST /schools/register

Creates a new school registration request.

Authentication

Public

Endpoint
POST /api/v1/schools/register
Request Body
{
  "name": "Test School",
  "code": "TEST001",
  "email": "school@example.com",
  "phone": "01700000000",
  "address": "Dhaka, Bangladesh",
  "adminName": "Test Admin",
  "adminEmail": "admin@example.com",
  "adminPhone": "01800000000",
  "adminPassword": "TestAdmin@123"
}
Initial School Status
PENDING

The school admin email must be verified before the school can be approved.

9.2 Verify Admin Email
POST /schools/verify-admin-email

Verifies the school administrator's email using an OTP/code.

Authentication

Public

Endpoint
POST /api/v1/schools/verify-admin-email
Request Body
{
  "email": "admin@example.com",
  "code": "846587"
}
Success

The admin email becomes verified.

adminEmailVerified = true
10. School Platform Administration

These endpoints are available only to SUPER_ADMIN.

10.1 Approve School
PATCH /schools/:id/approve

Approves a school registration.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Endpoint
PATCH /api/v1/schools/5/approve
Business Rule

Only an authorized SUPER_ADMIN can approve a school.

10.2 Reject School
PATCH /schools/:id/reject

Rejects a school registration.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Endpoint
PATCH /api/v1/schools/5/reject
Request Body
{
  "rejectionReason": "Required documents are incomplete"
}
10.3 Block School
PATCH /schools/:id/block

Blocks a school.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Endpoint
PATCH /api/v1/schools/5/block
10.4 Unblock School
PATCH /schools/:id/unblock

Unblocks a previously blocked school.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Endpoint
PATCH /api/v1/schools/5/unblock
10.5 Delete School
DELETE /schools/:id

Deletes/deactivates a school according to the application's deletion policy.

Authentication

Bearer Token

Required Role
SUPER_ADMIN
Endpoint
DELETE /api/v1/schools/5
11. School Settings APIs

School settings are available to ADMIN and MANAGER.

11.1 Get Admission Fee
GET /schools/:schoolId/settings/admission-fee

Returns the current admission fee of a school.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
GET /api/v1/schools/5/settings/admission-fee
Success Response
{
  "success": true,
  "message": "Admission fee retrieved successfully",
  "data": {
    "admissionFee": 1000
  }
}
11.2 Update Admission Fee
PATCH /schools/:schoolId/settings/admission-fee

Updates the admission fee.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/settings/admission-fee
Request Body
{
  "admissionFee": 1000
}
Validation

The admission fee must contain a valid numeric value according to the server-side Zod validation rules.

12. Admission APIs

Admissions support online and cash payment methods.

Admission flow:

Student submits admission
        ↓
Email verification
        ↓
Payment
        ↓
Payment becomes PAID
        ↓
ADMIN / MANAGER reviews
        ↓
Approve or Reject
        ↓
If approved → Student account is created
12.1 Create Admission
POST /schools/:schoolId/admissions

Creates a new student admission request.

Authentication

Public

Endpoint
POST /api/v1/schools/5/admissions
Request Body
{
  "studentName": "Payment Test Student",
  "studentEmail": "student@example.com",
  "password": "TestPass123",
  "dateOfBirth": "2010-05-10",
  "gender": "MALE",
  "guardianName": "Test Guardian",
  "guardianPhone": "01700000000",
  "address": "Dhaka",
  "paymentMethod": "ONLINE"
}
Payment Methods
ONLINE
CASH
Initial Admission Status
PENDING
12.2 Verify Student Email
POST /admissions/verify-email

Verifies the student's email using the OTP sent to the student's email.

Authentication

Public

Endpoint
POST /api/v1/admissions/verify-email
Request Body
{
  "email": "student@example.com",
  "code": "123456"
}
Business Rule

The admission cannot proceed normally until the required email verification is completed.

12.3 Get Admission By ID
GET /schools/:schoolId/admissions/:id

Returns a specific admission application.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
School Isolation

The authenticated user's schoolId must match the URL schoolId.

Endpoint
GET /api/v1/schools/5/admissions/3
12.4 Approve Admission
PATCH /schools/:schoolId/admissions/:id/approve

Approves an admission application.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/admissions/3/approve
Important Business Rule

The admission payment must be completed before approval.

Payment Status = PAID

Only after successful approval is the student account/profile created according to the admission workflow.

12.5 Reject Admission
PATCH /schools/:schoolId/admissions/:id/reject

Rejects an admission application.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/admissions/3/reject
Request Body
{
  "rejectionReason": "Required documents are incomplete"
}
13. Admission Payment APIs
13.1 Confirm Cash Payment
PATCH /schools/:schoolId/admissions/:id/payment/confirm-cash

Confirms that a student's admission fee was received in cash at the school.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/admissions/3/payment/confirm-cash
Request Body
{
  "remarks": "Cash payment received at school office"
}
Business Rule

After successful confirmation:

Payment Status = PAID

The admission can then proceed to approval.

13.2 Initiate Online Payment
POST /schools/:schoolId/admissions/:id/payment/online/initiate

Starts an online admission fee payment using SSLCommerz.

Authentication

Currently exposed as a payment initiation endpoint.

Endpoint
POST /api/v1/schools/5/admissions/3/payment/online/initiate
Request Body
No request body required
Payment Gateway
SSLCommerz

The backend creates the payment transaction and returns/redirects the user to the SSLCommerz payment flow.

14. SSLCommerz Callback APIs

These endpoints are called by the SSLCommerz payment flow.

14.1 Payment Success
POST /payments/admission/success

Handles successful admission payment.

Endpoint
POST /api/v1/payments/admission/success
Purpose

The backend verifies/processes the successful payment and updates the admission payment status.

14.2 Payment Fail
POST /payments/admission/fail

Handles failed payment.

Endpoint
POST /api/v1/payments/admission/fail
Purpose

Updates the payment/admission state after a failed transaction.

14.3 Payment Cancel
POST /payments/admission/cancel

Handles a cancelled payment.

Endpoint
POST /api/v1/payments/admission/cancel
14.4 Payment IPN
POST /payments/admission/ipn

Handles SSLCommerz Instant Payment Notification.

Endpoint
POST /api/v1/payments/admission/ipn
Purpose

Provides server-to-server payment status notification.

15. Student APIs

Student management endpoints are school-isolated.

SUPER_ADMIN cannot access these school internal APIs.

15.1 Get My Student Profile
GET /schools/:schoolId/students/me

Returns the currently authenticated student's profile.

Authentication

Bearer Token

Required Role
STUDENT
Endpoint
GET /api/v1/schools/5/students/me
School Isolation

The student's JWT schoolId must match the requested schoolId.

15.2 Get All Students
GET /schools/:schoolId/students

Returns students of a school.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
GET /api/v1/schools/5/students
Pagination
?page=1&limit=10
Search
?search=Test
Combined Example
GET /api/v1/schools/5/students?page=1&limit=10&search=Test
Query Parameters
Parameter	Type	Description
page	number	Page number
limit	number	Number of records
search	string	Search student records
15.3 Get Student By ID
GET /schools/:schoolId/students/:id

Returns a specific student.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
GET /api/v1/schools/5/students/2
15.4 Update Student
PATCH /schools/:schoolId/students/:id

Updates student information.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/students/2
Request Body
{
  "firstName": "Abdullah",
  "lastName": "Rahman",
  "gender": "MALE",
  "phone": "01700000000",
  "address": "Dhaka, Bangladesh"
}
15.5 Deactivate Student
DELETE /schools/:schoolId/students/:id

Deactivates a student.

Authentication

Bearer Token

Required Role
ADMIN
Endpoint
DELETE /api/v1/schools/5/students/2
Important

This endpoint represents a soft deactivation rather than permanently deleting the student record.

The student account becomes inactive according to the application's student deactivation logic.

15.6 Activate Student
PATCH /schools/:schoolId/students/:id/activate

Reactivates a previously deactivated student.

Authentication

Bearer Token

Required Role
ADMIN
Endpoint
PATCH /api/v1/schools/5/students/2/activate
16. Teacher APIs

Teacher management is available to ADMIN and MANAGER.

16.1 Create Teacher
POST /schools/:schoolId/teachers

Creates a teacher account/profile.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
POST /api/v1/schools/5/teachers
Request Body
{
  "name": "Raihan Ahmed",
  "email": "teacher@example.com",
  "password": "password123",
  "employeeId": "EMP-002",
  "firstName": "Raihan",
  "lastName": "Ahmed",
  "phone": "01700000000",
  "address": "Dhaka",
  "designation": "Mathematics Teacher",
  "qualification": "BSc in Mathematics"
}
Teacher Email Verification

The teacher initially requires email verification according to the teacher onboarding flow.

16.2 Verify Teacher Email
PATCH /schools/:schoolId/teachers/:id/verify-email

Verifies the teacher's email using an OTP/code.

Authentication

Bearer Token

Required Roles
ADMIN
MANAGER
Endpoint
PATCH /api/v1/schools/5/teachers/2/verify-email
Request Body
{
  "code": "836954"
}
Business Rule

After successful verification, the teacher account can become active according to the teacher onboarding workflow.

17. School Isolation

School-level APIs use schoolId.

Example:

/api/v1/schools/5/students

The authenticated user's JWT contains:

{
  "userId": 10,
  "role": "ADMIN",
  "schoolId": 5
}

The backend compares:

JWT schoolId
        =
URL schoolId

If they do not match, access is denied.

Response
{
  "success": false,
  "message": "You do not have access to this school"
}

SUPER_ADMIN is explicitly prevented from accessing school internal data through school-isolation middleware.

18. Role-Based Access Control
Endpoint	SUPER_ADMIN	ADMIN	MANAGER	TEACHER	STUDENT
Register School	No	No	No	No	No
Verify Admin Email	Public	Public	Public	Public	Public
Approve School	Yes	No	No	No	No
Reject School	Yes	No	No	No	No
Block School	Yes	No	No	No	No
Unblock School	Yes	No	No	No	No
Delete School	Yes	No	No	No	No
Get Admission	No	Yes	Yes	No	No
Approve Admission	No	Yes	Yes	No	No
Reject Admission	No	Yes	Yes	No	No
Confirm Cash Payment	No	Yes	Yes	No	No
Get Admission Fee	No	Yes	Yes	No	No
Update Admission Fee	No	Yes	Yes	No	No
List Students	No	Yes	Yes	No	No
Get Student	No	Yes	Yes	No	No
Update Student	No	Yes	Yes	No	No
Deactivate Student	No	Yes	No	No	No
Activate Student	No	Yes	No	No	No
My Student Profile	No	No	No	No	Yes
Create Teacher	No	Yes	Yes	No	No
Verify Teacher Email	No	Yes	Yes	No	No
Google Login	No	Yes	No	No	No
19. Validation

The backend uses Zod for server-side request validation.

Validation is applied to applicable:

Request bodies
Query parameters
Email verification requests
School registration
Admission creation
Admission rejection
Payment confirmation
Student-related inputs
Teacher creation
Teacher email verification
School settings

Invalid input is rejected before reaching the controller/business logic.

20. Pagination and Search

Student listing supports pagination and search.

Example
GET /api/v1/schools/5/students?page=1&limit=10&search=Abdullah
Parameters
page
limit
search

This demonstrates the required list API functionality:

Pagination
Search
Server-side filtering
Controlled result size
21. Payment Flow

The admission payment system supports:

ONLINE
CASH
Online Payment Flow
Create Admission
       ↓
Select ONLINE
       ↓
Initiate SSLCommerz
       ↓
SSLCommerz Payment Page
       ↓
Payment Success / Fail / Cancel
       ↓
Backend Payment Verification
       ↓
Payment Status Updated
       ↓
ADMIN / MANAGER Reviews Admission
       ↓
Approve Admission
Cash Payment Flow
Create Admission
       ↓
Select CASH
       ↓
Student pays at school
       ↓
ADMIN / MANAGER confirms cash
       ↓
Payment Status = PAID
       ↓
ADMIN / MANAGER approves admission

Admission approval requires successful payment according to the application's business rules.

22. Error Handling

The backend uses centralized error handling.

Common HTTP status codes:

Status	Meaning
200	Successful request
201	Resource created
400	Bad request / validation error
401	Authentication required / invalid token
403	Permission denied
404	Resource not found
409	Conflict
500	Internal server error
23. Security

The backend implements multiple security practices:

JWT authentication
Role-based authorization
School-level data isolation
Password hashing
Google OAuth verification
Email verification
Server-side Zod validation
Protected private routes
Centralized error handling
CORS
Helmet
Rate limiting
Secure payment verification
Soft deactivation for student records
24. API Endpoint Summary
#	Method	Endpoint	Access
1	GET	/health	Public
2	POST	/auth/login	Public
3	GET	/auth/google	Public
4	GET	/auth/google/callback	Public
5	POST	/schools/register	Public
6	POST	/schools/verify-admin-email	Public
7	PATCH	/schools/:id/approve	SUPER_ADMIN
8	PATCH	/schools/:id/reject	SUPER_ADMIN
9	PATCH	/schools/:id/block	SUPER_ADMIN
10	PATCH	/schools/:id/unblock	SUPER_ADMIN
11	DELETE	/schools/:id	SUPER_ADMIN
12	GET	/schools/:schoolId/settings/admission-fee	ADMIN/MANAGER
13	PATCH	/schools/:schoolId/settings/admission-fee	ADMIN/MANAGER
14	POST	/schools/:schoolId/admissions	Public
15	POST	/admissions/verify-email	Public
16	GET	/schools/:schoolId/admissions/:id	ADMIN/MANAGER
17	PATCH	/schools/:schoolId/admissions/:id/approve	ADMIN/MANAGER
18	PATCH	/schools/:schoolId/admissions/:id/reject	ADMIN/MANAGER
19	PATCH	/schools/:schoolId/admissions/:id/payment/confirm-cash	ADMIN/MANAGER
20	POST	/schools/:schoolId/admissions/:id/payment/online/initiate	Payment Flow
21	POST	/payments/admission/success	SSLCommerz
22	POST	/payments/admission/fail	SSLCommerz
23	POST	/payments/admission/cancel	SSLCommerz
24	POST	/payments/admission/ipn	SSLCommerz
25	GET	/schools/:schoolId/students/me	STUDENT
26	GET	/schools/:schoolId/students	ADMIN/MANAGER
27	GET	/schools/:schoolId/students/:id	ADMIN/MANAGER
28	PATCH	/schools/:schoolId/students/:id	ADMIN/MANAGER
29	DELETE	/schools/:schoolId/students/:id	ADMIN
30	PATCH	/schools/:schoolId/students/:id/activate	ADMIN
31	POST	/schools/:schoolId/teachers	ADMIN/MANAGER
32	PATCH	/schools/:schoolId/teachers/:id/verify-email	ADMIN/MANAGER
25. Assignment Requirement Mapping
Requirement	Implementation
Node.js	Yes
TypeScript	Yes
Express.js	Yes
PostgreSQL	Yes
Prisma ORM	Yes
Zod Validation	Yes
JWT Authentication	Yes
Google Social Login	Yes
Role-Based Access Control	Yes
Three+ distinct roles	Yes
API Versioning	/api/v1
Payment Gateway	SSLCommerz
Pagination	Student list
Search	Student list
School Data Isolation	Yes
Email Verification	Yes
Password Hashing	Yes
Helmet	Yes
CORS	Yes
Rate Limiting	Yes
Soft Deactivation	Student
Audit Logging	Implemented for critical actions
Postman API Testing	Yes
Live Deployment	Vercel
RESTful API	Yes
26. Postman Testing

Recommended Postman variables:

baseUrl
token
schoolId
studentId
teacherId
admissionId

Example:

baseUrl = http://localhost:5001/api/v1

Production:

baseUrl = https://university-management-system-plum-alpha.vercel.app/api/v1

Example request:

GET {{baseUrl}}/schools/{{schoolId}}/students

Authorization:

Authorization: Bearer {{token}}
27. Recommended Testing Order

For a complete demonstration, use the following order:

Health Check
SUPER_ADMIN Login
Register School
Verify Admin Email
Approve School
ADMIN Login
Configure Admission Fee
Create Admission
Verify Student Email
Initiate SSLCommerz Payment
Complete Payment
Approve Admission
Login as Student
View Student Profile
List Students
Search Students
Update Student
Deactivate Student
Activate Student
Create Teacher
Verify Teacher Email
28. Important Business Rules
School
New schools start with PENDING status.
Admin email must be verified.
Only SUPER_ADMIN can approve/reject/block/unblock/delete schools.
SUPER_ADMIN cannot access internal school data.
Authentication
Password authentication is available for supported user roles.
Google OAuth is available only for existing ADMIN accounts.
Google email must be verified.
User and school must be ACTIVE for ADMIN Google login.
Admission
Admission is created before payment.
Admission supports ONLINE and CASH payment.
Online payment uses SSLCommerz.
Cash payment must be confirmed by ADMIN/MANAGER.
Admission approval requires successful payment.
Approved admission creates the student account/profile according to the admission workflow.
Student
Student data is isolated by school.
ADMIN and MANAGER can manage students.
Only ADMIN can deactivate/reactivate students.
Students can access their own profile.
Teacher
ADMIN/MANAGER can create teachers.
Teacher email verification is required during onboarding.
29. Production API

Production API base URL:

https://university-management-system-plum-alpha.vercel.app/api/v1

Example:

GET https://university-management-system-plum-alpha.vercel.app/api/v1/health

Expected response:

{
  "success": true,
  "message": "University Management System API is running"
}
30. Conclusion

The University Management System backend provides a multi-school architecture with:

Secure authentication
Role-based authorization
School-level isolation
School registration and approval
Student admission workflow
Email verification
Online payment through SSLCommerz
Cash payment confirmation
Student management
Teacher onboarding
Google Admin Login
Pagination and search
Server-side validation
Centralized error handling
API versioning
Production deployment

The API is designed to demonstrate secure, scalable and maintainable backend development using Node.js, TypeScript, Express.js, PostgreSQL and Prisma.

