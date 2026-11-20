import { AdminCreateUserCommand, AdminDeleteUserCommand, AdminGetUserCommand, CognitoIdentityProviderClient, UsernameExistsException, type AdminCreateUserCommandInput } from "@aws-sdk/client-cognito-identity-provider";
import type { Account, CreateHostedAccountInput, CreateLocalAccountInput, Principal } from "@pacd/contracts";

import { DomainError, type PlatformService } from "../modules/platform-service.ts";

export function cognitoCreateUserInput(userPoolId: string, input: CreateHostedAccountInput): AdminCreateUserCommandInput {
  return {
    MessageAction: "SUPPRESS",
    TemporaryPassword: input.temporaryPassword,
    UserAttributes: input.email
      ? [{ Name: "email", Value: input.email }, { Name: "email_verified", Value: "true" }]
      : undefined,
    Username: input.username,
    UserPoolId: userPoolId,
  };
}

export class CognitoProvisioningService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly platform: PlatformService;

  constructor(region: string, userPoolId: string, platform: PlatformService) {
    this.client = new CognitoIdentityProviderClient({ region });
    this.userPoolId = userPoolId;
    this.platform = platform;
  }

  async createUser(
    actor: Principal,
    input: CreateHostedAccountInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<Account> {
    const { temporaryPassword, ...profile } = input;
    let created = false;
    let subject: string;
    try {
      const response = await this.client.send(new AdminCreateUserCommand(cognitoCreateUserInput(this.userPoolId, input)));
      subject = response.User?.Attributes?.find((attribute) => attribute.Name === "sub")?.Value ?? "";
      created = true;
    } catch (error) {
      if (!(error instanceof UsernameExistsException)) throw error;
      const existing = await this.client.send(new AdminGetUserCommand({
        Username: input.username,
        UserPoolId: this.userPoolId,
      }));
      subject = existing.UserAttributes?.find((attribute) => attribute.Name === "sub")?.Value ?? "";
    }
    if (!subject) throw new Error("Cognito did not return a user subject");
    try {
      return await this.platform.createAccount(actor, profile satisfies CreateLocalAccountInput, subject, idempotencyKey, requestId);
    } catch (error) {
      if (created) {
        await this.client.send(new AdminDeleteUserCommand({ Username: input.username, UserPoolId: this.userPoolId }))
          .catch(() => undefined);
      }
      throw error;
    }
  }
}
