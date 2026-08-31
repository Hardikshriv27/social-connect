export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type YouTubeChannelResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      thumbnails?: {
        default?: {
          url?: string;
        };
      };
    };
  }>;
};

function getYouTubeCredentials() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be configured.",
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

export async function exchangeYouTubeCode(
  code: string,
  redirectUri: string,
) {
  const { clientId, clientSecret } =
    getYouTubeCredentials();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const data =
    (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google token exchange failed.",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getYouTubeChannel(
  accessToken: string,
) {
  const url = new URL(
    "https://www.googleapis.com/youtube/v3/channels",
  );

  url.searchParams.set("part", "id,snippet");
  url.searchParams.set("mine", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data =
    (await response.json()) as YouTubeChannelResponse;

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve YouTube channel.",
    );
  }

  const channel = data.items?.[0];

  if (!channel?.id) {
    throw new Error(
      "No YouTube channel was found for this Google account.",
    );
  }

  return {
    channelId: channel.id,
    channelTitle:
      channel.snippet?.title || "YouTube channel",
    profilePicture:
      channel.snippet?.thumbnails?.default?.url ||
      null,
  };
}