import * as path from 'path';
import * as fs from 'fs';

export interface RequestRecord {
    id: string;
    timestamp: number;
    clientName: string;
    clientVersion: string;
    method: string;
    toolName?: string;
    model?: string;
    duration: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    requestPreview: string;
    responsePreview: string;
    status: 'success' | 'error';
    errorMessage?: string;
}

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS request_history (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    client_name TEXT,
    client_version TEXT,
    method TEXT NOT NULL,
    tool_name TEXT,
    model TEXT,
    duration INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    request_preview TEXT,
    response_preview TEXT,
    status TEXT NOT NULL,
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_timestamp ON request_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client ON request_history(client_name);
CREATE INDEX IF NOT EXISTS idx_model ON request_history(model);`;

/**
 * HistoryStorage — reads from the shared SQLite database using sql.js (WASM).
 *
 * Architecture:
 * - mcp-server.ts (Node.js process) WRITES to the .db file via better-sqlite3 (no ABI issue)
 * - extension.ts  (Electron process) READS via sql.js (pure WASM, zero ABI issues, 100% cross-platform)
 *
 * sql.js loads the entire .db file into memory on init, so all reads are synchronous and fast.
 * The db is reloaded on each query call to pick up new records written by mcp-server.
 */
export class HistoryStorage {
    private dbPathStr: string;
    private SQL: any = null;

    constructor(storagePath: string) {
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
        }
        this.dbPathStr = path.join(storagePath, 'history.db');
        this._initSqlJs();
    }

    private _initSqlJs() {
        try {
            // sql.js WASM binary is copied to dist/ by webpack CopyPlugin
            const wasmPath = path.join(__dirname, 'sql-wasm.wasm');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const initSqlJs = require('sql.js');
            // Initialize synchronously using a promise chain stored in this.SQL
            // Actual query methods will await this before use
            this.SQL = initSqlJs({ wasmBinary: fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : undefined });
            console.log('[L-Hub] HistoryStorage: sql.js WASM initialized ✅');
        } catch (e) {
            console.error('[L-Hub] HistoryStorage: sql.js init failed:', e);
            this.SQL = null;
        }
    }

    /** Load (or reload) the SQLite db file into an in-memory sql.js database */
    private async _loadDb(): Promise<any | null> {
        if (!this.SQL) { return null; }
        try {
            const SqlJs = await this.SQL;
            // If the db file doesn't exist yet, create empty db with schema
            if (!fs.existsSync(this.dbPathStr)) {
                const db = new SqlJs.Database();
                db.run(CREATE_TABLE_SQL);
                return db;
            }
            const fileBuffer = fs.readFileSync(this.dbPathStr);
            const db = new SqlJs.Database(fileBuffer);
            return db;
        } catch (e) {
            console.error('[L-Hub] HistoryStorage: failed to load db file:', e);
            return null;
        }
    }

    public getDbPath(): string {
        return this.dbPathStr;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * saveRecord — kept for interface compatibility.
     * In practice, mcp-server.ts (Node.js / better-sqlite3) is the write path.
     * This extension-host write path uses sql.js in-memory then persists to disk.
     */
    public async saveRecord(record: RequestRecord): Promise<void> {
        const db = await this._loadDb();
        if (!db) { return; }
        try {
            db.run(
                `INSERT OR IGNORE INTO request_history (
                    id,timestamp,client_name,client_version,method,tool_name,model,
                    duration,input_tokens,output_tokens,total_tokens,
                    request_preview,response_preview,status,error_message
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    record.id, record.timestamp, record.clientName || '', record.clientVersion || '',
                    record.method, record.toolName || '', record.model || '', record.duration,
                    record.inputTokens || 0, record.outputTokens || 0, record.totalTokens || 0,
                    record.requestPreview || '', record.responsePreview || '',
                    record.status, record.errorMessage || ''
                ]
            );
            fs.writeFileSync(this.dbPathStr, Buffer.from(db.export()));
        } catch (e) {
            console.error('[L-Hub] saveRecord error:', e);
        } finally {
            db.close();
        }
    }

    public queryHistory(page: number, pageSize: number): { records: RequestRecord[], total: number } {
        // Synchronous wrapper — sql.js supports synchronous in-memory queries
        // We load the file synchronously to keep compatibility with callers
        if (!this.SQL) { return { records: [], total: 0 }; }
        try {
            // The SQL Promise might not be resolved yet on first call — handle gracefully
            let SqlJs: any;
            // Access the resolved value if available (sql.js resolves quickly on init)
            let resolved = false;
            (this.SQL as Promise<any>).then(s => { SqlJs = s; resolved = true; });
            // Tiny busy-wait (max 200ms) to let WASM init settle on first call
            const start = Date.now();
            while (!resolved && Date.now() - start < 200) { /* spin */ }
            if (!SqlJs) { return { records: [], total: 0 }; }
            if (!fs.existsSync(this.dbPathStr)) { return { records: [], total: 0 }; }
            const fileBuffer = fs.readFileSync(this.dbPathStr);
            const db = new SqlJs.Database(fileBuffer);
            const offset = (page - 1) * pageSize;
            const rows = db.exec(
                `SELECT * FROM request_history ORDER BY timestamp DESC LIMIT ${pageSize} OFFSET ${offset}`
            );
            const countRows = db.exec('SELECT COUNT(*) as count FROM request_history');
            db.close();
            const columns: string[] = rows[0]?.columns || [];
            const values: any[][] = rows[0]?.values || [];
            const records = values.map(row => {
                const obj: any = {};
                columns.forEach((col, i) => { obj[col] = row[i]; });
                return this.mapDbRowToRecord(obj);
            });
            const total = countRows[0]?.values?.[0]?.[0] || 0;
            return { records, total };
        } catch (e) {
            console.error('[L-Hub] queryHistory error:', e);
            return { records: [], total: 0 };
        }
    }

    public cleanupOldRecords(daysToKeep: number = 30) {
        // Cleanup is primarily handled by mcp-server.ts; this is a no-op fallback
        console.log(`[L-Hub] cleanupOldRecords: managed by mcp-server (>${daysToKeep}d)`);
    }

    public clearAll() {
        if (!fs.existsSync(this.dbPathStr)) { return; }
        if (!this.SQL) { return; }
        // Truncate by overwriting with a fresh empty db
        try {
            (this.SQL as Promise<any>).then(SqlJs => {
                const db = new SqlJs.Database();
                db.run(CREATE_TABLE_SQL);
                fs.writeFileSync(this.dbPathStr, Buffer.from(db.export()));
                db.close();
            });
        } catch (e) {
            console.error('[L-Hub] clearAll error:', e);
        }
    }

    public close() {
        // sql.js is in-memory, nothing to close at class level
    }

    private mapDbRowToRecord(row: any): RequestRecord {
        return {
            id: row.id,
            timestamp: row.timestamp,
            clientName: row.client_name,
            clientVersion: row.client_version,
            method: row.method,
            toolName: row.tool_name,
            model: row.model,
            duration: row.duration,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            totalTokens: row.total_tokens,
            requestPreview: row.request_preview,
            responsePreview: row.response_preview,
            status: row.status,
            errorMessage: row.error_message
        };
    }
}
