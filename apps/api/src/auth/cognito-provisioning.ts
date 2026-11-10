import { AdminCreateUserCommand, AdminDeleteUserCommand, AdminGetUserCommand, CognitoIdentityProviderClient, UsernameExistsException } from "@aws-sdk/client-cognito-identity-provider";
import type { Account, CreateLocalAccountInput, Principal } from "@pacd/contracts";

import { DomainError, type PlatformService } from "../modules/platform-service.ts";

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
    input: CreateLocalAccountInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<Account> {
    if (!input.email) throw new DomainError("CONFLICT", "Email is required for a Cognito invitation");
    let created = false;
    let subject: string;
    try {
      const response = await this.client.send(new AdminCreateUserCommand({
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [{ Name: "email", Value: input.email }, { Name: "email_verified", Value: "true" }],
        Username: input.username,
        UserPoolId: this.userPoolId,
      }));
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
      return await this.platform.createAccount(actor, input, subject, idempotencyKey, requestId);
    } catch (error) {
      if (created) {
        await this.client.send(new AdminDeleteUserCommand({ Username: input.username, UserPoolId: this.userPoolId }))
          .catch(() => undefined);
      }
      throw error;
    }
  }
}
