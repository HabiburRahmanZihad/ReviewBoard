import { Request, Response, NextFunction } from "express";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown) => string | null;
}

// ─── Validation Middleware Factory ──────────────────────────────────────────

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === "")) {
        errors[rule.field] = `${rule.field} is required.`;
        continue;
      }

      // Skip further validation if value is empty and not required
      if (value === undefined || value === null || value === "") {
        continue;
      }

      // Check type
      if (rule.type && typeof value !== rule.type) {
        errors[rule.field] = `${rule.field} must be a ${rule.type}.`;
        continue;
      }

      // Check min length
      if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
        errors[rule.field] = `${rule.field} must be at least ${rule.minLength} characters.`;
        continue;
      }

      // Check max length
      if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
        errors[rule.field] = `${rule.field} must be at most ${rule.maxLength} characters.`;
        continue;
      }

      // Check pattern
      if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
        errors[rule.field] = rule.patternMessage || `${rule.field} format is invalid.`;
        continue;
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          errors[rule.field] = customError;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
      return;
    }

    next();
  };
};

// ─── Pre-built Validation Rules ─────────────────────────────────────────────

export const submissionValidation: ValidationRule[] = [
  {
    field: "projectName",
    required: true,
    type: "string",
    minLength: 2,
    maxLength: 100,
  },
  {
    field: "repoUrl",
    required: true,
    type: "string",
    pattern: /^https?:\/\/(www\.)?github\.com\/.+\/.+/i,
    patternMessage: "repoUrl must be a valid GitHub repository URL.",
  },
  {
    field: "liveUrl",
    required: false,
    type: "string",
    pattern: /^https?:\/\/.+/i,
    patternMessage: "liveUrl must be a valid URL starting with http:// or https://.",
  },
  {
    field: "description",
    required: true,
    type: "string",
    minLength: 10,
    maxLength: 2000,
  },
];

export const loginValidation: ValidationRule[] = [
  {
    field: "email",
    required: true,
    type: "string",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: "Please provide a valid email address.",
  },
  {
    field: "password",
    required: true,
    type: "string",
    minLength: 6,
  },
];

export const signupValidation: ValidationRule[] = [
  {
    field: "name",
    required: true,
    type: "string",
    minLength: 2,
    maxLength: 50,
  },
  {
    field: "email",
    required: true,
    type: "string",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: "Please provide a valid email address.",
  },
  {
    field: "password",
    required: true,
    type: "string",
    minLength: 6,
    maxLength: 128,
  },
];

export const feedbackValidation: ValidationRule[] = [
  {
    field: "comment",
    required: true,
    type: "string",
    minLength: 5,
    maxLength: 2000,
  },
];
