# University Management System API

A production-oriented REST API for managing schools, users, admissions, students, teachers, authentication, school settings, and admission payments.

Built with **Node.js, TypeScript, Express.js, PostgreSQL, Prisma, Zod, Redis, JWT, Google OAuth, and SSLCommerz**.

> **Project Type:** Backend API  
> **API Version:** v1  
> **Architecture:** Modular REST API  
> **Database:** PostgreSQL  
> **Deployment:** Vercel

---

## ✨ Features

- Multi-school management system
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Google OAuth login for Admin
- School registration and approval workflow
- Admin email verification with OTP
- Student admission system
- Online admission payment with SSLCommerz
- Cash payment confirmation
- Student management
- Teacher management
- School admission-fee settings
- Pagination and search
- Zod request validation
- Centralized error handling
- Consistent API response format
- Redis integration
- PostgreSQL with Prisma ORM
- API versioning with `/api/v1`
- School-level data isolation
- Soft deactivation for student accounts
- Production deployment

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Type Safety |
| Express.js | REST API Framework |
| PostgreSQL | Database |
| Prisma | ORM |
| Zod | Request Validation |
| JWT | Authentication |
| Google OAuth | Admin Social Login |
| Redis | OTP / Cache Support |
| SMTP | Email Service |
| SSLCommerz | Payment Gateway |
| Helmet | Security Headers |
| CORS | Cross-Origin Access |
| Rate Limiting | API Protection |
| Biome | Formatting & Linting |
| tsup | Production Build |
| Vercel | Deployment |
| Postman | API Testing |

---

## 🏗️ Architecture

The project follows a modular backend architecture.

