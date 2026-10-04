import { Capacitor } from '@capacitor/core';
import { Downloads } from './downloads.ts';

/**
 * Saves a text file. In the Android app it goes to the phone's public
 * Downloads folder (MediaStore); in a browser it is a normal download.
 * Returns where it went, for showing to the owner.
 */
export async function saveTextFile(filename: string, text: string, mimeType: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { path } = await Downloads.saveToDownloads({ filename, data: text, mimeType });
    return path;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
