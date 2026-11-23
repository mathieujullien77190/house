package house.cinema

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.Card
import androidx.compose.runtime.CompositionLocalProvider
import androidx.tv.material3.CardDefaults
import androidx.tv.material3.LocalContentColor
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.ImageLoader
import coil.compose.AsyncImage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val Night = Color(0xFF0B0F19)
private val Panel = Color(0xFF151B2B)

/** Le nom, la couleur et la pastille d'un genre de clip (les mêmes couleurs que la frise de la WebApp). */
private fun badge(label: String): Pair<String, Color> = when (label) {
    "rain" -> "Pluie" to Color(0xFF3B82F6)
    "foliage" -> "Feuillage" to Color(0xFF22C55E)
    "eyes" -> "Yeux" to Color(0xFF8B5CF6)
    else -> "Mouvement" to Color(0xFFF97316)
}

private val paris = TimeZone.getTimeZone("Europe/Paris")
private val dayFormat = SimpleDateFormat("EEE d MMM, HH:mm", Locale.FRANCE).apply { timeZone = paris }

private fun whenText(episode: Episode): String = dayFormat.format(Date(episode.startedAt * 1000)).replaceFirstChar { it.uppercase() }

private fun lengthText(episode: Episode): String = if (episode.endedAt == null) "en cours" else if (episode.seconds < 60) "${episode.seconds} s" else "${episode.seconds / 60} min ${episode.seconds % 60} s"

/** Une vignette : l'image à l'adresse donnée, tournée d'un quart de tour pour une caméra posée de côté. */
@Composable
private fun Thumb(url: String, loader: ImageLoader, portrait: Boolean, modifier: Modifier = Modifier, scale: ContentScale = ContentScale.Crop) {
    BoxWithConstraints(modifier.background(Color.Black), contentAlignment = Alignment.Center) {
        if (portrait) {
            // Image 16/9 couchée : après le quart de tour elle fait la hauteur de la case sur 9/16 de sa hauteur.
            AsyncImage(
                model = url,
                imageLoader = loader,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.width(maxHeight).height(maxHeight * 9 / 16).rotate(90f),
            )
        } else {
            AsyncImage(model = url, imageLoader = loader, contentDescription = null, contentScale = scale, modifier = Modifier.fillMaxSize())
        }
    }
}

@Composable
private fun EpisodeCard(api: Api, loader: ImageLoader, episode: Episode, watched: Boolean, progress: Float, onPlay: (Play) -> Unit) {
    val (name, color) = badge(episode.label)
    Card(
        onClick = { onPlay(Play.Clip(episode)) },
        modifier = Modifier.width(260.dp),
        scale = CardDefaults.scale(focusedScale = 1.1f),
        colors = CardDefaults.colors(containerColor = Panel),
    ) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                Thumb(api.thumbUrl(episode), loader, episode.portrait, Modifier.fillMaxSize().alpha(if (watched) 0.55f else 1f))
                // L'avancement du clip commencé, comme la barre rouge d'un service de vidéo.
                if (progress > 0f) {
                    Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().height(5.dp).background(Color(0x99000000)))
                    Box(Modifier.align(Alignment.BottomStart).fillMaxWidth(progress.coerceIn(0f, 1f)).height(5.dp).background(Color(0xFFEF4444)))
                }
            }
            Column(Modifier.padding(10.dp)) {
                Text(whenText(episode), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(9.dp).clip(CircleShape).background(color))
                    Spacer(Modifier.width(6.dp))
                    Text("$name · ${lengthText(episode)}", fontSize = 13.sp, color = Color(0xFFB4BCCD), maxLines = 1)
                    if (episode.saved) Text("  ★", fontSize = 13.sp, color = Color(0xFFFACC15))
                }
                if (episode.note.isNotBlank()) Text(episode.note, fontSize = 12.sp, color = Color(0xFF8B95A5), maxLines = 1)
            }
        }
    }
}

/** La première carte de chaque rangée : le direct de la caméra (sa dernière image, un voyant rouge). */
@Composable
private fun LiveCard(api: Api, loader: ImageLoader, series: Series, now: Long, onPlay: (Play) -> Unit) {
    val red = Color(0xFFEF4444)
    Card(
        onClick = { onPlay(Play.Live(series)) },
        modifier = Modifier.width(260.dp),
        scale = CardDefaults.scale(focusedScale = 1.1f),
        colors = CardDefaults.colors(containerColor = Panel),
    ) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                Thumb(api.nowThumbUrl(series.id, now), loader, series.portrait, Modifier.fillMaxSize())
                Row(
                    Modifier.align(Alignment.TopStart).padding(10.dp).clip(RoundedCornerShape(6.dp)).background(red).padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White))
                    Spacer(Modifier.width(6.dp))
                    Text("EN DIRECT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White, letterSpacing = 1.sp)
                }
            }
            Column(Modifier.padding(10.dp)) {
                Text("En direct", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(series.name, fontSize = 13.sp, color = Color(0xFFB4BCCD), maxLines = 1)
            }
        }
    }
}

