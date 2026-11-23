package house.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

/**
 * La maison sur la télé : la WebApp de la maison en plein écran, pilotée à la télécommande.
 * Les flèches et OK vont à la page (mode télé, `?tv=1`) : elle passe d'un appareil à l'autre et OK fait comme un clic sur le bureau. Retour est d'abord proposé à la page (`houseTvBack`).
 * L'adresse (avec sa clé) n'est jamais dans le code : elle est donnée une fois par adb (`--es url "https://..."`) et gardée sur le Player.
 * Le certificat du serveur est vérifié contre la CA de la maison (res/raw/house_ca.crt) : une page signée par une autre CA est refusée.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "house";
    private static final String KEY_URL = "url";
    private WebView webView;
    private X509Certificate houseCa;
    private String allowedHost;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        houseCa = loadCa();

        String url = urlFrom(getIntent());
        if (url == null) {
            showMessage(getString(R.string.no_url));
            return;
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        // La mise en page « bureau » de la WebApp : la page se croit sur un écran de 1280 px de large (la télé en annonce 960 en pixels CSS, ce qui donnerait la mise en page téléphone).
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        webView.setWebViewClient(new HouseClient());

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        setContentView(webView);
        webView.requestFocus();
        webView.loadUrl(url);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String url = urlFrom(intent);
        if (url != null && webView != null) webView.loadUrl(url);
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    /** Programme + / − (ou Page +/−) : la page zoome ou dézoome la carte (`houseTvZoom`). Les flèches et OK vont à la page. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();
        boolean up = code == KeyEvent.KEYCODE_CHANNEL_UP || code == KeyEvent.KEYCODE_PAGE_UP;
        boolean down = code == KeyEvent.KEYCODE_CHANNEL_DOWN || code == KeyEvent.KEYCODE_PAGE_DOWN;
        if (webView != null && (up || down)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                webView.evaluateJavascript("window.houseTvZoom&&window.houseTvZoom(" + (up ? "1" : "-1") + ")", null);
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // Retour : la page ferme d'abord ce qui est choisi (`houseTvBack` rend vrai) ; sinon la page d'avant, et sur la première on quitte l'application.
        webView.evaluateJavascript("(function(){return window.houseTvBack?window.houseTvBack():false;})()", value -> {
            if ("true".equals(value)) return;
            if (webView.canGoBack()) webView.goBack();
            else finish();
        });
    }

    // ---- L'adresse et le certificat ----

    /** L'adresse donnée par adb (et gardée), sinon celle gardée ; null si aucune. */
    private String urlFrom(Intent intent) {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String given = intent == null ? null : intent.getStringExtra("url");
        if (given != null && given.startsWith("https://")) {
            prefs.edit().putString(KEY_URL, given).apply();
        }
        String url = prefs.getString(KEY_URL, null);
        allowedHost = url == null ? null : Uri.parse(url).getHost();
        return url;
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    private void showMessage(String text) {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.WHITE);
        view.setTextSize(24);
        view.setGravity(Gravity.CENTER);
        view.setPadding(80, 80, 80, 80);
        root.addView(view, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
    }

    private X509Certificate loadCa() {
        try (InputStream in = getResources().openRawResource(R.raw.house_ca)) {
            return (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(in);
        } catch (Exception e) {
            return null;
        }
    }

    /** Le certificat du serveur, signé par la CA de la maison et encore valable ? */
    private boolean signedByHouse(SslCertificate certificate) {
        if (houseCa == null || certificate == null) return false;
        try {
            Bundle saved = SslCertificate.saveState(certificate);
            byte[] der = saved.getByteArray("x509-certificate");
            if (der == null) return false;
            X509Certificate leaf = (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(der));
            leaf.checkValidity();
            leaf.verify(houseCa.getPublicKey());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private class HouseClient extends WebViewClient {
        private static final String DESKTOP_VIEWPORT =
                "var m=document.querySelector('meta[name=viewport]');"
                        + "if(m){m.setAttribute('content','width=1280');}"
                        + "else{m=document.createElement('meta');m.name='viewport';m.content='width=1280';document.head.appendChild(m);}";

        @Override
        public void onPageFinished(WebView view, String url) {
            view.evaluateJavascript(DESKTOP_VIEWPORT, null);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            // On accepte seulement l'hôte réglé, et seulement un certificat signé par la CA de la maison (l'adresse peut être une IP : le nom du certificat ne colle pas).
            String host = Uri.parse(error.getUrl()).getHost();
            if (allowedHost != null && allowedHost.equals(host) && signedByHouse(error.getCertificate())) handler.proceed();
            else handler.cancel();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
            // Rien ne sort de la maison : un lien vers un autre hôte est ignoré.
            return allowedHost == null || !allowedHost.equals(request.getUrl().getHost());
        }
    }
}
