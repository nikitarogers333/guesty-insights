type GuestyResponse = {
  results?: Array<Record<string, any>>;
  [key: string]: any;
};

let accessToken: string | null = null;
let tokenExpiry = 0;

const GUESTY_BASE_URL = process.env.GUESTY_BASE_URL || "https://open-api.guesty.com/v1";
const GUESTY_TOKEN_URL = process.env.GUESTY_TOKEN_URL || "https://open-api.guesty.com/oauth2/token";

async function getToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return accessToken;
  }

  const clientId = process.env.GUESTY_CLIENT_ID || "";
  const clientSecret = process.env.GUESTY_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    throw new Error("Guesty credentials are missing");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "open-api",
  });

  const response = await fetch(GUESTY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Guesty token error: ${response.status} ${text}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 86400) * 1000;
  return accessToken!;
}

async function requestGuesty(
  method: string,
  endpoint: string,
  params?: Record<string, any>,
  retries = 3,
  allowSkipFallback = true
): Promise<GuestyResponse> {
  const token = await getToken();

  const buildUrl = (currentParams?: Record<string, any>) => {
    const url = new URL(`${GUESTY_BASE_URL}${endpoint}`);
    if (currentParams) {
      Object.entries(currentParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url;
  };

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await fetch(buildUrl(params), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      accessToken = null;
      if (attempt === retries - 1) {
        throw new Error("Guesty unauthorized");
      }
      continue;
    }

    if (response.status === 429) {
      const waitMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      if (
        allowSkipFallback &&
        params?.skip !== undefined &&
        /skip.*not allowed/i.test(text)
      ) {
        const baseParams = { ...params };
        delete baseParams.skip;
        const altParamsList: Array<Record<string, any>> = [];
        const skipValue = Number(params.skip);
        const limitValue = Number(params.limit);
        if (Number.isFinite(skipValue) && Number.isFinite(limitValue) && limitValue > 0) {
          altParamsList.push({ ...baseParams, offset: skipValue });
          const page = Math.floor(skipValue / limitValue) + 1;
          altParamsList.push({ ...baseParams, page });
        }
        altParamsList.push(baseParams);

        let lastError: Error | null = null;
        for (const altParams of altParamsList) {
          try {
            return await requestGuesty(method, endpoint, altParams, retries, false);
          } catch (error) {
            lastError = error as Error;
          }
        }
        throw lastError || new Error(`Guesty request failed: ${response.status} ${text}`);
      }

      throw new Error(`Guesty request failed: ${response.status} ${text}`);
    }

    return response.json();
  }

  throw new Error("Guesty request failed after retries");
}

export async function getListings(skip = 0, limit = 100) {
  return requestGuesty("GET", "/listings", { skip, limit });
}

export async function getReservations(skip = 0, limit = 100, filters?: Array<Record<string, any>>) {
  const params: Record<string, any> = { skip, limit };
  if (filters) {
    params.filters = JSON.stringify(filters);
  }
  return requestGuesty("GET", "/reservations", params);
}

export async function getGuests(skip = 0, limit = 100) {
  return requestGuesty("GET", "/guests", { skip, limit });
}

export async function getConversations(skip = 0, limit = 100) {
  return requestGuesty("GET", "/communication/conversations", { skip, limit });
}
