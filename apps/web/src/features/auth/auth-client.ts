import type { CompleteNewPasswordInput, SignInInput, SignInOutcome } from "@pacd/contracts";
import { z } from "zod";

const authModeSchema = z.enum(["local", "cognito"]);
export type AuthMode = z.infer<typeof authModeSchema>;

export const authMode = authModeSchema.parse(import.meta.env.VITE_AUTH_MODE ?? "local");
let configured = false;

async function configureCognito() {
  if (configured) return;
  const config = z.object({
    clientId: z.string().min(1),
    userPoolId: z.string().min(1),
  }).parse({
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  });
  const { Amplify } = await import("aws-amplify");
  Amplify.configure({
    Auth: {
      Cognito: {
        loginWith: { username: true },
        userPoolClientId: config.clientId,
        userPoolId: config.userPoolId,
      },
    },
  });
  configured = true;
}

function message(error: unknown): string {
  if (!(error instanceof Error)) return "Authentication failed";
  if (error.name === "NotAuthorizedException") return "Incorrect username or password";
  if (error.name === "UserNotFoundException") return "Incorrect username or password";
  if (error.name === "PasswordResetRequiredException") return "A password reset is required";
  if (error.name === "TooManyRequestsException" || error.name === "LimitExceededException") return "Too many attempts. Try again later";
  return "Authentication failed";
}

export const hostedAuthClient = {
  async accessToken(): Promise<string | null> {
    if (authMode !== "cognito") return null;
    await configureCognito();
    const { fetchAuthSession } = await import("aws-amplify/auth");
    try {
      return (await fetchAuthSession()).tokens?.accessToken.toString() ?? null;
    } catch {
      return null;
    }
  },
  async completeNewPassword(input: CompleteNewPasswordInput): Promise<void> {
    await configureCognito();
    const { confirmSignIn } = await import("aws-amplify/auth");
    try {
      const result = await confirmSignIn({ challengeResponse: input.newPassword });
      if (!result.isSignedIn) throw new Error("Unsupported authentication challenge");
    } catch (error) {
      throw new Error(message(error));
    }
  },
  async signIn(input: SignInInput): Promise<SignInOutcome> {
    await configureCognito();
    const { signIn } = await import("aws-amplify/auth");
    try {
      const result = await signIn({ password: input.password, username: input.username });
      if (result.isSignedIn) return { status: "SIGNED_IN" };
      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        return { status: "NEW_PASSWORD_REQUIRED" };
      }
      throw new Error("Unsupported authentication challenge");
    } catch (error) {
      throw new Error(message(error));
    }
  },
  async signOut(): Promise<void> {
    if (authMode !== "cognito") return;
    await configureCognito();
    const { signOut } = await import("aws-amplify/auth");
    await signOut();
  },
};
