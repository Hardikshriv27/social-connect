const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";

const FACEBOOK_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const INSTAGRAM_GRAPH = `https://graph.instagram.com/${META_GRAPH_VERSION}`;

type MetaResponse = {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type InstagramContainerStatus = {
  status_code?: string;
  error_message?: string;
  error?: {
    message?: string;
  };
};

async function readMetaResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error_message ||
      `Meta API request failed (${response.status}).`;

    throw new Error(message);
  }

  return data as T;
}

export function getPublicMediaUrl(mediaUrl: string) {
  const publicBase = process.env.META_MEDIA_BASE_URL?.replace(/\/$/, "");

  if (!publicBase) {
    throw new Error(
      "META_MEDIA_BASE_URL is missing. Start ngrok and add its HTTPS URL to .env.",
    );
  }

  if (mediaUrl.startsWith("/")) {
    return `${publicBase}${mediaUrl}`;
  }

  try {
    const parsed = new URL(mediaUrl);

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${publicBase}${parsed.pathname}${parsed.search}`;
    }

    return mediaUrl;
  } catch {
    return `${publicBase}/${mediaUrl.replace(/^\/+/, "")}`;
  }
}

export async function publishFacebookPagePost({
  pageId,
  pageAccessToken,
  message,
  mediaUrl,
}: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  mediaUrl?: string | null;
}) {
  if (mediaUrl) {
    const url = new URL(`${FACEBOOK_GRAPH}/${pageId}/photos`);

    const body = new URLSearchParams();

    body.set("access_token", pageAccessToken);
    body.set("url", getPublicMediaUrl(mediaUrl));
    body.set("caption", message);
    body.set("published", "true");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const data = await readMetaResponse<MetaResponse>(response);

    if (!data.id) {
      throw new Error("Facebook did not return a post/photo ID.");
    }

    return data.id;
  }

  const url = new URL(`${FACEBOOK_GRAPH}/${pageId}/feed`);

  const body = new URLSearchParams();

  body.set("access_token", pageAccessToken);
  body.set("message", message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await readMetaResponse<MetaResponse>(response);

  if (!data.id) {
    throw new Error("Facebook did not return a post ID.");
  }

  return data.id;
}

async function waitForInstagramContainer(
  containerId: string,
  accessToken: string,
) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const url = new URL(`${INSTAGRAM_GRAPH}/${containerId}`);

    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await readMetaResponse<InstagramContainerStatus>(response);

    if (data.status_code === "FINISHED") {
      return;
    }

    if (data.status_code === "ERROR") {
      throw new Error(
        data.error_message ||
          data.error?.message ||
          "Instagram media processing failed.",
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Instagram media processing timed out.");
}

export async function publishInstagramPost({
  instagramAccountId,
  message,
  mediaUrl,
}: {
  instagramAccountId: string;
  message: string;
  mediaUrl: string;
}) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN is missing from .env.");
  }

  if (!mediaUrl) {
    throw new Error("Instagram publishing requires an image.");
  }

  const createUrl = new URL(`${INSTAGRAM_GRAPH}/${instagramAccountId}/media`);

  const createBody = new URLSearchParams();

  createBody.set("image_url", getPublicMediaUrl(mediaUrl));
  createBody.set("caption", message);
  createBody.set("access_token", accessToken);

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: createBody,
    cache: "no-store",
  });

  const container = await readMetaResponse<MetaResponse>(createResponse);

  if (!container.id) {
    throw new Error("Instagram did not return a media container ID.");
  }

  await waitForInstagramContainer(container.id, accessToken);

  const publishUrl = new URL(
    `${INSTAGRAM_GRAPH}/${instagramAccountId}/media_publish`,
  );

  const publishBody = new URLSearchParams();

  publishBody.set("creation_id", container.id);
  publishBody.set("access_token", accessToken);

  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: publishBody,
    cache: "no-store",
  });

  const published = await readMetaResponse<MetaResponse>(publishResponse);

  if (!published.id) {
    throw new Error("Instagram did not return a published media ID.");
  }

  return published.id;
}
