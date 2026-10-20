import { PrismaClient, Role, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

async function main() {
  // This script wipes every table — never let it near a production database
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }

  console.log("🌱 Seeding database...\n");

  // ─── Clear existing data ──────────────────────────────────────────────
  await prisma.feedback.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Cleared existing data");

  // ─── Privileged accounts (seeded directly, as per requirements) ───────
  const [adminPassword, mentorPassword, studentPassword] = await Promise.all([
    bcrypt.hash("admin123", 12),
    bcrypt.hash("mentor123", 12),
    bcrypt.hash("student123", 12),
  ]);

  const admin = await prisma.user.create({
    data: { email: "admin@reviewboard.com", password: adminPassword, name: "System Admin", role: Role.ADMIN, createdAt: daysAgo(45) },
  });
  const mentor = await prisma.user.create({
    data: { email: "mentor@reviewboard.com", password: mentorPassword, name: "Lead Mentor", role: Role.MENTOR, createdAt: daysAgo(40) },
  });
  const mentor2 = await prisma.user.create({
    data: { email: "mentor2@reviewboard.com", password: mentorPassword, name: "Senior Mentor", role: Role.MENTOR, createdAt: daysAgo(38) },
  });
  console.log(`  ✓ Created admin + 2 mentors`);

  // ─── Students ─────────────────────────────────────────────────────────
  const studentSeeds = [
    { email: "student@reviewboard.com", name: "Demo Student", createdAt: daysAgo(30) },
    { email: "ayesha@reviewboard.com", name: "Ayesha Rahman", createdAt: daysAgo(21) },
    { email: "tanvir@reviewboard.com", name: "Tanvir Hasan", createdAt: daysAgo(18) },
  ];
  const students = [];
  for (const s of studentSeeds) {
    students.push(await prisma.user.create({ data: { ...s, password: studentPassword, role: Role.STUDENT } }));
  }
  const [demo, ayesha, tanvir] = students;
  console.log(`  ✓ Created ${students.length} students`);

  // ─── Submissions ──────────────────────────────────────────────────────
  // Repo URLs are stored in canonical form (lowercase, no trailing slash / .git),
  // exactly as the API's validation layer would store them.
  type SeedSubmission = {
    student: typeof demo;
    projectName: string;
    slug: string;
    description: string;
    status: SubmissionStatus;
    reviewer?: typeof mentor;
    feedback?: string;
    age: number;
  };

  const submissions: SeedSubmission[] = [
    { student: demo, projectName: "E-Commerce Platform", slug: "ecommerce-platform", age: 14, status: "APPROVED", reviewer: mentor,
      description: "A full-stack e-commerce platform built with Next.js and Stripe integration for payment processing.",
      feedback: "Excellent work! Clean code architecture and good use of TypeScript types. Approved." },
    { student: demo, projectName: "Task Management App", slug: "task-manager", age: 2, status: "PENDING",
      description: "A collaborative task management application with real-time updates using WebSockets." },
    { student: demo, projectName: "Weather Dashboard", slug: "weather-dashboard", age: 9, status: "REJECTED", reviewer: mentor,
      description: "A weather dashboard that displays real-time weather data using the OpenWeatherMap API.",
      feedback: "The live link returns a 404. Please fix the deployment and resubmit for review." },
    { student: ayesha, projectName: "Recipe Finder", slug: "recipe-finder", age: 13, status: "APPROVED", reviewer: mentor2,
      description: "Search thousands of recipes by ingredient, with saved favourites and a weekly meal planner.",
      feedback: "Great UX and solid accessibility. Nice job on the empty states." },
    { student: ayesha, projectName: "Portfolio Website", slug: "portfolio", age: 12, status: "APPROVED", reviewer: mentor,
      description: "Personal portfolio built with Next.js App Router, MDX blog posts and a contact form." },
    { student: ayesha, projectName: "Expense Tracker", slug: "expense-tracker", age: 6, status: "PENDING",
      description: "Track income and expenses with category charts, monthly budgets and CSV export." },
    { student: ayesha, projectName: "Chat Application", slug: "realtime-chat", age: 4, status: "REJECTED", reviewer: mentor2,
      description: "Realtime chat rooms using Socket.IO with typing indicators and message history.",
      feedback: "Messages are stored without any sanitisation, which allows XSS. Please escape user content and resubmit." },
    { student: ayesha, projectName: "Blog CMS", slug: "blog-cms", age: 1, status: "PENDING",
      description: "A headless blog CMS with role-based editors, drafts, scheduled publishing and image uploads." },
    { student: tanvir, projectName: "Movie Explorer", slug: "movie-explorer", age: 11, status: "APPROVED", reviewer: mentor2,
      description: "Browse trending movies from the TMDB API with infinite scroll and a personal watchlist." },
    { student: tanvir, projectName: "Fitness Tracker", slug: "fitness-tracker", age: 10, status: "REJECTED", reviewer: mentor,
      description: "Log workouts and visualise progress over time with charts and personal records.",
      feedback: "The repository is missing a README and setup steps — I couldn't run it locally. Please add them." },
    { student: tanvir, projectName: "Quiz Game", slug: "quiz-game", age: 8, status: "PENDING",
      description: "A timed multiple-choice quiz game with leaderboards and categories fetched from an API." },
    { student: tanvir, projectName: "Job Board", slug: "job-board", age: 5, status: "PENDING",
      description: "Post and browse job listings with filters, saved searches and employer dashboards." },
    { student: tanvir, projectName: "URL Shortener", slug: "url-shortener", age: 3, status: "APPROVED", reviewer: mentor,
      description: "Shorten links with custom aliases, QR codes and click analytics per link." },
    { student: tanvir, projectName: "Notes App", slug: "markdown-notes", age: 0.5, status: "PENDING",
      description: "Markdown notes with tags, full-text search and offline support using IndexedDB." },
  ];

  for (const s of submissions) {
    const owner = s.student.email.split("@")[0];
    const created = await prisma.submission.create({
      data: {
        projectName: s.projectName,
        repoUrl: `https://github.com/${owner}/${s.slug}`,
        liveUrl: `https://${owner}-${s.slug}.vercel.app`,
        description: s.description,
        status: s.status,
        studentId: s.student.id,
        reviewerId: s.reviewer?.id,
        createdAt: daysAgo(s.age),
        updatedAt: daysAgo(s.status === "PENDING" ? s.age : s.age - 0.25),
      },
    });

    if (s.feedback && s.reviewer) {
      await prisma.feedback.create({
        data: {
          comment: s.feedback,
          submissionId: created.id,
          mentorId: s.reviewer.id,
          createdAt: daysAgo(s.age - 0.25),
        },
      });
    }
  }
  console.log(`  ✓ Created ${submissions.length} sample submissions with feedback`);

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Seeded accounts:");
  console.log(`  Admin   → ${admin.email}   / admin123`);
  console.log(`  Mentor  → ${mentor.email}  / mentor123`);
  console.log(`  Mentor  → ${mentor2.email} / mentor123`);
  console.log(`  Student → ${demo.email} / student123  (also ayesha@ / tanvir@)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
