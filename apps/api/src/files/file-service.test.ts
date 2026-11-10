import assert from "node:assert/strict";
import test from "node:test";

import { matchesAuthorizedMetadata } from "./file-service.ts";

test("file finalization requires the exact authorized MIME type and byte length", () => {
  const expected={mimeType:"application/pdf",sizeBytes:1024};
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1024,contentType:"application/pdf"}),true);
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1025,contentType:"application/pdf"}),false);
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1024,contentType:"text/html"}),false);
});
