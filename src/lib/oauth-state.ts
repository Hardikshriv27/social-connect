import crypto from "crypto";

export const OAUTH_STATE_COOKIE = "social_connect_oauth_state";

export type OAuthProvider = "facebook" | "youtube";

type OAuthStatePayload = {
  userId: string;
  provider: OAuthProvider;
  nonce: string;
  expiresAt: number;
};

function getStateSecret() {
  const secret =
    process.env.OAUTH_STATE_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "OAUTH_STATE_SECRET or NEXTAUTH_SECRET must be configured.",
    );
  }

  return secret;
}

function encodePayload(payload: OAuthStatePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function createOAuthState(
  userId: string,
  provider: OAuthProvider,
) {
  const payload: OAuthStatePayload = {
    userId,
    provider,
    nonce: crypto.randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(
  state: string,
  expectedProvider: OAuthProvider,
): OAuthStatePayload {
  const parts = state.split(".");

  if (parts.length !== 2) {
    throw new Error("Invalid OAuth state.");
  }

  const [encodedPayload, providedSignature] = parts;

  const expectedSignature = signPayload(encodedPayload);

  if (!timingSafeEqual(providedSignature, expectedSignature)) {
    throw new Error("Invalid OAuth state signature.");
  }

  let payload: OAuthStatePayload;

  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    throw new Error("Invalid OAuth state payload.");
  }

  if (
    !payload.userId ||
    !payload.nonce ||
    !payload.provider ||
    !payload.expiresAt
  ) {
    throw new Error("Incomplete OAuth state.");
  }

  if (payload.provider !== expectedProvider) {
    throw new Error("OAuth provider mismatch.");
  }

  if (payload.expiresAt < Date.now()) {
    throw new Error("OAuth state expired.");
  }

  return payload;
}