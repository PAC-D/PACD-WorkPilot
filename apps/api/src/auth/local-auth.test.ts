import assert from "node:assert/strict";
import test from "node:test";

import { requestedLocalIdentity } from "./local-auth.ts";

test("reads only the explicit local identity header", () => {
  assert.equal(
    requestedLocalIdentity(new Request("http://localhost", { headers: { "x-workpilot-local-user": "local-user" } })),
    "local-user",
  );
  assert.equal(requestedLocalIdentity(new Request("http://localhost")), null);
});
