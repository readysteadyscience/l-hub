import { fetchQuotaStatus, QuotaModelsResponse } from './quota-fetcher';

const QUOTA_POLL_INTERVAL_MS = 180_000;

export class QuotaService {
    private cachedQuota: QuotaModelsResponse | null = null;
    private pollTimer: ReturnType<typeof setInterval> | undefined;

    public async startPolling(): Promise<void> {
        if (this.pollTimer) {
            return;
        }

        await this.refreshQuota();
        this.pollTimer = setInterval(() => {
            void this.refreshQuota();
        }, QUOTA_POLL_INTERVAL_MS);
    }

    public dispose(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
    }

    public getCachedQuota(): QuotaModelsResponse | null {
        return this.cachedQuota;
    }

    private async refreshQuota(): Promise<void> {
        try {
            this.cachedQuota = await fetchQuotaStatus();
        } catch (error) {
            console.warn('[L-Hub] Failed to refresh quota status:', error);
        }
    }
}
