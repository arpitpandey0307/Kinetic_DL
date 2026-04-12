import { DownloadRecord } from '../types';

export class HistoryStore {
  private storageKey = 'kinetic_dl_history';
  private maxRecords = 100;
  private records: DownloadRecord[] = [];

  addRecord(record: DownloadRecord): void {
    this.records.unshift(record); // Add to beginning

    // Enforce size limit
    if (this.records.length > this.maxRecords) {
      this.records.splice(this.maxRecords);
    }
  }

  getRecords(limit?: number): DownloadRecord[] {
    return limit ? this.records.slice(0, limit) : this.records;
  }

  clearHistory(): void {
    this.records = [];
  }
}
