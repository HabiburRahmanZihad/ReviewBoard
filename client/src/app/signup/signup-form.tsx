"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { signupSchema } from "@/lib/validation";
import { homePathFor } from "@/lib/roles";
import { showToast } from "@/lib/alerts";
import { FormBanner, FormField } from "@/components/form-field";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const { user, isLoading, signup } = useAuth();
  const router = useRouter();
  const form = useZodForm(signupSchema, { name: "", email: "", password: "", confirmPassword: "" });
  const { errors, field, formError, isSubmitting } = form;

  useEffect(() => {
    if (!isLoading && user) router.replace(homePathFor(user));
  }, [isLoading, user, router]);

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    await signup(name, email, password);
    showToast("Account created", "success", "Submit your first project to get mentor feedback.");
  });

  if (isLoading || user) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Loading">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <>
      <h1 className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.02em]">Create a student account</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Mentor and admin accounts are created by an admin.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <FormBanner message={formError} />
        <FormField id="name" label="Full name" error={errors.name}>
          <Input {...field("name")} placeholder="Ayesha Rahman" autoComplete="name" maxLength={50} className="h-10" />
        </FormField>
        <FormField id="email" label="Email" error={errors.email}>
          <Input {...field("email")} type="email" placeholder="you@example.com" autoComplete="email" className="h-10" />
        </FormField>
        <FormField id="password" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
          <Input {...field("password")} type="password" autoComplete="new-password" maxLength={72} className="h-10" />
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
          <Input {...field("confirmPassword")} type="password" autoComplete="new-password" maxLength={72} className="h-10" />
        </FormField>
        <Button type="submit" className="h-10 w-full text-[14px]" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4 text-current" />}
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
