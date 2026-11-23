package house.cinema

/** Un clip : l'épisode d'une série (une caméra). */
data class Episode(
    val id: String,
    val camera: String,
    /** motion, rain, foliage ou eyes. */
    val label: String,
    val startedAt: Long,
    val endedAt: Long?,
    val saved: Boolean,
    val note: String,
    val emoji: String,
    /** La caméra est posée de côté : image et vidéo se lisent tournées d'un quart de tour. */
    val portrait: Boolean,
    val hd: Boolean,
) {
    /** La durée du mouvement, en secondes (0 si le clip est en cours). */
    val seconds: Long get() = if (endedAt == null) 0 else (endedAt - startedAt).coerceAtLeast(0)
}

/** Une caméra : une série et ses épisodes, du plus récent au plus ancien. */
data class Series(val id: String, val name: String, val portrait: Boolean, val episodes: List<Episode>)

data class Library(val series: List<Series>, val saved: List<Episode>)

/** Ce qu'on lit : un clip (un épisode) ou le direct d'une caméra. */
sealed interface Play {
    data class Clip(val episode: Episode) : Play

    data class Live(val series: Series) : Play
}
