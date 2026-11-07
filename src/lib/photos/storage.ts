// Cloudflare R2 (S3-compatible) storage for listing photos. Server only.
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type ProcessedPhoto, variantKey } from "./pipeline.ts";

export interface PhotoStore {
  client: S3Client;
  bucket: string;
  publicUrl: string;
}

export function photoStoreFromEnv(env: NodeJS.ProcessEnv = process.env): PhotoStore {
  const need = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`Missing ${k}`);
    return v;
  };
  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
    }),
    bucket: need("R2_BUCKET"),
    publicUrl: need("R2_PUBLIC_URL").replace(/\/$/, ""),
  };
}

/** Uploads every size; returns the `variants` JSON stored on property_photos. */
export async function uploadPhoto(store: PhotoStore, propertyId: string, photo: ProcessedPhoto) {
  const variants: Record<string, { key: string; url: string; width: number; height: number; bytes: number }> = {};
  for (const v of photo.variants) {
    const key = variantKey(propertyId, photo.hash, v);
    await store.client.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: key,
        Body: v.data,
        ContentType: v.contentType,
        CacheControl: "public, max-age=31536000, immutable", // keys are content-addressed
      }),
    );
    variants[v.name] = { key, url: `${store.publicUrl}/${key}`, width: v.width, height: v.height, bytes: v.bytes };
  }
  return variants;
}

export async function deletePhotoFiles(store: PhotoStore, keys: string[]) {
  if (!keys.length) return;
  await store.client.send(new DeleteObjectsCommand({ Bucket: store.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
}
