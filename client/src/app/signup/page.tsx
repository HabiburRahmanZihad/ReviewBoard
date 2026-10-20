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
import { FullPageSpinner, Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const { user, isLoading, signup } = useAuth();
  const router = useRouter();
  const form = useZodForm(signupSchema, { name: "", email: "", password: "", confirmPassword: "" });
  const { errors, field, formError, isSubmitting } = form;

  useEffect(() => {
    if (!isLoading && user) router.replace(homePathFor(user));
  }, [isLoading, user, router]);

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    await signup(name, email, password);
    showToast("Welcome to ReviewBoard! Your student account is ready.", "success");
  });

  if (isLoading || user) return <FullPageSpinner />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            ReviewBoard
          </h1>
          <p className="text-muted-foreground">Create your student account</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign up</CardTitle>
            <CardDescription>Register as a student to start submitting projects</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormBanner message={formError} />

              <FormField id="name" label="Full name" error={errors.name}>
                <Input {...field("name")} placeholder="Jane Doe" autoComplete="name" maxLength={50} className="h-10" />
              </FormField>

              <FormField id="email" label="Email" error={errors.email}>
                <Input {...field("email")} type="email" placeholder="you@example.com" autoComplete="email" className="h-10" />
              </FormField>

              <FormField
                id="password"
                label="Password"
                error={errors.password}
                hint="At least 8 characters, including a letter and a number"
              >
                <Input {...field("password")} type="password" autoComplete="new-password" maxLength={72} className="h-10" />
              </FormField>

              <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
                <Input {...field("confirmPassword")} type="password" autoComplete="new-password" maxLength={72} className="h-10" />
              </FormField>

              <Button type="submit" className="w-full h-10 text-base" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="size-4 text-current" />}
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
