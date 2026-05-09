import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true
};

export const passwordPolicySchema = z.string().superRefine((password, context) => {
  const failures = validateStrongPassword(password);

  for (const failure of failures) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: failure });
  }
});

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  const passwordHash = hashPassword(password);
  const left = Buffer.from(passwordHash);
  const right = Buffer.from(hash);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function validateStrongPassword(password: string) {
  const failures: string[] = [];

  if (password.length < passwordPolicy.minLength) {
    failures.push(`Password must be at least ${passwordPolicy.minLength} characters.`);
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push("Password must include an uppercase letter.");
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    failures.push("Password must include a lowercase letter.");
  }

  if (passwordPolicy.requireNumber && !/[0-9]/.test(password)) {
    failures.push("Password must include a number.");
  }

  if (passwordPolicy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    failures.push("Password must include a symbol.");
  }

  return failures;
}
