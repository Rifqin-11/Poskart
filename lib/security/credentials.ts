import "server-only";

import crypto from "node:crypto";

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
  last4: string;
};

export type EncryptedSecretRow = {
  ciphertext: string | null;
  iv: string | null;
  tag: string | null;
};

export function encryptCredential(value: string): EncryptedSecret {
  const trimmed = value.trim();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCredentialKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(trimmed, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    last4: trimmed.slice(-4),
  };
}

export function decryptCredential(row: EncryptedSecretRow): string | null {
  if (!row.ciphertext || !row.iv || !row.tag) return null;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    Buffer.from(row.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function getCredentialKey() {
  const secret = process.env.PAYMENT_CREDENTIALS_SECRET?.trim();
  if (!secret || secret.length < 24) {
    throw new Error(
      "PAYMENT_CREDENTIALS_SECRET must be set with at least 24 characters before saving private credentials.",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}
