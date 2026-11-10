import assert from "node:assert/strict";
import test from "node:test";

import { bearerToken } from "./cognito-auth.ts";

test("accepts one bearer token and rejects malformed authorization", () => {
  assert.equal(bearerToken(new Request("http://localhost", { headers: { Authorization: "Bearer token-value" } })), "token-value");
  assert.equal(bearerToken(new Request("http://localhost", { headers: { Authorization: "Basic value" } })), null);
  assert.equal(bearerToken(new Request("http://localhost", { headers: { Authorization: "Bearer one two" } })), null);
  assert.equal(bearerToken(new Request("http://localhost")), null);
});
