package com.dogparkjp.app2;

import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebView.WebViewTransport;
import androidx.annotation.Nullable;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Enable WebView remote debugging even in release (remember to disable later)
    WebView.setWebContentsDebuggingEnabled(true);

    // Ensure WebView is configured for our flows
    WebView webView = getBridge().getWebView();
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setSupportMultipleWindows(true);
    // Allow http app content to load https resources
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

    // Keep default Capacitor WebViewClient to serve local assets correctly.

    // Handle target="_blank" / window.open by loading into the same WebView
    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        WebView.HitTestResult result = view.getHitTestResult();
        String url = result != null ? result.getExtra() : null;
        if (url != null) {
          view.loadUrl(url);
        }
        WebViewTransport transport = (WebViewTransport) resultMsg.obj;
        transport.setWebView(view);
        resultMsg.sendToTarget();
        return true;
      }
    });
  }
}


