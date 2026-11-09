import { z } from "zod";

export const signInInputSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  username: z.string().trim().min(1, "Enter your username"),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

export const authErrorCodeSchema = z.enum([
  "AUTH_NOT_CONFIGURED",
  "INVALID_CREDENTIALS",
  "PASSWORD_CHANGE_REQUIRED",
  "ACCOUNT_DISABLED",
  "TOO_MANY_ATTEMPTS",
  "UNKNOWN",
]);

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
