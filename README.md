# ReviewBoard — Project Submission and Review Dashboard

A full-stack app where students submit projects and mentors review them: paginated, server-filtered review queue, approve/reject with feedback, aggregated stats, an admin panel to manage people and data, and JWT-based role-based access control.

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| **Language** | TypeScript                                        |
| **Frontend** | Next.js 16 (App Router), TailwindCSS 4, ShadCN UI |
| **Backend**  | Express.js 5                                      |
| **Database** | PostgreSQL via Prisma ORM                         |
| **Auth**     | JWT-based Role-Based Access Control (RBAC)        |
| **Validation** | Zod (server is the source of truth, mirrored on the client) |

## Features

### Student Portal
- Submit a project: name, GitHub repo URL, live link, description
- Inline, as-you-type validation, plus server errors shown on the exact field
- Duplicate prevention: the same repository can't be submitted twice, however the URL is spelled
- Rate limiting on submissions
- Paginated list of your submissions with status and the latest mentor feedback
- Resubmit a **rejected** project after addressing the feedback

### Mentor Review Queue
- Paginated data table of all submissions
- Server-side filtering by status (Pending / Approved / Rejected), plus search by project, student name or email
- Filters live in the URL (`/dashboard?status=approved&q=ayesha&page=2`): they survive reloads and can be shared
- Aggregated statistics as a **review pipeline**: one proportional bar of pending / approved / rejected, whose legend doubles as the status filter
- Review panel (slides in from the right, keeping the table visible): description, links, a **timeline** of the submission (submitted → comments → decision), and **Comment / Reject / Approve**

### Admin Panel (`/admin`)
- **Overview:** the review pipeline, people by role, comment count, submissions waiting more than 3 days, a 14-day chart of submissions by status (with a table view), reviewer workload, the longest-waiting submissions and a recent-activity feed
- **Submissions:** everything a mentor can do, plus **reopen or change any decision** (a reason is still required to reject) and **delete** a submission
- **Users:** search and filter by role; **add** mentors, admins or students (with a password generator), **change roles**, **reset passwords**, and **delete** accounts. An admin can't change their own role or delete themselves, so there is always at least one admin.
- **Feedback:** every comment on the platform, searchable by text, project or reviewer, with **delete** for moderation

### Authentication
- Login page (all roles) and signup page (students only)
- The first admin is seeded directly into the database; from then on, admins create mentor and admin accounts in the admin panel
- Routes are protected in the UI *and* enforced by the API on every request

### Interface
- **Color means a verdict, and nothing else.** The UI is monochrome; the only colors are pending / approved / rejected. Those steps were checked for color-vision deficiency separately in light and dark, and always appear with a label.
- Light, dark and system themes, with no flash of the wrong theme on load
- Type: Schibsted Grotesk (headings), IBM Plex Sans (interface), IBM Plex Mono (repo slugs and URLs)
- Keyboard-friendly: `/` focuses search, `Esc` clears it, visible focus everywhere, skip-to-content link
- Responsive down to phone width, and reduced motion is respected

---

## Design Decisions (filling the ambiguities)

The brief leaves several things open. These are the choices made, and why.

| Question | Decision | Why |
| --- | --- | --- |
| What counts as a *duplicate* submission? | The same student submitting the same repository. Repo URLs are canonicalised first: `http://www.GitHub.com/Alice/App.git/` → `https://github.com/alice/app`. Enforced by a DB unique constraint on `(student_id, repo_url)`. | Comparing raw strings misses trivial variations. The DB constraint is the backstop for double-clicks that race past the app-level check. Different students *may* submit the same repo, so nobody can "squat" someone else's URL. |
| Is the live link required? | **Yes.** It must be a public `http(s)` URL — not `localhost`, and not the GitHub repo itself. | The brief lists it as a form field, and in a web course the deployed site is what mentors check. These are the mistakes beginners actually make. |
| What does "robust validation" mean? | One Zod schema per endpoint, applied before any handler runs. It trims and normalises the input, strips unknown fields, enforces types and lengths, and returns `{ field: message }` errors. The client runs a mirrored schema for instant feedback. | Whitespace-only input, wrong types and extra fields never reach the database. Client-side checks are UX only; the server remains the authority. |
| What does "basic rate limit" mean? | Three layers. **Global:** 300 req / 15 min per IP. **Auth:** 20 *failed* login/signup attempts / 15 min per IP. **Submissions:** 5 successful submissions / 15 min per **student account**. 429 responses say how long to wait. | Submissions are keyed by user, not IP, so a classroom behind one NAT doesn't share a quota. Only successes count, so correcting a typo never locks a student out. |
| Can a reviewed submission be re-reviewed? | **Not by mentors.** Only `PENDING` submissions can be approved or rejected. The update is an atomic compare-and-set, so if two mentors click at once, one wins and the other gets *"already approved by …"*. **Admins** can reopen or change a decision from the admin panel. | Mentors can't silently overwrite each other, yet a decision made in error can still be corrected by someone accountable. |
| What happens after a rejection? | Rejecting **requires a reason**, which is saved as feedback. The student can then **resubmit**: edit the details, and the submission goes back to `PENDING` with its feedback history kept. | A rejection without a reason, or with no path forward, is a dead end for a student. |
| Who is the "admin"? | A seeded `ADMIN` role that can do everything a mentor can, plus manage people (add, change role, reset password, delete), override decisions and moderate data. Signup can only ever create `STUDENT` accounts. | The brief asks for a seeded admin. Privileged accounts are never self-service, so onboarding mentors needs a place to happen. |
| What can students see about their own progress? | Their own pipeline (counts by status), every comment, and a timeline of each submission. `/api/submissions/stats` is scoped by role, like the list. | Same endpoint, data narrowed by who is asking: reviewers get platform-wide numbers, students get theirs. |
| Can mentors leave feedback without deciding? | Yes. Any reviewer can comment on any submission at any time. | Useful for partial reviews and follow-ups. |

