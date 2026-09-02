const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";

const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type MetaApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaApiError;
};

type MetaUserResponse = {
  id?: string;
  name?: string;
  error?: MetaApiError;
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
  error?: MetaApiError;
};

function getMetaCredentials() {
  const clientId = process.env.META_CLIENT_ID?.trim();
  const clientSecret = process.env.META_CLIENT_SECRET?.trim();

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
  let data: any;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Meta API returned an invalid response. HTTP ${response.status}`,
    );
  }

  if (!response.ok) {
    const error = data?.error;

    const message =
      error?.message ||
      data?.message ||
      `Meta API request failed with HTTP ${response.status}.`;

    const details = [
      error?.type,
      error?.code ? `code ${error.code}` : null,
      error?.error_subcode ? `subcode ${error.error_subcode}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(details ? `${message} (${details})` : message);
  }

  return data as T;
}

export async function exchangeMetaCodeForUserToken(
  code: string,
  redirectUri: string,
) {
  const { clientId, clientSecret } = getMetaCredentials();

  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);

  url.searchParams.set("client_id", clientId);

  url.searchParams.set("client_secret", clientSecret);

  url.searchParams.set("redirect_uri", redirectUri.trim());

  url.searchParams.set("code", code);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = await readJson<MetaTokenResponse>(response);

  if (!data.access_token) {
    throw new Error("Meta did not return a user access token.");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function exchangeForLongLivedMetaToken(shortLivedToken: string) {
  const { clientId, clientSecret } = getMetaCredentials();

  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);

  url.searchParams.set("grant_type", "fb_exchange_token");

  url.searchParams.set("client_id", clientId);

  url.searchParams.set("client_secret", clientSecret);

  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = await readJson<MetaTokenResponse>(response);

  if (!data.access_token) {
    throw new Error("Could not obtain a long-lived Meta access token.");
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
    method: "GET",
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

export async function getManagedMetaPages(
  accessToken: string,
): Promise<MetaPage[]> {
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
    method: "GET",
    cache: "no-store",
  });

  const data = await readJson<MetaPagesResponse>(response);

  const pages = data.data || [];

  console.log(
    "Meta Pages fetched:",
    pages.map((page) => ({
      id: page.id,
      name: page.name,
      hasPageAccessToken: Boolean(page.access_token),
      instagramBusinessAccount: page.instagram_business_account?.id || null,
    })),
  );

  return pages;
}
