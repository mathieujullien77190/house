package house.cinema

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Text
import kotlinx.coroutines.delay

/** Au bout de ce délai de chargement, la version 4K est abandonnée pour la copie légère. */
private const val HD_PATIENCE_MS = 12_000L

/**
 * La lecture, en plein écran : un clip (la 4K H.265 quand elle existe, la copie légère H.264 si le Player ne sait pas la décoder ou met trop de temps à la charger) ou le direct d'une caméra.
 * Un message « Chargement » couvre l'écran tant que l'image n'est pas prête (un clip lourd met du temps : sans lui, l'écran noir donne l'impression d'un plantage).
 * Une barre d'avancement s'affiche au départ et à chaque touche. Un clip commencé reprend où on l'a laissé ; son avancement est gardé (barre rouge sur sa carte).
 * Retour ferme ; la fin d'un clip aussi. Une caméra posée de côté se lit tournée d'un quart de tour.
 */
@Composable
fun PlayerScreen(api: Api, config: Config, play: Play, onDone: () -> Unit) {
    val context = LocalContext.current
    val key = when (play) {
        is Play.Clip -> play.episode.id
        is Play.Live -> "live:${play.series.id}"
    }
    val portrait = when (play) {
        is Play.Clip -> play.episode.portrait
        is Play.Live -> play.series.portrait
    }
    var hd by remember(key) { mutableStateOf(if (play is Play.Clip) play.episode.hd else false) }
    var loading by remember(key, hd) { mutableStateOf(true) }
    val player = remember(key, hd) {
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(OkHttpDataSource.Factory(api.client)))
            .build()
            .apply {
                when (play) {
                    is Play.Clip -> {
                        setMediaItem(MediaItem.fromUri(api.clipUrl(play.episode, hd)))
                        // Un clip commencé reprend où on l'a laissé (sauf tout au début ou presque fini).
                        val (position, duration) = config.progress(play.episode.id)
                        if (position > 0 && duration > 0 && position < duration * 95 / 100) seekTo(position)
                    }
                    is Play.Live -> setMediaItem(MediaItem.fromUri(api.liveUrl(play.series.id, hd)))
                }
                playWhenReady = true
                prepare()
            }
    }
    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                // « Prêt » : l'image tourne ; avant (inactif, mise en mémoire) le message reste affiché.
                loading = state != Player.STATE_READY
                if (state == Player.STATE_ENDED) {
                    if (play is Play.Clip) config.saveProgress(play.episode.id, player.duration, player.duration)
                    onDone()
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                // Pas de décodeur 4K : on retombe sur la version légère ; si elle échoue aussi, on ferme.
                if (hd) hd = false else onDone()
            }
        }
        player.addListener(listener)
        onDispose {
            if (play is Play.Clip) config.saveProgress(play.episode.id, player.currentPosition, player.duration)
            player.removeListener(listener)
            player.release()
        }
    }
    // Un clip 4K qui ne démarre pas à temps est remplacé par sa copie légère.
    if (hd && play is Play.Clip) {
        LaunchedEffect(player) {
            delay(HD_PATIENCE_MS)
            if (loading) hd = false
        }
    }
    // L'avancement d'un clip est gardé toutes les deux secondes (et en quittant).
    if (play is Play.Clip) {
        LaunchedEffect(player) {
            while (true) {
                delay(2000)
                config.saveProgress(play.episode.id, player.currentPosition, player.duration)
            }
        }
    }
    BackHandler(onBack = onDone)
    // Les touches Lecture, Pause et OK de la télécommande sont prises ici : le lecteur de la vue Android ne les recevait pas toujours (une pause restait une pause).
    val focus = remember { FocusRequester() }
    val viewRef = remember { arrayOfNulls<PlayerView>(1) }
    LaunchedEffect(player) { runCatching { focus.requestFocus() } }
    val seekable = play is Play.Clip
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focus)
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.MediaPlay -> { player.play(); true }
                    Key.MediaPause -> { player.pause(); true }
                    Key.MediaPlayPause, Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                        if (player.isPlaying) player.pause() else player.play()
                        viewRef[0]?.showController()
                        true
                    }
                    Key.MediaFastForward, Key.DirectionRight -> {
                        if (seekable) player.seekTo((player.currentPosition + 10_000).coerceAtMost(player.duration.coerceAtLeast(0)))
                        viewRef[0]?.showController()
                        seekable
                    }
                    Key.MediaRewind, Key.DirectionLeft -> {
                        if (seekable) player.seekTo((player.currentPosition - 10_000).coerceAtLeast(0))
                        viewRef[0]?.showController()
                        seekable
                    }
                    else -> false
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        val view = @Composable { modifier: Modifier ->
            AndroidView(
                modifier = modifier,
                factory = {
                    PlayerView(it).apply {
                        viewRef[0] = this
                        this.player = player
                        useController = true
                        controllerShowTimeoutMs = 6000
                        keepScreenOn = true
                        // La barre d'avancement est visible dès le début.
                        showController()
                    }
                },
                update = { it.player = player },
            )
        }
        if (portrait) {
            // Tourné d'un quart de tour : largeur et hauteur sont échangées avant la rotation.
            view(Modifier.requiredSize(maxHeight, maxWidth).rotate(90f))
        } else {
            view(Modifier.fillMaxSize())
        }
        if (loading) LoadingOverlay(heavy = hd)
    }
}

/** Le message de chargement : un texte qui pulse, pour qu'on voie que l'application travaille. */
@Composable
private fun LoadingOverlay(heavy: Boolean) {
    val pulse = rememberInfiniteTransition(label = "chargement")
    val alpha by pulse.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "alpha",
    )
    Box(Modifier.fillMaxSize().background(Color(0xAA000000)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Chargement…", fontSize = 34.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.alpha(alpha))
            if (heavy) Text("Version 4K : ça peut prendre un moment", fontSize = 16.sp, color = Color(0xFFB4BCCD))
        }
    }
}
