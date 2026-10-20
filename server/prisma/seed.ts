import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clear existing data ──────────────────────────────────────────────
  await prisma.feedback.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Cleared existing data");

  // ─── Create Admin ─────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@reviewboard.com",
      password: adminPassword,
      name: "System Admin",
      role: Role.ADMIN,
    },
  });
  console.log(`  ✓ Created admin: ${admin.email}`);

  // ─── Create Mentor ────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("mentor123", 12);

  const mentor = await prisma.user.create({
    data: {
      email: "mentor@reviewboard.com",
      password: hashedPassword,
      name: "Lead Mentor",
      role: Role.MENTOR,
    },
  });
  console.log(`  ✓ Created mentor: ${mentor.email}`);

  // ─── Create a secondary Mentor ────────────────────────────────────────
  const mentor2 = await prisma.user.create({
    data: {
      email: "mentor2@reviewboard.com",
      password: hashedPassword,
      name: "Senior Mentor",
      role: Role.MENTOR,
    },
  });
  console.log(`  ✓ Created mentor: ${mentor2.email}`);

  // ─── Create demo Student ──────────────────────────────────────────────
  const studentPassword = await bcrypt.hash("student123", 12);

  const student = await prisma.user.create({
    data: {
      email: "student@reviewboard.com",
      password: studentPassword,
      name: "Demo Student",
      role: Role.STUDENT,
    },
  });
  console.log(`  ✓ Created student: ${student.email}`);

  // ─── Create sample submissions ────────────────────────────────────────
  const submission1 = await prisma.submission.create({
    data: {
      projectName: "E-Commerce Platform",
      repoUrl: "https://github.com/demo/ecommerce-platform",
      liveUrl: "https://ecommerce-demo.vercel.app",
      description:
        "A full-stack e-commerce platform built with Next.js and Stripe integration for payment processing.",
      studentId: student.id,
      status: "APPROVED",
      reviewerId: mentor.id,
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      projectName: "Task Management App",
      repoUrl: "https://github.com/demo/task-manager",
      liveUrl: "https://taskmanager-demo.vercel.app",
      description:
        "A collaborative task management application with real-time updates using WebSockets.",
      studentId: student.id,
      status: "PENDING",
    },
  });

  const submission3 = await prisma.submission.create({
    data: {
      projectName: "Weather Dashboard",
      repoUrl: "https://github.com/demo/weather-dashboard",
      description:
        "A weather dashboard that displays real-time weather data using OpenWeatherMap API.",
      studentId: student.id,
      status: "REJECTED",
      reviewerId: mentor.id,
    },
  });
  console.log(`  ✓ Created ${3} sample submissions`);

  // ─── Create sample feedback ───────────────────────────────────────────
  await prisma.feedback.create({
    data: {
      comment:
        "Excellent work! Clean code architecture and good use of TypeScript types. Approved.",
      submissionId: submission1.id,
      mentorId: mentor.id,
    },
  });

  await prisma.feedback.create({
    data: {
      comment:
        "The repository URL seems to be broken. Please update it and resubmit for review.",
      submissionId: submission3.id,
      mentorId: mentor.id,
    },
  });
  console.log(`  ✓ Created sample feedback entries`);

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Seeded accounts:");
  console.log("  Admin   → admin@reviewboard.com   / admin123");
  console.log("  Mentor  → mentor@reviewboard.com  / mentor123");
  console.log("  Mentor  → mentor2@reviewboard.com / mentor123");
  console.log("  Student → student@reviewboard.com / student123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
