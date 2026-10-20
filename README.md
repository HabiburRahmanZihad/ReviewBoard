# ReviewBoard — Project Submission and Review Dashboard

A full-stack web application for managing project submissions and reviews, built with modern technologies and industry best practices.

## Tech Stack

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| **Language** | TypeScript                                |
| **Frontend** | Next.js 15 (App Router), TailwindCSS, ShadCN UI |
| **Backend**  | Express.js 5                              |
| **Database** | PostgreSQL via Prisma ORM                 |
| **Auth**     | JWT-based Role-Based Access Control (RBAC)|

## Features

### Student Portal
- Submit project details (name, repo URL, live link, description)
- Robust form validation with real-time error feedback
- Duplicate submission prevention (unique constraint on student + repo URL)
- Rate limiting to prevent spam submissions
- View personal submission history with status tracking

### Mentor Dashboard
- Paginated data table with all student submissions
- Approve / Reject submissions with one click
- Server-side filtering by status (Pending, Approved, Rejected)
- Search submissions by project name
- Aggregated statistics dashboard (Total Pending, Approved, Rejected, Students)
- Add written feedback on any submission

### Authentication and Authorization
- JWT-based authentication with secure token handling
- Role-Based Access Control (RBAC) — Student vs. Mentor
- Student signup with email/password
- Mentor accounts seeded directly in the database
- Protected routes on both frontend and backend

---

## Project Structure

```
ReviewBoard/
├── client/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── (auth)/       # Auth pages (login, signup)
│   │   │   ├── dashboard/    # Mentor dashboard
│   │   │   └── submissions/  # Student submissions
│   │   ├── components/       # Reusable UI components
│   │   │   └── ui/           # ShadCN components
│   │   ├── lib/              # Utilities and API client
│   │   ├── hooks/            # Custom React hooks
│   │   └── types/            # TypeScript type definitions
│   └── package.json
│
├── server/                    # Express.js Backend
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Seed data script
│   ├── src/
│   │   ├── config/           # App configuration
│   │   ├── lib/              # Prisma client singleton
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── routes/           # API route handlers
│   │   └── index.ts          # Server entry point
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **PostgreSQL** v14+
- **npm** v9+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ReviewBoard.git
cd ReviewBoard
```

### 2. Setup the Backend

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with demo data
npm run seed

# Start the development server
npm run dev
```

### 3. Setup the Frontend

```bash
cd client

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local if needed

# Start the development server
npm run dev
```

### 4. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/api/health

### Default Accounts (after seeding)

| Role    | Email                      | Password    |
| ------- | -------------------------- | ----------- |
| Mentor  | mentor@reviewboard.com     | mentor123   |
| Mentor  | mentor2@reviewboard.com    | mentor123   |
| Student | student@reviewboard.com    | student123  |

---

## Database Schema (ERD)

```
┌───────────────────────┐       ┌──────────────────────────────┐       ┌───────────────────────┐
│        users          │       │        submissions            │       │      feedbacks         │
├───────────────────────┤       ├──────────────────────────────┤       ├───────────────────────┤
│ id          UUID  PK  │──┐    │ id              UUID  PK     │──┐    │ id          UUID  PK  │
│ email       String UQ │  │    │ project_name    String       │  │    │ comment     String    │
│ password    String    │  │    │ repo_url        String       │  │    │ created_at  DateTime  │
│ name        String    │  ├───>│ live_url        String?      │  │    │ updated_at  DateTime  │
│ role        Enum      │  │    │ description     String       │  │    │                       │
│ created_at  DateTime  │  │    │ status          Enum         │  ├───>│ submission_id UUID FK │
│ updated_at  DateTime  │  │    │ created_at      DateTime     │  │    │ mentor_id     UUID FK │
│                       │  │    │ updated_at      DateTime     │  │    │                       │
│                       │  ├───>│ student_id      UUID FK      │  │    │                       │
│                       │  └───>│ reviewer_id     UUID? FK     │  │    │                       │
│                       │       │                              │  │    │                       │
│                       │       │ @@unique(student_id, repo_url)│  │    │                       │
└───────────────────────┘       └──────────────────────────────┘  │    └───────────────────────┘
                                                                  │              ▲
                                                                  └──────────────┘
```

### Relationships
- **User to Submission** (1:N via `student_id`): A student can have many submissions
- **User to Submission** (1:N via `reviewer_id`): A mentor can review many submissions
- **Submission to Feedback** (1:N): A submission can have many feedback entries
- **User to Feedback** (1:N via `mentor_id`): A mentor can give feedback on many submissions

---

## API Endpoints

### Authentication

| Method | Endpoint         | Description             | Auth Required |
| ------ | ---------------- | ----------------------- | ------------- |
| POST   | `/api/auth/signup` | Register new student  | No            |
| POST   | `/api/auth/login`  | Login (any role)      | No            |
| GET    | `/api/auth/me`     | Get current user      | Yes           |

### Submissions

| Method | Endpoint                         | Description                  | Auth Required | Role    |
| ------ | -------------------------------- | ---------------------------- | ------------- | ------- |
| POST   | `/api/submissions`               | Create submission            | Yes           | Student |
| GET    | `/api/submissions`               | List submissions (paginated) | Yes           | Any     |
| GET    | `/api/submissions/stats`         | Get aggregated stats         | Yes           | Mentor  |
| GET    | `/api/submissions/:id`           | Get single submission        | Yes           | Any     |
| PATCH  | `/api/submissions/:id/status`    | Approve/Reject submission    | Yes           | Mentor  |
| POST   | `/api/submissions/:id/feedback`  | Add feedback                 | Yes           | Mentor  |

---

## Security Measures

- **Password Hashing**: bcrypt with cost factor 12
- **JWT Tokens**: Signed tokens with configurable expiry
- **Rate Limiting**: Global (100 req/15min) + Submission-specific (5 req/15min)
- **Input Validation**: Server-side validation on all endpoints
- **CORS**: Configured to only accept requests from the frontend origin
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **Duplicate Prevention**: Database-level unique constraints

---

## License

This project is created as part of a hiring assessment.

## Author

Built for the Associate Web Instructor hiring task.
