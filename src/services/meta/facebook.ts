const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";

const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

type MetaUserResponse = {
  id?: string;
  name?: string;
  error?: {
    message?: string;
  };
};

export type MetaInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

export type MetaPage = {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: MetaInstagramAccount;
};

type MetaPagesResponse = {
  data?: MetaPage[];
  error?: {
    message?: string;
  };
};

function getMetaCredentials() {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "META_CLIENT_ID and META_CLIENT_SECRET must be configured.",
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || "Meta API request failed.";

    throw new Error(message);
  }

  return data as T;
}

export async function exchangeMetaCodeForUserToken(
  code: string,
  redirectUri: string,
) {
  const { clientId, clientSecret } = getMetaCredentials();

  const url = new URL(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`,
  );

  url.searchParams.set("client_id", clientId);

  url.searchParams.set("client_secret", clientSecret);

  url.searchParams.set("redirect_uri", redirectUri);

  url.searchParams.set("code", code);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await readJson<MetaTokenResponse>(response);

  if (!data.access_token) {
    throw new Error("Meta did not return an access token.");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function exchangeForLongLivedMetaToken(shortLivedToken: string) {
  const { clientId, clientSecret } = getMetaCredentials();

  const url = new URL(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`,
  );

  url.searchParams.set("grant_type", "fb_exchange_token");

  url.searchParams.set("client_id", clientId);

  url.searchParams.set("client_secret", clientSecret);

  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await readJson<MetaTokenResponse>(response);

  if (!data.access_token) {
    throw new Error("Could not obtain long-lived Meta token.");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getMetaUser(accessToken: string) {
  const url = new URL(`${GRAPH_BASE_URL}/me`);

  url.searchParams.set("fields", "id,name");

  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await readJson<MetaUserResponse>(response);

  if (!data.id) {
    throw new Error("Meta user ID was not returned.");
  }

  return {
    id: data.id,
    name: data.name || "Facebook account",
  };
}

export async function getManagedMetaPages(accessToken: string) {
  const url = new URL(`${GRAPH_BASE_URL}/me/accounts`);

  url.searchParams.set(
    "fields",
    [
      "id",
      "name",
      "access_token",
      "instagram_business_account{id,username,name,profile_picture_url}",
    ].join(","),
  );

  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await readJson<MetaPagesResponse>(response);

  return data.data || [];
}
