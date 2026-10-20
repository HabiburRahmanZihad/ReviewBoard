"use client";

import { useState } from "react";
import { adminApi } from "@/lib/api";
import { createUserSchema, editUserSchema } from "@/lib/validation";
import { showToast } from "@/lib/alerts";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useZodForm } from "@/hooks/use-zod-form";
import { AdminUser, Role } from "@/types";
import { FormBanner, FormField } from "@/components/form-field";
import { roleDescription, roleIcon } from "@/components/role-badge";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROLES: Role[] = ["STUDENT", "MENTOR", "ADMIN"];

/** 14 characters from an unambiguous alphabet, always with a letter and a digit. */
function generatePassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  const chars = Array.from(bytes, (b, i) => (i === 0 ? letters : i === 1 ? digits : all)[b % (i === 0 ? letters.length : i === 1 ? digits.length : all.length)]);
  // Shuffle so the guaranteed letter/digit aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function UserDialog({
  open,
  onOpenChange,
  editing,
  isSelf,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminUser | null;
  isSelf: boolean;
  onSaved: () => void;
}) {
  const done = () => {
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold">{editing ? `Edit ${editing.name}` : "Add a user"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Change their name or role, or set a new password."
              : "Create an account for a mentor, admin or student, then share the password with them privately."}
          </DialogDescription>
        </DialogHeader>
        {editing ? (
          <EditForm key={editing.id} user={editing} isSelf={isSelf} onCancel={() => onOpenChange(false)} onSaved={done} />
        ) : (
          <CreateForm onCancel={() => onOpenChange(false)} onSaved={done} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const form = useZodForm(createUserSchema, { name: "", email: "", role: "MENTOR", password: "" });
  const { errors, field, formError, isSubmitting } = form;
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = form.handleSubmit(async (data) => {
    await adminApi.createUser(data);
    showToast(`${data.name} added as ${roleLabel[data.role].toLowerCase()}`);
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-4" noValidate>
      <FormBanner message={formError} />
      <FormField id="name" label="Full name" error={errors.name}>
        <Input {...field("name")} autoComplete="off" maxLength={50} autoFocus />
      </FormField>
      <FormField id="email" label="Email" error={errors.email}>
        <Input {...field("email")} type="email" autoComplete="off" />
      </FormField>
      <RoleField value={form.values.role as Role} onChange={(r) => form.setValue("role", r)} error={errors.role} />
      <FormField id="password" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
        <div className="flex gap-2">
          <Input {...field("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={72} className="font-mono" />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.setValue("password", generatePassword());
              setShowPassword(true);
            }}
          >
            Generate
          </Button>
        </div>
      </FormField>
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} label="Add user" />
    </form>
  );
}

function EditForm({
  user,
  isSelf,
  onCancel,
  onSaved,
}: {
  user: AdminUser;
  isSelf: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const form = useZodForm(editUserSchema, { name: user.name, role: user.role, password: "" });
  const { errors, field, formError, isSubmitting } = form;

  const onSubmit = form.handleSubmit(async (data) => {
    // Send only what changed
    const changes = {
      name: data.name !== user.name ? data.name : undefined,
      role: data.role !== user.role ? data.role : undefined,
      password: data.password || undefined,
    };
    if (!changes.name && !changes.role && !changes.password) {
      onCancel();
      return;
    }
    await adminApi.updateUser(user.id, changes);
    showToast(`Saved changes to ${data.name}`);
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-4" noValidate>
      <FormBanner message={formError} />
      <FormField id="name" label="Full name" error={errors.name}>
        <Input {...field("name")} autoComplete="off" maxLength={50} />
      </FormField>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Email</p>
        <p className="rounded-lg border bg-muted/40 px-2.5 py-1.5 text-muted-foreground">{user.email}</p>
      </div>
      <RoleField
        value={form.values.role as Role}
        onChange={(r) => form.setValue("role", r)}
        error={errors.role}
        disabledReason={isSelf ? "You can't change your own role. Another admin has to do it." : undefined}
      />
      <FormField id="password" label="New password" error={errors.password} hint="Leave blank to keep their current password">
        <Input {...field("password")} type="password" autoComplete="new-password" maxLength={72} />
      </FormField>
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} label="Save changes" />
    </form>
  );
}

function RoleField({
  value,
  onChange,
  error,
  disabledReason,
}: {
  value: Role;
  onChange: (role: Role) => void;
  error?: string;
  disabledReason?: string;
}) {
  const disabled = Boolean(disabledReason);
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">Role</legend>
      <div className="grid gap-2">
        {ROLES.map((role) => {
          const Icon = roleIcon[role];
          return (
            <label
              key={role}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 has-checked:border-foreground has-checked:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                disabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
              )}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={value === role}
                onChange={() => onChange(role)}
                className="sr-only"
              />
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-[13px] font-medium">{roleLabel[role]}</span>
                <span className="block text-xs text-muted-foreground">{roleDescription[role]}</span>
              </span>
            </label>
          );
        })}
      </div>
      {disabledReason && <p className="mt-1.5 text-xs text-muted-foreground">{disabledReason}</p>}
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function FormActions({ onCancel, isSubmitting, label }: { onCancel: () => void; isSubmitting: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="size-4 text-current" />}
        {label}
      </Button>
    </div>
  );
}
