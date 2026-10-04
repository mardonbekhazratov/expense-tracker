import { registerPlugin } from '@capacitor/core';

export interface SaveToDownloadsOptions {
  filename: string;
  /** File contents as a UTF-8 string. */
  data: string;
  mimeType?: string;
}

export interface SaveToDownloadsResult {
  /** content:// URI of the saved item. */
  uri: string;
  /** Human-readable destination, e.g. "Download/expense-tracker-2026-10-04.json". */
  path: string;
}

export interface DownloadsPlugin {
  saveToDownloads(options: SaveToDownloadsOptions): Promise<SaveToDownloadsResult>;
}

/**
 * Native bridge to the local Android plugin that writes into the public
 * Downloads folder via MediaStore. Android 10+ only.
 */
export const Downloads = registerPlugin<DownloadsPlugin>('Downloads');
