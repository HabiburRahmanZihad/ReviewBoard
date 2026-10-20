"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { loginSchema } from "@/lib/validation";
import { homePathFor, roleLabel } from "@/lib/roles";
import { showToast } from "@/lib/alerts";
import { Role } from "@/types";
import { FormBanner, FormField } from "@/components/form-field";
import { roleIcon } from "@/components/role-badge";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";

const DEMO_ACCOUNTS: { role: Role; email: string; password: string }[] = [
  { role: "STUDENT", email: "student@reviewboard.com", password: "student123" },
  { role: "MENTOR", email: "mentor@reviewboard.com", password: "mentor123" },
  { role: "ADMIN", email: "admin@reviewboard.com", password: "admin123" },
];

export function LoginForm() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const form = useZodForm(loginSchema, { email: "", password: "" });
  const { errors, field, formError, isSubmitting } = form;

  // Already signed in (or just signed in) → go to the right home page for the role
  useEffect(() => {
    if (!isLoading && user) router.replace(homePathFor(user));
  }, [isLoading, user, router]);

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const signedIn = await login(email, password);
    showToast(`Signed in as ${signedIn.name}`);
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
      <h1 className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.02em]">Sign in</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Use the email and password for your ReviewBoard account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <FormBanner message={formError} />
        <FormField id="email" label="Email" error={errors.email}>
          <Input {...field("email")} type="email" placeholder="you@example.com" autoComplete="email" className="h-10" />
        </FormField>
        <FormField id="password" label="Password" error={errors.password}>
          <PasswordInput {...field("password")} autoComplete="current-password" className="h-10" />
        </FormField>
        <Button type="submit" className="h-10 w-full text-[14px]" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4 text-current" />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
          Create a student account
        </Link>
      </p>

      <div className="mt-10 border-t pt-6">
        <p className="eyebrow mb-3">Try a demo account</p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map(({ role, email, password }) => {
            const Icon = roleIcon[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  form.setValue("email", email);
                  form.setValue("password", password);
                }}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{roleLabel[role]}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{email}</span>
                </span>
                <span className="text-xs text-muted-foreground">Fill in</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
