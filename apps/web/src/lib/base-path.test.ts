import assert from "node:assert/strict";
import test from "node:test";

import { addBasePath, normalizeBasePath, stripBasePath } from "./base-path.ts";

test("normalizes root and nested deployment paths", () => {
  assert.equal(normalizeBasePath(undefined), "");
  assert.equal(normalizeBasePath("/"), "");
  assert.equal(normalizeBasePath("/workpilot/"), "/workpilot");
});

test("adds the deployment prefix without changing canonical application paths", () => {
  assert.equal(addBasePath("/dashboard", ""), "/dashboard");
  assert.equal(addBasePath("/dashboard", "/workpilot"), "/workpilot/dashboard");
  assert.equal(addBasePath("/logo_left.png", "/workpilot"), "/workpilot/logo_left.png");
  assert.equal(addBasePath("/", "/workpilot"), "/workpilot/");
});

test("strips only the configured deployment prefix", () => {
  assert.equal(stripBasePath("/workpilot/dashboard", "/workpilot"), "/dashboard");
  assert.equal(stripBasePath("/workpilot/", "/workpilot"), "/");
  assert.equal(stripBasePath("/other/dashboard", "/workpilot"), null);
});
