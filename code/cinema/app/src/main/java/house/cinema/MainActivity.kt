package house.cinema

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * « Chez Matou » sur la télé, comme un service de vidéo : chaque caméra est une série, ses clips en sont les épisodes.
 * La maison (adresse) et la clé de la télé ne sont pas dans le code : adb les donne une fois (`--es base "https://…" --es key "…"`) et le Player les garde.
 */
class MainActivity : ComponentActivity() {
    private lateinit var config: Config
    private var configVersion by mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemBars()
        config = Config(this)
        readIntent(intent)
        setContent { CinemaTheme { App(config, configVersion) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        readIntent(intent)
        configVersion += 1
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
    }

    private fun readIntent(intent: Intent?) {
        intent?.getStringExtra("base")?.let { if (it.startsWith("https://")) config.base = it }
        intent?.getStringExtra("key")?.let { if (it.length >= 16) config.key = it }
    }

    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }
}

@Composable
private fun App(config: Config, version: Int) {
    val context = LocalContext.current
    val api = remember(version) { Api(context, config) }
    var library by remember(version) { mutableStateOf<Library?>(null) }
    var problem by remember(version) { mutableStateOf<String?>(null) }
    var attempt by remember(version) { mutableIntStateOf(0) }
    var watched by remember(version) { mutableStateOf(config.watched()) }
    var playing by remember { mutableStateOf<Play?>(null) }
    // Compte les retours de lecture : les barres d'avancement des cartes sont relues.
    var returns by remember { mutableIntStateOf(0) }

    if (!config.ready) {
        Message("Il manque l'adresse de la maison et la clé de la télé.\n\nadb shell am start -n house.cinema/.MainActivity --es base \"https://…:8080\" --es key \"…\"")
        return
    }
    // La bibliothèque se charge au départ, au retour d'une lecture et sur « Réessayer ».
    LaunchedEffect(version, attempt, playing == null) {
        if (playing != null) return@LaunchedEffect
        problem = null
        runCatching { withContext(Dispatchers.IO) { api.library() } }
            .onSuccess { library = it }
            .onFailure { problem = it.message ?: "Erreur inconnue." }
    }
    val current = playing
    when {
        current != null -> PlayerScreen(api, config, current) {
            watched = config.watched()
            returns += 1
            playing = null
        }
        library != null -> Home(api, library!!, watched, { id -> returns.let { progressOf(config, id) } }) { playing = it }
        problem != null -> Message(problem!!, "Réessayer") { attempt += 1 }
        else -> Message("Chargement…")
    }
}

/** La part d'un clip regardée (0 : pas commencé). */
private fun progressOf(config: Config, id: String): Float {
    val (position, duration) = config.progress(id)
    return if (duration > 0) (position.toFloat() / duration).coerceIn(0f, 1f) else 0f
}
