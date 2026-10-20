"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ApiError, getErrorMessage } from "@/lib/api";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

function firstErrors<T>(error: z.ZodError | undefined): FieldErrors<T> {
  if (!error) return {};
  const result: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key !== undefined && !result[key]) result[key] = issue.message;
  }
  return result;
}

/**
 * Form state + Zod validation with friendly timing:
 * - a field shows its error after it's been blurred, or after the first submit attempt;
 * - errors then update live as the user types, so they disappear the moment it's fixed;
 * - field errors returned by the server (e.g. "already submitted") are shown on
 *   the matching field and cleared as soon as that field is edited.
 */
export function useZodForm<T extends Record<string, string>, Output>(
  schema: z.ZodType<Output, T>,
  initialValues: T
) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<T>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref flips synchronously, so even a double-click that lands before React
  // re-renders the disabled button can't send the request twice.
  const inFlight = useRef(false);

  const clientErrors = useMemo(() => firstErrors<T>(schema.safeParse(values).error), [schema, values]);

  const errors: FieldErrors<T> = {};
  for (const key of Object.keys(values) as (keyof T)[]) {
    errors[key] = ((submitted || touched[key]) && clientErrors[key]) || serverErrors[key];
  }

  const setValue = useCallback((key: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  }, []);

  /** Props for an input/textarea bound to `key`. */
  const field = (key: keyof T & string) => ({
    id: key,
    name: key,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(key, e.target.value),
    onBlur: () => setTouched((prev) => ({ ...prev, [key]: true })),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  /** Validates, then calls `onValid` with the parsed data. Server errors are mapped back onto fields. */
  const handleSubmit = (onValid: (data: Output) => Promise<void>) => async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitted(true);
    setFormError("");

    const result = schema.safeParse(values);
    if (!result.success) {
      // Move focus to the first invalid field so keyboard and screen-reader users land on it
      const firstKey = Object.keys(firstErrors<T>(result.error))[0];
      if (firstKey) document.getElementById(firstKey)?.focus();
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    try {
      await onValid(result.data);
    } catch (error) {
      const fieldErrors = error instanceof ApiError ? error.errors : undefined;
      const onFields = fieldErrors && Object.keys(fieldErrors).some((key) => key in values);
      if (onFields) {
        setServerErrors(fieldErrors as FieldErrors<T>);
      } else {
        // Not tied to a field (rate limit, network, server error) — show it as a banner
        setFormError(getErrorMessage(error));
      }
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const reset = useCallback((next: T) => {
    setValues(next);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setFormError("");
  }, []);

  return { values, errors, formError, isSubmitting, field, setValue, handleSubmit, reset };
}
