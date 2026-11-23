package house.cinema

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay

/**
 * La lecture, en plein écran : un clip (la 4K H.265 quand elle existe, la copie légère H.264 si le Player ne sait pas la décoder) ou le direct d'une caméra (HLS, 4K puis léger).
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
    BoxWithConstraints(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
        val view = @Composable { modifier: Modifier ->
            AndroidView(
                modifier = modifier,
                factory = {
                    PlayerView(it).apply {
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
    }
}
