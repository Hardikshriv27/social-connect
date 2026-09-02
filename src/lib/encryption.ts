import crypto from "crypto";

function getKey() {
  const value = process.env.ENCRYPTION_KEY;

  if (!value) {
    throw new Error("ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(value, "hex");

  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hexadecimal characters.",
    );
  }

  return key;
}

export function encrypt(value: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(value: string) {
  const key = getKey();

  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
