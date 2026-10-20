"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { loginSchema } from "@/lib/validation";
import { homePathFor } from "@/lib/roles";
import { showToast } from "@/lib/alerts";
import { FormBanner, FormField } from "@/components/form-field";
import { FullPageSpinner, Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  { label: "Mentor", email: "mentor@reviewboard.com", password: "mentor123" },
  { label: "Student", email: "student@reviewboard.com", password: "student123" },
  { label: "Admin", email: "admin@reviewboard.com", password: "admin123" },
];

export default function LoginPage() {
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
    showToast(`Welcome back, ${signedIn.name}!`, "success");
  });

  if (isLoading || user) return <FullPageSpinner />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            ReviewBoard
          </h1>
          <p className="text-muted-foreground">Project Submission & Review Dashboard</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormBanner message={formError} />

              <FormField id="email" label="Email" error={errors.email}>
                <Input {...field("email")} type="email" placeholder="you@example.com" autoComplete="email" className="h-10" />
              </FormField>

              <FormField id="password" label="Password" error={errors.password}>
                <Input {...field("password")} type="password" placeholder="••••••••" autoComplete="current-password" className="h-10" />
              </FormField>

              <Button type="submit" className="w-full h-10 text-base" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="size-4 text-current" />}
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign up as a student
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials — click to fill the form */}
        <Card className="border-border/30 bg-muted/30">
          <CardContent>
            <p className="text-xs text-muted-foreground text-center mb-3 font-medium">Demo accounts (click to fill)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => {
                    form.setValue("email", account.email);
                    form.setValue("password", account.password);
                  }}
                  className="rounded-md border border-border/50 px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span className="block font-medium text-foreground">{account.label}</span>
                  {account.password}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
