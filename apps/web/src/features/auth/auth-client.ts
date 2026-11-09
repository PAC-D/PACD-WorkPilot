import type { SignInInput } from "@pacd/contracts";

export interface AuthClient {
  signIn: (input: SignInInput) => Promise<void>;
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Sign-in will be available after the Cognito connection is configured.");
    this.name = "AuthNotConfiguredError";
  }
}

export const authClient: AuthClient = {
  signIn: async (_input) => {
    throw new AuthNotConfiguredError();
  },
};