@Composable
private fun Shelf(title: String, api: Api, loader: ImageLoader, episodes: List<Episode>, watched: Set<String>, progress: (String) -> Float, live: Series?, now: Long, onPlay: (Play) -> Unit) {
    Column {
        Text(title, fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 48.dp, bottom = 10.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            // Une rangée de caméra commence par le direct.
            if (live != null) item(key = "live") { LiveCard(api, loader, live, now, onPlay) }
            items(episodes, key = { it.id }) { episode -> EpisodeCard(api, loader, episode, episode.id in watched, progress(episode.id), onPlay) }
        }
    }
}

/** La bannière, comme l'affiche d'une série : le titre, et à droite les images du moment des caméras (le plateau de tournage). « Lecture » lance le dernier épisode. */
@Composable
private fun Hero(api: Api, loader: ImageLoader, series: List<Series>, episode: Episode, now: Long, focus: FocusRequester, onPlay: (Play) -> Unit) {
    Box(Modifier.fillMaxWidth().height(330.dp).background(Brush.linearGradient(listOf(Color(0xFF22304D), Night)))) {
        // Le plateau : une image par caméra, côte à côte, qui s'efface vers le titre.
        Row(Modifier.align(Alignment.CenterEnd).padding(end = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            series.forEach { camera ->
                Thumb(api.nowThumbUrl(camera.id, now), loader, camera.portrait, Modifier.width(230.dp).height(260.dp).clip(RoundedCornerShape(10.dp)))
            }
        }
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Night, Night.copy(alpha = 0.85f), Color.Transparent))))
        Box(Modifier.fillMaxWidth().height(90.dp).align(Alignment.BottomCenter).background(Brush.verticalGradient(listOf(Color.Transparent, Night))))
        Column(Modifier.align(Alignment.CenterStart).padding(start = 48.dp).width(560.dp)) {
            Text("UNE SÉRIE EN DIRECT", fontSize = 13.sp, letterSpacing = 3.sp, color = Color(0xFF93D43C), fontWeight = FontWeight.Bold)
            Text("Chez Matou", fontSize = 52.sp, fontWeight = FontWeight.Bold)
            Text("${series.size} caméras · un nouvel épisode à chaque mouvement", fontSize = 16.sp, color = Color(0xFFD3D9E5), modifier = Modifier.padding(vertical = 6.dp))
            Spacer(Modifier.height(10.dp))
            Button(onClick = { onPlay(Play.Clip(episode)) }, modifier = Modifier.focusRequester(focus)) { Text("▶  Dernier épisode", fontSize = 18.sp) }
        }
    }
}

/** L'accueil : la bannière, puis une rangée par caméra (une série : le direct d'abord, puis ses épisodes), puis les clips sauvegardés. */
@Composable
fun Home(api: Api, library: Library, watched: Set<String>, progress: (String) -> Float, onPlay: (Play) -> Unit) {
    val context = LocalContext.current
    val loader = remember(api) { ImageLoader.Builder(context).okHttpClient(api.client).crossfade(true).build() }
    // La bannière préfère une caméra en paysage (une caméra de côté est trop étroite pour elle).
    val firsts = library.series.mapNotNull { it.episodes.firstOrNull() }
    val newest = (firsts.filter { !it.portrait }.ifEmpty { firsts }).maxByOrNull { it.startedAt }
    // L'image du direct se renouvelle à chaque affichage de l'accueil.
    val now = remember { System.currentTimeMillis() / 1000 }
    // Le focus de la télécommande démarre sur « Lecture » ; sans lui, aucun bouton n'est choisi et OK ne fait rien.
    val focus = remember { FocusRequester() }
    LaunchedEffect(newest?.id) { runCatching { focus.requestFocus() } }
    LazyColumn(Modifier.fillMaxSize().background(Night)) {
        if (newest != null) item { Hero(api, loader, library.series, newest, now, focus, onPlay) }
        items(library.series, key = { it.id }) { series -> Shelf(series.name, api, loader, series.episodes.take(40), watched, progress, series, now, onPlay) }
        if (library.saved.isNotEmpty()) item { Shelf("Sauvegardés", api, loader, library.saved, watched, progress, null, now, onPlay) }
        item { Spacer(Modifier.height(40.dp)) }
    }
}

@Composable
fun Message(text: String, action: String? = null, onAction: () -> Unit = {}) {
    Box(Modifier.fillMaxSize().background(Night), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(80.dp)) {
            Text(text, fontSize = 24.sp, color = Color(0xFFD3D9E5))
            if (action != null) {
                Spacer(Modifier.height(24.dp))
                Button(onClick = onAction) { Text(action, fontSize = 18.sp) }
            }
        }
    }
}

@Composable
fun CinemaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = androidx.tv.material3.darkColorScheme(background = Night, surface = Night, onSurface = Color(0xFFF1F4FA))) {
        // Sans Surface autour, le texte serait noir : on pose le blanc cassé pour tout.
        CompositionLocalProvider(LocalContentColor provides Color(0xFFF1F4FA), content = content)
    }
}