---

## Getting Started

### Prerequisites
- **Node.js** v20+
- **PostgreSQL** v14+ (local, Docker, or a hosted provider such as Neon)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npx prisma migrate deploy     # create the tables from prisma/migrations
npm run seed                  # demo accounts + sample data (wipes existing data!)
npm run dev                   # http://localhost:5000
```

> **Already have a database created with `prisma db push`?** Mark the initial migration as applied instead of re-running it:
> `npx prisma migrate resolve --applied 0_init`

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                   # http://localhost:3000
```

### Default Accounts (after seeding)

| Role    | Email                     | Password   | Lands on        |
| ------- | ------------------------- | ---------- | --------------- |
| Admin   | admin@reviewboard.com     | admin123   | `/admin`        |
| Mentor  | mentor@reviewboard.com    | mentor123  | `/dashboard`    |
| Mentor  | mentor2@reviewboard.com   | mentor123  | `/dashboard`    |
| Student | student@reviewboard.com   | student123 | `/submissions`  |
| Student | ayesha@reviewboard.com    | student123 | `/submissions`  |
| Student | tanvir@reviewboard.com    | student123 | `/submissions`  |

The login page has one-click buttons that fill in the demo credentials.

---

## Database Schema

```
users                         submissions                          feedbacks
─────────────────────         ──────────────────────────────       ──────────────────────
id          UUID  PK  ◄──┬──  student_id    UUID FK               id            UUID PK
email       String UQ    └──  reviewer_id   UUID? FK          ┌─► submission_id UUID FK
password    String (bcrypt)   id            UUID PK  ─────────┘   mentor_id     UUID? FK ──► users
name        String            project_name  String                comment       String
role        STUDENT|MENTOR|   repo_url      String (canonical)    created_at
            ADMIN             live_url      String?
created_at                    description   String
                              status        PENDING|APPROVED|REJECTED
                              created_at / updated_at
                              @@unique(student_id, repo_url)
                              @@index(status), @@index(student_id)
```

- **User → Submission** (1:N via `student_id`): a student has many submissions
- **User → Submission** (1:N via `reviewer_id`): a mentor reviews many submissions
- **Submission → Feedback** (1:N): a submission collects feedback over time, including after resubmission
- **User → Feedback** (1:N via `mentor_id`): mentors and submissions are therefore many-to-many *through* feedback

---

## API

Every response has the shape `{ success, message, data?, errors? }`. `errors` maps a field name to a human-readable message.

### Authentication

| Method | Endpoint           | Description                      | Auth |
| ------ | ------------------ | -------------------------------- | ---- |
| POST   | `/api/auth/signup` | Register a student               | —    |
| POST   | `/api/auth/login`  | Login (any role), returns a JWT  | —    |
| GET    | `/api/auth/me`     | Current user                     | Any  |

### Submissions

