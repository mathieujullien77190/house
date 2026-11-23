package house.cinema

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.net.URI
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/**
 * La connexion à la maison (House API, `/cinema/…`) : HTTPS vérifié contre la CA de la maison seule (res/raw/house_ca.crt), seulement pour l'hôte réglé
 * (l'adresse est une IP : le nom du certificat ne colle pas), et la clé de la télé dans chaque demande. Sert aussi les vignettes et la vidéo.
 */
class Api(context: Context, private val config: Config) {
    val client: OkHttpClient = build(context)

    private fun build(context: Context): OkHttpClient {
        val ca = context.resources.openRawResource(R.raw.house_ca).use { CertificateFactory.getInstance("X.509").generateCertificate(it) }
        val store = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
            load(null, null)
            setCertificateEntry("house", ca)
        }
        val trust = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply { init(store) }.trustManagers.filterIsInstance<X509TrustManager>().first()
        val tls = SSLContext.getInstance("TLS").apply { init(null, arrayOf(trust), null) }
        return OkHttpClient.Builder()
            .sslSocketFactory(tls.socketFactory, trust)
            // Le nom du certificat ne colle pas avec l'IP : on ne vérifie que l'hôte réglé (la chaîne, elle, l'est toujours).
            .hostnameVerifier { host, _ -> host == hostOf(config.base) }
            .addInterceptor { chain -> chain.proceed(chain.request().newBuilder().header("X-Lan-Key", config.key).build()) }
            .build()
    }

    private fun hostOf(base: String): String = runCatching { URI(base).host }.getOrNull() ?: ""

    fun thumbUrl(episode: Episode): String = "${config.base}/cinema/thumb?camera=${episode.camera}&at=${episode.startedAt + 2}"

    /** Le direct d'une caméra en MP4 continu, en 4K (`?q=hd`) ou léger. */
    fun liveUrl(camera: String, hd: Boolean): String = "${config.base}/cinema/live/$camera/live.mp4${if (hd) "?q=hd" else ""}"

    /** L'image la plus récente d'une caméra (la vignette de la carte « En direct »). */
    fun nowThumbUrl(camera: String, now: Long): String = "${config.base}/cinema/thumb?camera=$camera&at=$now"

    fun clipUrl(episode: Episode, hd: Boolean): String = "${config.base}/cinema/clip/${episode.id}${if (hd) "?q=hd" else ""}"

    /** La bibliothèque : appelé hors du fil principal. */
    fun library(): Library {
        val request = Request.Builder().url("${config.base}/cinema/library").build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error(
                when (response.code) {
                    401 -> "Clé refusée (HTTP 401) : la clé de la télé est fausse."
                    403 -> "Refusé (HTTP 403) : la télé doit être sur le réseau de la maison."
                    else -> "La maison répond HTTP ${response.code}."
                },
            )
            val json = JSONObject(response.body?.string() ?: error("Réponse vide."))
            val cameras = json.getJSONArray("cameras")
            val series = (0 until cameras.length()).map { index ->
                val camera = cameras.getJSONObject(index)
                val episodes = camera.getJSONArray("episodes")
                Series(
                    id = camera.getString("id"),
                    name = camera.getString("name"),
                    portrait = camera.optString("orientation") == "portrait",
                    episodes = (0 until episodes.length()).map { episode(episodes.getJSONObject(it)) },
                )
            }
            val savedJson = json.getJSONArray("saved")
            return Library(series, (0 until savedJson.length()).map { episode(savedJson.getJSONObject(it)) })
        }
    }

    private fun episode(item: JSONObject) = Episode(
        id = item.getString("id"),
        camera = item.getString("camera"),
        label = item.optString("label", "motion"),
        startedAt = item.getLong("startedAt"),
        endedAt = if (item.isNull("endedAt")) null else item.getLong("endedAt"),
        saved = item.optBoolean("saved"),
        note = item.optString("note"),
        emoji = item.optString("emoji"),
        portrait = item.optString("orientation") == "portrait",
        hd = item.optBoolean("hd"),
    )
}
