package com.mardon.expensetracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Home-screen widget with two buttons that open the app's Add sheet through
 * the expensetracker://add deep link. It shows no amounts: the data lives in
 * the WebView's IndexedDB (unreadable from here) and balances should not sit
 * on the home screen when the fingerprint lock is on.
 */
public class QuickAddWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);
            views.setOnClickPendingIntent(R.id.widget_add_expense, addIntent(context, "expense", 1));
            views.setOnClickPendingIntent(R.id.widget_add_income, addIntent(context, "income", 2));
            manager.updateAppWidget(widgetId, views);
        }
    }

    private static PendingIntent addIntent(Context context, String kind, int requestCode) {
        Intent intent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("expensetracker://add?kind=" + kind),
                context,
                MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
