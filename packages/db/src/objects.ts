import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadEnv } from "@venture-os/config";

export type ObjectStore = {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
};

class FsStore implements ObjectStore {
  constructor(private readonly root: string) {}
  async put(key: string, body: Buffer) {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }
  async get(key: string) {
    return readFile(join(this.root, key));
  }
}

class S3Store implements ObjectStore {
  constructor(private readonly env: ReturnType<typeof loadEnv>) {}
  private async client() {
    const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
    return {
      S3Client,
      PutObjectCommand,
      GetObjectCommand,
      client: new S3Client({
        region: this.env.S3_REGION,
        endpoint: this.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.env.S3_ACCESS_KEY,
          secretAccessKey: this.env.S3_SECRET_KEY,
        },
      }),
    };
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { client, PutObjectCommand } = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
  async get(key: string) {
    const { client, GetObjectCommand } = await this.client();
    const res = await client.send(new GetObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`empty object ${key}`);
    return Buffer.from(bytes);
  }
}

export function createObjectStore(env = loadEnv()): ObjectStore {
  if (env.S3_ENDPOINT === "fs" || env.S3_ENDPOINT === "filesystem") {
    return new FsStore(join(process.cwd(), "uploads"));
  }
  return new S3Store(env);
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
