import assert from "node:assert/strict";
import test from "node:test";

import type { CreateHostedAccountInput } from "@pacd/contracts";

import { cognitoCreateUserInput } from "./cognito-provisioning.ts";

const account: CreateHostedAccountInput = {
  departmentId: "operations",
  displayName: "Test User",
  email: null,
  employeeCode: "EMP-002",
  role: "USER",
  temporaryPassword: "Temporary-42!",
  username: "emp-002",
};

test("hosted provisioning suppresses delivery and passes the one-time password only to Cognito", () => {
  const input = cognitoCreateUserInput("eu-north-1_pool", account);

  assert.equal(input.MessageAction, "SUPPRESS");
  assert.equal(input.TemporaryPassword, "Temporary-42!");
  assert.equal(input.DesiredDeliveryMediums, undefined);
  assert.equal(input.UserAttributes, undefined);
});

test("hosted provisioning keeps optional email as a verified profile attribute without enabling delivery", () => {
  const input = cognitoCreateUserInput("eu-north-1_pool", { ...account, email: "employee@example.com" });

  assert.deepEqual(input.UserAttributes, [
    { Name: "email", Value: "employee@example.com" },
    { Name: "email_verified", Value: "true" },
  ]);
  assert.equal(input.MessageAction, "SUPPRESS");
  assert.equal(input.DesiredDeliveryMediums, undefined);
});
