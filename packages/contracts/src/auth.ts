import { z } from "zod";

export const signInInputSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  username: z.string().trim().min(1, "Enter your username"),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

export const hostedPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

export const completeNewPasswordInputSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your new password"),
    newPassword: hostedPasswordSchema,
  })
  .refine(({ confirmPassword, newPassword }) => confirmPassword === newPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CompleteNewPasswordInput = z.infer<typeof completeNewPasswordInputSchema>;

export const signInOutcomeSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("SIGNED_IN") }),
  z.object({ status: z.literal("NEW_PASSWORD_REQUIRED") }),
]);

export type SignInOutcome = z.infer<typeof signInOutcomeSchema>;

export const authErrorCodeSchema = z.enum([
  "AUTH_NOT_CONFIGURED",
  "INVALID_CREDENTIALS",
  "PASSWORD_CHANGE_REQUIRED",
  "ACCOUNT_DISABLED",
  "TOO_MANY_ATTEMPTS",
  "UNKNOWN",
]);

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
