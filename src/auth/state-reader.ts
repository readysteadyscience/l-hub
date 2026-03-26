import { exec } from 'child_process';
import * as os from 'os';
import * as path from 'path';

const STATE_DB_PATH = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Antigravity',
    'User',
    'globalStorage',
    'state.vscdb'
);

const UNIFIED_OAUTH_KEY = 'antigravityUnifiedStateSync.oauthToken';
const UNIFIED_OAUTH_QUERY = `SELECT value FROM ItemTable WHERE key = '${UNIFIED_OAUTH_KEY}';`;

export interface UnifiedOauthTokenInfo {
    accessToken?: string;
    tokenType?: string;
    refreshToken?: string;
    expirySeconds?: number;
}

type VarintResult = [value: number, nextOffset: number];

function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function execSqliteScalar(databasePath: string, sql: string): Promise<string | null> {
    const command = `sqlite3 -batch -noheader ${shellQuote(databasePath)} ${shellQuote(sql)}`;

    return new Promise((resolve, reject) => {
        exec(
            command,
            {
                encoding: 'utf8',
                timeout: 5000,
                maxBuffer: 1024 * 1024,
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr.trim() || error.message));
                    return;
                }

                const value = stdout.trim();
                resolve(value.length > 0 ? value : null);
            }
        );
    });
}

function decodeVarint(buffer: Uint8Array, offset: number): VarintResult {
    let value = 0;
    let shift = 0;
    let index = offset;

    while (index < buffer.length) {
        const byte = buffer[index];
        value += (byte & 0x7f) * Math.pow(2, shift);
        index += 1;

        if ((byte & 0x80) === 0) {
            return [value, index];
        }

        shift += 7;
    }

    throw new Error('Incomplete varint');
}

function skipWireValue(buffer: Uint8Array, offset: number, wireType: number): number {
    if (wireType === 0) {
        const [, nextOffset] = decodeVarint(buffer, offset);
        return nextOffset;
    }

    if (wireType === 1) {
        return offset + 8;
    }

    if (wireType === 2) {
        const [length, nextOffset] = decodeVarint(buffer, offset);
        return nextOffset + length;
    }

    if (wireType === 5) {
        return offset + 4;
    }

    throw new Error(`Unknown wire type: ${wireType}`);
}

function findLengthDelimitedField(buffer: Uint8Array, fieldNumber: number): Buffer | undefined {
    let offset = 0;

    while (offset < buffer.length) {
        let tag: number;
        let nextOffset: number;

        try {
            [tag, nextOffset] = decodeVarint(buffer, offset);
        } catch {
            break;
        }

        const wireType = tag & 0x7;
        const currentFieldNumber = tag >> 3;

        if (currentFieldNumber === fieldNumber && wireType === 2) {
            const [length, valueOffset] = decodeVarint(buffer, nextOffset);
            return Buffer.from(buffer.subarray(valueOffset, valueOffset + length));
        }

        offset = skipWireValue(buffer, nextOffset, wireType);
    }

    return undefined;
}

function findNestedVarintValue(buffer: Uint8Array): number | undefined {
    let offset = 0;

    while (offset < buffer.length) {
        const [tag, nextOffset] = decodeVarint(buffer, offset);
        const wireType = tag & 0x7;
        const fieldNumber = tag >> 3;

        offset = nextOffset;

        if (fieldNumber === 1 && wireType === 0) {
            const [value] = decodeVarint(buffer, offset);
            return value;
        }

        offset = skipWireValue(buffer, offset, wireType);
    }

    return undefined;
}

function decodeTokenInfoPayload(buffer: Uint8Array): UnifiedOauthTokenInfo {
    let offset = 0;
    const result: UnifiedOauthTokenInfo = {};

    while (offset < buffer.length) {
        const [tag, nextOffset] = decodeVarint(buffer, offset);
        const wireType = tag & 0x7;
        const fieldNumber = tag >> 3;

        offset = nextOffset;

        if (wireType === 2) {
            const [length, valueOffset] = decodeVarint(buffer, offset);
            const fieldBuffer = Buffer.from(buffer.subarray(valueOffset, valueOffset + length));
            offset = valueOffset + length;

            if (fieldNumber === 1) {
                result.accessToken = fieldBuffer.toString();
            } else if (fieldNumber === 2) {
                result.tokenType = fieldBuffer.toString();
            } else if (fieldNumber === 3) {
                result.refreshToken = fieldBuffer.toString();
            } else if (fieldNumber === 4) {
                result.expirySeconds = findNestedVarintValue(fieldBuffer);
            }

            continue;
        }

        offset = skipWireValue(buffer, offset, wireType);
    }

    return result;
}

export function parseUnifiedOauth(base64Value: string): UnifiedOauthTokenInfo {
    const rootBuffer = Buffer.from(base64Value.trim(), 'base64');
    const outerPayload = findLengthDelimitedField(rootBuffer, 1);

    if (!outerPayload) {
        throw new Error('Unified oauth outer field not found');
    }

    const sentinelKey = findLengthDelimitedField(outerPayload, 1)?.toString();

    if (sentinelKey !== 'oauthTokenInfoSentinelKey') {
        throw new Error('Unified oauth sentinel mismatch');
    }

    const innerPayload = findLengthDelimitedField(outerPayload, 2);

    if (!innerPayload) {
        throw new Error('Unified oauth inner field not found');
    }

    const encodedTokenInfo = findLengthDelimitedField(innerPayload, 1)?.toString();

    if (!encodedTokenInfo) {
        throw new Error('Unified oauth info not found');
    }

    const tokenInfoBuffer = Buffer.from(encodedTokenInfo.trim(), 'base64');
    return decodeTokenInfoPayload(tokenInfoBuffer);
}

export async function getLocalRefreshToken(): Promise<string | null> {
    try {
        const unifiedOauthValue = await execSqliteScalar(STATE_DB_PATH, UNIFIED_OAUTH_QUERY);

        if (!unifiedOauthValue) {
            return null;
        }

        const tokenInfo = parseUnifiedOauth(unifiedOauthValue);
        return tokenInfo.refreshToken ?? null;
    } catch (error) {
        console.warn('[Quota Sentinel] Failed to read local refresh token:', error);
        return null;
    }
}
