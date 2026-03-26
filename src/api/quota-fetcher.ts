import { getLocalRefreshToken } from '../auth/state-reader';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_MODEL_QUOTA_URL = 'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

interface AccessTokenResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    [key: string]: unknown;
}

export interface QuotaModelEntry {
    name?: string;
    model?: string;
    modelName?: string;
    id?: string;
    remainingFraction?: number;
    resetTime?: string;
    resetTimestamp?: string;
    quota?: {
        remainingFraction?: number;
        resetTime?: string;
        resetTimestamp?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface QuotaModelsResponse {
    models?: QuotaModelEntry[];
    availableModels?: QuotaModelEntry[];
    modelStatuses?: QuotaModelEntry[];
    [key: string]: unknown;
}

async function fetchAccessToken(refreshToken: string): Promise<string> {
    const payload = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
    });

    const responseText = await response.text();
    let responseJson: AccessTokenResponse;

    try {
        responseJson = JSON.parse(responseText) as AccessTokenResponse;
    } catch {
        throw new Error(`OAuth token endpoint returned non-JSON response (${response.status})`);
    }

    if (!response.ok) {
        throw new Error(`OAuth token request failed (${response.status}): ${responseText}`);
    }

    if (!responseJson.access_token) {
        throw new Error('OAuth token response did not include access_token');
    }

    return responseJson.access_token;
}

async function fetchAvailableModels(accessToken: string): Promise<QuotaModelsResponse> {
    const response = await fetch(GOOGLE_MODEL_QUOTA_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
            'User-Agent': 'antigravity/unknown darwin/amd64',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Quota request failed (${response.status}): ${responseText}`);
    }

    return response.json();
}

export async function fetchQuotaStatus(): Promise<QuotaModelsResponse> {
    const refreshToken = await getLocalRefreshToken();

    if (!refreshToken) {
        throw new Error('Local Google refresh token was not found');
    }

    const accessToken = await fetchAccessToken(refreshToken);
    return fetchAvailableModels(accessToken);
}