```text
src/
├── config/
│   ├── env.ts
│   └── ...
│
├── lib/
│   ├── prisma.ts
│   ├── redis.ts
│   └── ...
│
├── middleware/
│   ├── auth.ts
│   ├── schoolAccess.ts
│   ├── validateRequest.ts
│   ├── errorHandler.ts
│   └── notFound.ts
│
├── modules/
│   ├── auth/
│   ├── admission/
│   ├── payment/
│   ├── school/
│   ├── schoolSetting/
│   ├── student/
│   └── teacher/
│
├── utils/
│   ├── appError.ts
│   ├── jwt.ts
│   └── sendResponse.ts
│
├── generated/
│   └── prisma/
│
├── app.ts
└── server.ts

Each feature is separated into its own module to keep the codebase maintainable and scalable.

🔐 Authentication & Authorization

The API uses JWT authentication with Bearer tokens.

Protected endpoints require:

Authorization: Bearer <JWT_TOKEN>
User Roles
SUPER_ADMIN
ADMIN
MANAGER
TEACHER
STUDENT
GUARDIAN

The primary application workflow uses:

SUPER_ADMIN
ADMIN
MANAGER
TEACHER
STUDENT
Role Responsibilities
Role	Responsibility
SUPER_ADMIN	Platform-level school management
ADMIN	Full school administration
MANAGER	School operational management
TEACHER	Teacher-related operations
STUDENT	Student self-service
🏫 Multi-School Architecture

The system is designed as a multi-school platform.

School-level data is associated with:

schoolId

Every protected school request verifies that the authenticated user belongs to the requested school.

Example:

GET /api/v1/schools/:schoolId/students

This prevents users from accessing another school's internal data.

SUPER_ADMIN Isolation

SUPER_ADMIN manages schools at the platform level but cannot access school internal data through school-level endpoints.

🔄 Core Business Workflows
1. School Registration
School Registration
        ↓
Admin Email Verification
        ↓
SUPER_ADMIN Review
        ↓
Approve / Reject
        ↓
ADMIN Account Creation
        ↓
Admin Login
2. Student Admission
Public Admission
        ↓
Email Verification
        ↓
Payment
   ┌────┴────┐
   │         │
 ONLINE     CASH
   │         │
SSLCommerz  School Confirmation
   │         │
   └────┬────┘
        ↓
Payment PAID
        ↓
ADMIN / MANAGER Approval
        ↓
Student User + Student Profile

An admission cannot be approved until the required payment is marked as PAID.

3. Teacher Onboarding
ADMIN / MANAGER Creates Teacher
        ↓
Teacher User Created
        ↓
Email Verification
        ↓
User Becomes ACTIVE
        ↓
Teacher Login
💳 Payment System

Admission payments are handled using SSLCommerz.

Supported payment states:

PENDING
PAID
FAILED
CANCELLED
Online Payment Flow
Admission
   ↓
Payment Initiation
   ↓
SSLCommerz
   ↓
Success / Fail / Cancel / IPN
   ↓
Backend Verification
   ↓
Payment Status Update
Cash Payment Flow
Admission
   ↓
CASH selected
   ↓
Payment remains PENDING
   ↓
ADMIN / MANAGER confirms cash
   ↓
Payment becomes PAID
📡 API Versioning

All application APIs use:

/api/v1

Example:

GET /api/v1/health

API versioning allows future versions to be introduced without breaking existing clients.

🌐 Base URLs
Local Development
http://localhost:5001
Production
https://university-management-system-plum-alpha.vercel.app
API Base Path
/api/v1

Production example:

https://university-management-system-plum-alpha.vercel.app/api/v1/health
📚 API Endpoints
❤️ Health Check
GET /api/v1/health
🔑 Authentication
Login
POST /api/v1/auth/login
Google Login
GET /api/v1/auth/google
Google Callback
GET /api/v1/auth/google/callback

Google login is available only for existing active ADMIN accounts.

🏫 School APIs
Register School
POST /api/v1/schools/register
Verify Admin Email
POST /api/v1/schools/verify-admin-email
Approve School
PATCH /api/v1/schools/:id/approve
Block School
PATCH /api/v1/schools/:id/block
Unblock School
PATCH /api/v1/schools/:id/unblock
Reject School
PATCH /api/v1/schools/:id/reject
Delete School
DELETE /api/v1/schools/:id

School lifecycle operations are restricted to SUPER_ADMIN.

⚙️ School Settings APIs
Get Admission Fee
GET /api/v1/schools/:schoolId/settings/admission-fee
Update Admission Fee
PATCH /api/v1/schools/:schoolId/settings/admission-fee

Allowed roles:

ADMIN
MANAGER
🎓 Admission APIs
Create Admission
POST /api/v1/schools/:schoolId/admissions
Verify Student Email
POST /api/v1/admissions/verify-email
Get Admission
GET /api/v1/schools/:schoolId/admissions/:id
Approve Admission
PATCH /api/v1/schools/:schoolId/admissions/:id/approve
Reject Admission
PATCH /api/v1/schools/:schoolId/admissions/:id/reject
Confirm Cash Payment
PATCH /api/v1/schools/:schoolId/admissions/:id/payment/confirm-cash
Initiate Online Payment
POST /api/v1/schools/:schoolId/admissions/:id/payment/online/initiate
💰 Payment Callback APIs

These endpoints are used by the payment gateway.

Payment Success
POST /api/v1/payments/admission/success
Payment Failed
POST /api/v1/payments/admission/fail
Payment Cancelled
POST /api/v1/payments/admission/cancel
Payment IPN
POST /api/v1/payments/admission/ipn

These endpoints are public because the payment gateway needs to call them.

👨‍🎓 Student APIs
Get My Profile
GET /api/v1/schools/:schoolId/students/me

Allowed role:

STUDENT
Get All Students
GET /api/v1/schools/:schoolId/students
Get Student
GET /api/v1/schools/:schoolId/students/:id
Update Student
PATCH /api/v1/schools/:schoolId/students/:id
Deactivate Student
DELETE /api/v1/schools/:schoolId/students/:id
Activate Student
PATCH /api/v1/schools/:schoolId/students/:id/activate

Student deletion is implemented as soft deactivation instead of permanently deleting the record.

👨‍🏫 Teacher APIs
Create Teacher
POST /api/v1/schools/:schoolId/teachers
Verify Teacher Email
PATCH /api/v1/schools/:schoolId/teachers/:id/verify-email

Teacher creation is available to:

ADMIN
MANAGER
📦 API Response Format

All APIs follow a consistent JSON response structure.

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
🔎 Pagination & Search

Student listing supports pagination and search.

Example:

GET /api/v1/schools/5/students?page=1&limit=10&search=nakib

Supported query parameters:

Parameter	Description
page	Page number
limit	Records per page
search	Search keyword

Maximum limit:

100
✅ Request Validation

Request validation is handled using Zod.

Validation flow:

Client Request
      ↓
Zod Validation
      ↓
Controller
      ↓
Service
      ↓
Database

Invalid requests are rejected before business logic is executed.

🗄️ Database

The project uses:

PostgreSQL
+
Prisma ORM

Major entities include:

School
User
Student
Teacher
Manager
Admission
AdmissionPayment
SchoolSetting
Attendance
Exam
Result
StudentFee
StudentPayment
TeacherSalary
SalaryPayment
AuditLog

School-level entities are associated with schoolId.

🧹 Soft Deactivation

Student records are not permanently deleted.

Instead:

Student.isActive = false
User.status = INACTIVE

This preserves historical information and avoids accidental data loss.

⚙️ Environment Variables

Create a .env file in the project root.

NODE_ENV=development
PORT=5001

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_jwt_secret

REDIS_USER=your_redis_user
REDIS_PASSWORD=your_redis_password
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port

SMTP_USER=your_smtp_user
EMAIL_SENDER=your_sender_email
SMTP_PASSWORD=your_smtp_password

SSLCZ_STORE_ID=your_sslcommerz_store_id
SSLCZ_STORE_PASSWORD=your_sslcommerz_store_password
SSLCZ_IS_LIVE=false

BACKEND_URL=http://localhost:5001

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback

Production:

BACKEND_URL=https://university-management-system-plum-alpha.vercel.app

Never commit .env or any secret credentials to GitHub.

🚀 Getting Started
1. Clone the repository
git clone <YOUR_REPOSITORY_URL>
cd university-management-system
2. Install dependencies
npm install
3. Configure Environment Variables

Create:

.env

and add all required credentials.

4. Generate Prisma Client
npx prisma generate
5. Run Database Migration
npx prisma migrate dev
6. Start Development Server
npm run dev

Server:

http://localhost:5001
🏭 Production Build

Build the project:

npm run build

Start production server:

npm start
🧹 Code Quality
Format
npm run format:fix
Lint
npm run lint:fix
Full Check
npm run check
🧪 API Testing

Recommended tools:

Postman
Thunder Client
Insomnia
cURL

Recommended testing sequence:

1. Health Check
2. School Registration
3. Admin Email Verification
4. SUPER_ADMIN Login
5. School Approval
6. Admin Login
7. Google Admin Login
8. School Settings
9. Student Admission
10. Student Email Verification
11. Admission Payment
12. Admission Approval
13. Student APIs
14. Teacher APIs
🔑 Login Example

Endpoint:

POST /api/v1/auth/login

Request:

{
  "email": "admin@example.com",
  "password": "your-password"
}

After login, use the returned token:

Authorization: Bearer <TOKEN>
🔐 Security

The backend follows common API security practices:

JWT authentication
Role-Based Access Control
School-level authorization
Password hashing
Zod validation
Helmet security headers
CORS configuration
Rate limiting
Environment-based secrets
Soft deletion/deactivation
Protected private routes
Restricted Google OAuth access
Secure payment workflow
Prisma parameterized queries
📖 API Documentation

Detailed API documentation is available in:

University-Management-System-API-Documentation.md

The documentation includes:

API endpoints
HTTP methods
Authentication requirements
Role permissions
Request bodies
Query parameters
Response examples
Business rules
Payment workflow
Testing flow
📁 Project Structure
university-management-system/
│
├── prisma/
│   ├── schema/
│   └── migrations/
│
├── src/
│   ├── config/
│   ├── generated/
│   ├── lib/
│   ├── middleware/
│   ├── modules/
│   │   ├── admission/
│   │   ├── auth/
│   │   ├── payment/
│   │   ├── school/
│   │   ├── schoolSetting/
│   │   ├── student/
│   │   └── teacher/
│   ├── utils/
│   ├── app.ts
│   ├── server.ts
│   └── seed.ts
│
├── .env
├── .gitignore
├── biome.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── tsup.config.ts
└── vercel.json
🎯 Project Requirements Coverage
Requirement	Status
Node.js + TypeScript	✅
Express.js	✅
PostgreSQL	✅
Prisma ORM	✅
Zod Validation	✅
JWT Authentication	✅
Google Social Login	✅
Role-Based Authorization	✅
Multi-School Isolation	✅
API Versioning	✅
Admission Workflow	✅
SSLCommerz Payment	✅
Redis Integration	✅
Pagination	✅
Search	✅
Soft Deactivation	✅
Consistent API Response	✅
API Documentation	✅
Production Deployment	✅
🌍 Deployment

The API is deployed on Vercel.

Production:

https://university-management-system-plum-alpha.vercel.app

Health Check:

https://university-management-system-plum-alpha.vercel.app/api/v1/health
🚧 Future Improvements

Potential future improvements:

Swagger / OpenAPI documentation
Advanced filtering and sorting
Redis caching
Refresh-token based authentication
Multer + Cloudinary file upload
More complete audit-log APIs
Student fee management
Teacher salary management
Exam and result management
Dashboard analytics
Automated testing
CI/CD pipeline
Email notification templates
👨‍💻 Author
Nakibul Islam

Backend / Full-Stack Developer
Bangladesh

Core Focus
Node.js
TypeScript
Express.js
PostgreSQL
Prisma
REST APIs
Authentication
RBAC
Payment Integration
📄 License

This project was created for educational, assignment, and portfolio purposes.

