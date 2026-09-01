const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";

const GRAPH_BASE_URL = `https://graph.instagram.com/${META_GRAPH_VERSION}`;

export type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

export async function getInstagramProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH_BASE_URL}/me`);

  url.searchParams.set("fields", "id,username,name,profile_picture_url");

  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Failed to fetch Instagram profile.",
    );
  }

  if (!data?.id) {
    throw new Error("Instagram profile ID was not returned.");
  }

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    profile_picture_url: data.profile_picture_url,
  };
}

export function getInstagramProfileName(account: {
  username?: string;
  name?: string;
}) {
  return account.username || account.name || "Instagram account";
}
