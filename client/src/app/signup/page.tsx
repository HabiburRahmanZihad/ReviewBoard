import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth-layout";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create a student account" };

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
