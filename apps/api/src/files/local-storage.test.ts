import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LocalObjectStorage } from "./local-storage.ts";

test("local files require a signed, scoped ticket and detected content type",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"workpilot-files-"));
  try{
    const storage=new LocalObjectStorage(directory,"test-secret","http://127.0.0.1:3000");
    const bytes=new TextEncoder().encode("%PDF-1.7\nfictional test file");
    const upload=await storage.authorizeUpload("claims/user-1/file-1","application/pdf",bytes.length);
    const token=upload.url.split("/").at(-1)!;
    await storage.put(token,new Blob([bytes]).stream() as ReadableStream<Uint8Array>,"application/pdf");
    assert.deepEqual(await storage.metadata("claims/user-1/file-1"),{contentLength:bytes.length,contentType:"application/pdf"});
    await assert.rejects(storage.get(token),/ticket/);
    await assert.rejects(storage.put(`${token}x`,new Blob([bytes]).stream() as ReadableStream<Uint8Array>,"application/pdf"),/ticket/);
    const download=await storage.authorizeDownload("claims/user-1/file-1");
    assert.deepEqual((await storage.get(download.url.split("/").at(-1)!)).bytes,Buffer.from(bytes));
    const bad=await storage.authorizeUpload("requests/user-1/file-2","image/png",bytes.length);
    await assert.rejects(storage.put(bad.url.split("/").at(-1)!,new Blob([bytes]).stream() as ReadableStream<Uint8Array>,"image/png"),/content mismatch/);
    await assert.rejects(storage.metadata("requests/user-1/file-2"));
  }finally{await rm(directory,{recursive:true,force:true});}
});
