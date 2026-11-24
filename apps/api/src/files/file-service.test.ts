import assert from "node:assert/strict";
import test from "node:test";

import { matchesAuthorizedMetadata,matchesFileExtension } from "./file-service.ts";

test("file finalization requires the exact authorized MIME type and byte length", () => {
  const expected={mimeType:"application/pdf",sizeBytes:1024};
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1024,contentType:"application/pdf"}),true);
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1025,contentType:"application/pdf"}),false);
  assert.equal(matchesAuthorizedMetadata(expected,{contentLength:1024,contentType:"text/html"}),false);
});

test("file extension must match the declared MIME type",()=>{
  assert.equal(matchesFileExtension("receipt.pdf","application/pdf"),true);
  assert.equal(matchesFileExtension("photo.jpeg","image/jpeg"),true);
  assert.equal(matchesFileExtension("receipt.exe","application/pdf"),false);
  assert.equal(matchesFileExtension("photo.png","application/pdf"),false);
});
