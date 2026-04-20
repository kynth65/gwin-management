// Amazon SP-API client
// OAuth2 token refresh flow required before every API call

interface AmazonTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_CLIENT_ID!,
      client_secret: process.env.AMAZON_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Amazon token error: ${res.status}`);
  }

  const data: AmazonTokenResponse = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function amazonFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const endpoint = `https://sellingpartnerapi-na.amazon.com${path}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-amz-access-token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Amazon SP-API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchAmazonOrders() {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID!;
  const createdAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return amazonFetch<{ payload: { Orders: unknown[] } }>(
    `/orders/v0/orders?MarketplaceIds=${marketplaceId}&CreatedAfter=${createdAfter}`
  );
}

export async function fetchAmazonListings() {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID!;
  return amazonFetch<unknown>(
    `/listings/2021-08-01/items?marketplaceIds=${marketplaceId}`
  );
}