| Method | Endpoint                        | Description                                                      | Role             |
| ------ | ------------------------------- | ---------------------------------------------------------------- | ---------------- |
| POST   | `/api/submissions`              | Create a submission                                              | Student          |
| PUT    | `/api/submissions/:id`          | Resubmit a **rejected** submission (owner only)                  | Student          |
| GET    | `/api/submissions`              | Paginated list. `?page&limit(≤50)&status&search`. Students see only their own. | Any |
| GET    | `/api/submissions/stats`        | Aggregated counts by status. Reviewers: platform-wide; students: their own. | Any |
| GET    | `/api/submissions/:id`          | One submission with full feedback history                        | Owner / Reviewer |
| PATCH  | `/api/submissions/:id/status`   | `{ status: "APPROVED" \| "REJECTED", comment? }`. A comment is required to reject. Pending only. | Mentor / Admin |
| POST   | `/api/submissions/:id/feedback` | `{ comment }`                                                    | Mentor / Admin   |

### Admin (every route requires the `ADMIN` role)

| Method | Endpoint                               | Description                                                                 |
| ------ | -------------------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/admin/overview?tz=Asia/Dhaka`    | Counts, 14-day series (bucketed by the viewer's local day), reviewer workload, longest-waiting submissions, recent activity |
| GET    | `/api/admin/users`                     | Paginated users. `?page&limit&role&search`, plus per-role counts            |
| POST   | `/api/admin/users`                     | `{ name, email, password, role }`: create any account                       |
| PATCH  | `/api/admin/users/:id`                 | `{ name?, role?, password? }`. You can't change your own role.              |
| DELETE | `/api/admin/users/:id`                 | Deletes the user (a student's submissions go with them). You can't delete yourself. |
| PATCH  | `/api/admin/submissions/:id/status`    | `{ status, comment? }`: set any status, e.g. reopen. A comment is required to reject. |
| DELETE | `/api/admin/submissions/:id`           | Deletes a submission and its feedback                                       |
| GET    | `/api/admin/feedback`                  | Every comment, newest first. `?page&limit&search`                           |
| DELETE | `/api/admin/feedback/:id`              | Deletes one comment                                                         |

Status codes: `400` validation, `401` missing/invalid token, `403` wrong role or not the owner, `404` not found, `409` duplicate or already reviewed, `429` rate limited.

---

## Security Measures

- **Passwords:** bcrypt (cost 12). Signup requires 8–72 characters with a letter and a number (bcrypt ignores bytes past 72).
- **Login:** the same error and the same timing whether or not the email exists, so accounts can't be enumerated.
- **JWT:** HS256 pinned on verify. The server refuses to start in production without `JWT_SECRET`. On every request the user is re-loaded from the DB, so deleted users and changed roles take effect immediately.
- **RBAC:** `authenticate` (who are you?) → `authorize(...roles)` (what may you do?) → ownership checks inside handlers (is this *your* submission?)
- **Validation:** Zod on every body and query. Unknown fields are stripped. JSON bodies are capped at 100 kB, and malformed JSON returns `400`.
- **Race safety:** DB unique constraints and conditional updates. Double-clicks and concurrent reviews can't corrupt state.
- **CORS** is restricted to the frontend origin, and Prisma parameterises every query.
- **Known trade-off:** the JWT is kept in `localStorage` for simplicity across separate frontend/backend origins. An httpOnly cookie would be safer against XSS, but it needs same-site deployment or a proxy plus CSRF protection.
- **Known limitation:** rate-limit counters live in memory, which is fine for one server instance. Multiple instances would need a shared store such as Redis.

---

## Project Structure

```
ReviewBoard/
├── client/                         # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── login/, signup/     # Auth pages (split layout)
│       │   └── (app)/              # Signed-in area: shared sidebar shell
│       │       ├── submissions/    # Student portal
│       │       ├── dashboard/      # Mentor review queue (URL-driven filters)
│       │       └── admin/          # Admin panel: overview, submissions, users, feedback
│       ├── components/             # App shell, review sheet + timeline, pipeline bar, chart, dialogs
│       │   └── ui/                 # ShadCN components (Base UI)
│       ├── hooks/                  # use-auth, use-query (abortable fetching), use-zod-form, use-url-params, use-theme
│       ├── lib/                    # API client, validation schemas, roles, toasts, theme
│       └── types/
│
└── server/                         # Express API
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/             # Committed migration history
    │   └── seed.ts
    └── src/
        ├── config/                 # Env + rate-limit settings
        ├── lib/                    # Prisma client, HttpError, shared select shapes
        ├── middleware/             # auth (AuthN/AuthZ), validate (Zod), rate-limit, error-handler
        ├── routes/                 # auth, submissions, admin
        ├── validation/             # Zod schemas + GitHub URL canonicalisation
        └── index.ts
```

---

## Author

Built for the Associate Web Instructor hiring task.
