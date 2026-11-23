package house.cinema

import android.content.Context

/**
 * Où est la maison et avec quelle clé (celle de la télé, `TV_KEY`). Ni l'une ni l'autre n'est dans le code : adb les donne une fois et le Player les garde.
 */
class Config(context: Context) {
    private val prefs = context.getSharedPreferences("house", Context.MODE_PRIVATE)

    var base: String
        get() = prefs.getString("base", "") ?: ""
        set(value) = prefs.edit().putString("base", value.trimEnd('/')).apply()

    var key: String
        get() = prefs.getString("key", "") ?: ""
        set(value) = prefs.edit().putString("key", value).apply()

    val ready: Boolean get() = base.startsWith("https://") && key.length >= 16

    /** L'avancement d'un clip : sa position (ms) et sa durée (ms), 0 si on ne l'a pas commencé. */
    fun progress(id: String): Pair<Long, Long> {
        val raw = prefs.getString("p:$id", null) ?: return 0L to 0L
        val parts = raw.split(':')
        return (parts.getOrNull(0)?.toLongOrNull() ?: 0L) to (parts.getOrNull(1)?.toLongOrNull() ?: 0L)
    }

    /** Garde l'avancement ; au-delà de 95 % (ou à la fin) le clip est fini : on l'oublie et on le marque vu. */
    fun saveProgress(id: String, position: Long, duration: Long) {
        if (duration <= 0) return
        if (position >= duration * 95 / 100) {
            prefs.edit().remove("p:$id").apply()
            markWatched(id)
        } else if (position > 1000) {
            prefs.edit().putString("p:$id", "$position:$duration").apply()
        }
    }

    /** Les clips déjà regardés. */
    fun watched(): Set<String> = prefs.getStringSet("watched", emptySet()) ?: emptySet()

    fun markWatched(id: String) {
        val next = watched().toMutableSet()
        // On n'en garde pas plus de 2000 : les plus anciens identifiants n'ont plus de clip de toute façon.
        if (next.size > 2000) next.clear()
        next.add(id)
        prefs.edit().putStringSet("watched", next).apply()
    }
}
