import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "replace-with-a-long-random-secret" || secret.length < 32) {
    throw new Error("Set a unique SESSION_SECRET of at least 32 characters before storing an AI API key.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptAiApiKey(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${nonce.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptAiApiKey(value: string) {
  const [version, nonce, tag, encrypted] = value.split(":");
  if (version !== "v1" || !nonce || !tag || !encrypted) {
    throw new Error("The saved AI API key has an invalid encrypted format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonce, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
