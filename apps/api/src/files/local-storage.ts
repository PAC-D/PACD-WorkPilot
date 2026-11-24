import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ObjectStorage, StoredObjectMetadata, UploadGrant, DownloadGrant } from "./s3-storage.ts";
import { detectMimeSignature } from "./file-signature.ts";

type Ticket={key:string;method:"PUT"|"GET";mimeType:string;sizeBytes:number;expiresAt:number};
const maxBytes=5_000_000;

export class LocalObjectStorage implements ObjectStorage{
  private readonly directory:string;
  private readonly secret:string;
  private readonly baseUrl:string;
  constructor(directory:string,secret:string,baseUrl:string){this.directory=directory;this.secret=secret;this.baseUrl=baseUrl;}
  private path(key:string){return join(this.directory,createHash("sha256").update(key).digest("hex"));}
  private sign(ticket:Ticket):string{const body=Buffer.from(JSON.stringify(ticket)).toString("base64url");const signature=createHmac("sha256",this.secret).update(body).digest("base64url");return `${body}.${signature}`;}
  private decode(token:string,method:Ticket["method"]):Ticket{
    const [body,signature]=token.split(".");if(!body||!signature)throw new Error("Invalid file ticket");
    const expected=createHmac("sha256",this.secret).update(body).digest();const supplied=Buffer.from(signature,"base64url");
    if(supplied.length!==expected.length||!timingSafeEqual(expected,supplied))throw new Error("Invalid file ticket");
    const ticket=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as Ticket;
    if(ticket.method!==method||ticket.expiresAt<Date.now()||(!ticket.key.startsWith("claims/")&&!ticket.key.startsWith("requests/")))throw new Error("Expired file ticket");
    return ticket;
  }
  async authorizeUpload(key:string,contentType:string,contentLength:number):Promise<UploadGrant>{
    const expiresAt=Date.now()+300_000;return {expiresAt:new Date(expiresAt).toISOString(),headers:{"Content-Type":contentType},url:`${this.baseUrl}/api/v1/local-files/${this.sign({key,method:"PUT",mimeType:contentType,sizeBytes:contentLength,expiresAt})}`};
  }
  async authorizeDownload(key:string):Promise<DownloadGrant>{
    const expiresAt=Date.now()+300_000;return {expiresAt:new Date(expiresAt).toISOString(),url:`${this.baseUrl}/api/v1/local-files/${this.sign({key,method:"GET",mimeType:"",sizeBytes:0,expiresAt})}`};
  }
  async put(token:string,body:ReadableStream<Uint8Array>|null,contentType:string):Promise<void>{
    const ticket=this.decode(token,"PUT");if(!body||contentType!==ticket.mimeType)throw new Error("File type mismatch");
    const chunks:Uint8Array[]=[];let size=0;const reader=body.getReader();
    try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maxBytes||size>ticket.sizeBytes)throw new Error("File too large");chunks.push(next.value);}}finally{reader.releaseLock();}
    const bytes=Buffer.concat(chunks);if(bytes.length!==ticket.sizeBytes||detectMimeSignature(bytes)!==ticket.mimeType)throw new Error("File content mismatch");
    await mkdir(this.directory,{recursive:true,mode:0o700});await writeFile(this.path(ticket.key),bytes,{mode:0o600});
  }
  async get(token:string):Promise<{bytes:Uint8Array;mimeType:string}>{
    const ticket=this.decode(token,"GET");const bytes=await readFile(this.path(ticket.key));const mimeType=detectMimeSignature(bytes);if(!mimeType)throw new Error("Invalid stored file");return {bytes,mimeType};
  }
  async metadata(key:string):Promise<StoredObjectMetadata>{const bytes=await readFile(this.path(key));const contentType=detectMimeSignature(bytes);if(!contentType)throw new Error("Invalid stored file");return {contentLength:bytes.length,contentType};}
  async delete(key:string):Promise<void>{await rm(this.path(key),{force:true});}
}
