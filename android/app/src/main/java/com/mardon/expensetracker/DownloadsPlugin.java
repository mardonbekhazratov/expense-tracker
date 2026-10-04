package com.mardon.expensetracker;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Writes a text file into the device's public Downloads folder via MediaStore.
 * Android 10+ (API 29) only; on older versions the call is rejected. MediaStore
 * needs no storage permission for the app's own inserts and auto-dedupes
 * colliding names (e.g. "file (1).json").
 */
@CapacitorPlugin(name = "Downloads")
public class DownloadsPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("data");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (filename == null || data == null) {
            call.reject("filename and data are required");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Saving to Downloads requires Android 10 or newer");
            return;
        }

        saveViaMediaStore(call, filename, data, mimeType);
    }

    @RequiresApi(api = Build.VERSION_CODES.Q)
    private void saveViaMediaStore(PluginCall call, String filename, String data, String mimeType) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri itemUri = resolver.insert(collection, values);
        if (itemUri == null) {
            call.reject("Could not create a file in Downloads");
            return;
        }

        try {
            try (OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) {
                    resolver.delete(itemUri, null, null);
                    call.reject("Could not open the Downloads file for writing");
                    return;
                }
                out.write(data.getBytes(StandardCharsets.UTF_8));
            }

            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(itemUri, values, null, null);

            JSObject ret = new JSObject();
            ret.put("uri", itemUri.toString());
            ret.put("path", "Download/" + filename);
            call.resolve(ret);
        } catch (Exception e) {
            resolver.delete(itemUri, null, null);
            call.reject("Failed to save to Downloads: " + e.getMessage(), e);
        }
    }
}
