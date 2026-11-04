# Lumières – le pont Philips Hue et ses automatisations


Le pont Philips Hue (`HUE_BRIDGE_IP`, clé d'application `HUE_APP_KEY` dans `.env`) est piloté par House API (`/hue`, `/hue/sensors`, `/hue/automations`, `/hue/positions`) et par l'onglet **Lumière** de la WebApp : un plan de la maison, les lampes rangées par zone (`ZONES`, `web/src/components/Lights/constants.ts`), les détecteurs de mouvement de la cage (groupe « Volière »), et les règles d'automatisation. Le pont est joignable ou non : House Sync le dit dans l'onglet Machine.

**Les règles d'automatisation vivent dans le pont** (appli Hue), pas dans House : House les lit (`GET /hue/automations`, API v2 du pont) et les affiche dans la section « Automatisations » de l'onglet Lumière. État au 3 novembre 2026 :

- **« Eteind tout »** : **tous les jours à 10:00, éteint toutes les pièces** (wc, Couloir, cuisine, Salle de bain, chambre perruches, Volière, Salon, Chambre Matou), **cage à perruches comprise**. Avant le 3 novembre elle ne visait que la lampe de la cage (« Lampe coin salon », devenue « Perruche »). Une règle ne vise que des pièces : les deux lampes qui n'ont **aucune pièce** dans le pont (« WC », « Hue ambiance spot 2 ») ne sont pas éteintes par elle. Son action est une « recette » interne du pont, qu'il ne détaille pas : c'est la même que celle des règles « Eteind… » et on la traite comme « éteindre » (à confirmer à 10:00 le lendemain d'un changement).
- **« motion 1 »** et **« motion 2 »** (détecteurs de mouvement de la cage), deux tranches par jour : **de jour** (du lever au coucher du soleil), un mouvement ne fait rien et, sans mouvement pendant 40 min (milieu) ou 10 min (proche), tout s'éteint ; **de nuit** (du coucher au lever), **un mouvement allume la scène « Lumineux »** et, sans mouvement pendant 20 min, tout s'éteint. Le pont n'a **aucune localisation configurée** (le capteur « Daylight » est « non configuré », sans latitude ni longitude) : il ne peut pas calculer le soleil. Le lever et le coucher sont donc écrits en **heures fixes**, **07:39 et 17:27 le 3 novembre 2026** (région parisienne) : **elles ne suivent pas les saisons** et sont à remettre à jour de temps en temps (mi-décembre : 08:40 et 16:55 environ ; juin : 05:50 et 21:55 environ). Pour que ce soit automatique, il faut renseigner la localisation du pont dans l'appli Hue, puis mettre dans chaque tranche `start_time` = `{"type": "sunrise"}` ou `{"type": "sunset"}` (le pont accepte ce format). Les anciennes heures (06:00 et 22:00) sont gardées sur le mini PC, hors dépôt : `~/hue-capteurs-avant-soleil-2026-11-03.json`.
- **Pièces réorganisées le 3 novembre 2026 (soir).** La pièce « Abri perruche » contenait six lampes (Perruche, étagère salon, canapé, ordi 1 et 2, lampe Chambre) : tout mouvement de nuit devant la cage allumait donc le bureau et le salon, puisque la scène « Lumineux » d'une pièce doit contenir **toutes** ses lampes (le pont refuse sinon : « Light action targets not matching lights in referenced group »). Elle a été **renommée « Volière »** et ne garde que la lampe **Perruche** et les deux détecteurs (« motion 1 » et « motion 2 ») ; les deux règles des détecteurs n'ont pas changé (même pièce, même scène, qui n'allume plus que la Perruche). Les cinq autres lampes sont dans une nouvelle pièce **« Salon »**, ajoutée à la règle « Eteind tout » (extinction de 10:00). Leurs anciennes scènes de l'Abri perruche (« Atténué », « Lecture »...) ne s'appliquent plus à elles : à refaire dans l'appli Hue pour le Salon. Sauvegardes sur le mini PC, hors dépôt : `~/hue-sauvegarde-avant-piece-salon-2026-11-03.json` (la pièce, la règle « Eteind tout » et les scènes d'avant) et `~/hue-scene-lumineux-abri-perruche-avant-2026-11-03.json`.
- **Supprimées le 3 novembre 2026** (elles ne servaient à rien) : « sécu eteind perruche » (07:00, scène « Lumineux » dans l'abri), « Allume perruche » (16:30), « Eteind perruche » (21:00), « Hhh » et « Tttt » (essais). Leur configuration est gardée sur le mini PC, hors dépôt : `~/hue-automations-supprimees-2026-11-03.json`.

## Le journal des événements (House Sync)

**Pourquoi.** Un soir (3 novembre 2026, vers 19:15), 19 lampes se sont allumées sans que personne ne sache pourquoi : le pont ne garde aucun historique et ne dit jamais qui a donné un ordre. House Sync écoute donc en continu le flux d'événements du pont et tient un journal.

**Comment ça marche.** Au démarrage, `sync/src/hueStream.ts` ouvre `https://<HUE_BRIDGE_IP>/eventstream/clip/v2` avec la clé d'application (`HUE_APP_KEY`) : le pont y écrit chaque changement, et la connexion se rouvre toute seule si elle tombe (2 s, puis plus lentement, jusqu'à 1 min). `sync/src/hueLog.ts` garde dans la table **`hue_events`** de `events.db` :

| Ressource (`resource`) | Ce qu'on garde (`change`) |
|---|---|
| `light` | `on`, `brightness` (en %), `mirek` (température de couleur), `color` |
| `scene` | `active` : la scène lancée (les retours à `inactive` sont ignorés) |
| `button` | `event: initial_press` : un appui sur un interrupteur ou une télécommande |
| `motion` | `motion: true` ou `false` : un détecteur voit ou ne voit plus de mouvement |
| `zigbee_connectivity` | `status` : `connected`, `connectivity_issue`... la liaison radio d'une lampe ou d'un appareil |

Le nom (`name`) est celui du pont (lampe, scène, interrupteur, détecteur), rechargé toutes les 10 minutes et quand un nom manque. Les températures, la luminosité ambiante et les piles ne sont pas gardées. Les lignes de plus de `HUE_LOG_DAYS` jours (365) sont supprimées chaque jour. Le journal a commencé le 3 novembre 2026 à 18:28 UTC : rien n'existe avant.

**D'où vient l'ordre : une origine devinée.** Le pont donne l'état qui a changé, **jamais celui qui l'a demandé**. `sync/src/hueOrigin.ts` rapproche donc chaque changement de ce qui s'est passé juste avant (fenêtres : interrupteur 4 s, scène 4 s, mouvement 15 s, règle à heure fixe de 2 s avant à 20 s après l'heure, reconnexion radio 2 min). Les règles à heure fixe sont lues dans le pont (`behavior_instance`, rechargées toutes les 10 minutes) avec le fuseau du pont (`Europe/Paris`) : celles qui sont actives, avec des jours et une heure de départ ; les règles au lever ou au coucher du soleil et celles des détecteurs ne sont pas des horaires.

| `origin` | Ce que ça veut dire |
|---|---|
| `switch` | un appui sur un interrupteur ou une télécommande Hue juste avant (directement, ou par la scène qu'il a lancée) |
| `sensor` | un détecteur de mouvement juste avant : c'est la règle du pont (« motion 1 » ou « motion 2 ») |
| `rule` | une règle à heure fixe du pont vient de partir : le nom de la règle est dans `detail` (« Eteind tout » : tous les jours à 10:00) |
| `scene` | une scène a été lancée, mais le pont ne dit pas par quoi |
| `power` | la lampe venait de se reconnecter au pont : **retour du courant** (elle revient allumée à fond en blanc chaud, mode « safety ») |
| `device` | l'événement d'un interrupteur, d'un détecteur ou d'une liaison radio : ce n'est pas un ordre, c'est l'appareil lui-même |
| `unknown` | rien d'autre ne l'explique : l'appli Hue, la WebApp de House ou un autre appareil du réseau |

**Ce que le journal ne sait pas.** `unknown` regroupe **l'appli Hue, la WebApp de House (onglet Lumière) et tout autre appareil du réseau** : pour le pont, ce sont les mêmes ordres (il n'y a pas d'Alexa ici). House Sync ne voit pas non plus les ordres que House API envoie au pont (rien n'a été ajouté du côté de House). Pour départager, il faut croiser avec le contexte : une lampe qui s'allume sans rien d'autre juste après une panne de courant est `power` ; un changement isolé en pleine journée est l'appli Hue ou la WebApp.

**S'en servir.**
- La page de House Sync (port 8081, onglet des tables) montre `hue_events`, les plus récents d'abord.
- `GET /api/hue-log?since=2026-11-03T18:00:00Z&origin=power&name=perruche&limit=50` (derrière la session de la page ; voir `sync/CLAUDE.md`) répond `{ status, entries }`. `status.listening` dit si le flux du pont est ouvert.
- Sur le mini PC, en SQL, en lecture seule (sans gêner House Sync) : `SELECT datetime(happened_at, 'unixepoch'), name, change, origin, detail FROM hue_events ORDER BY happened_ms DESC LIMIT 50;`
- **Un allumage général inexpliqué** : cherche beaucoup de lignes `light` avec `on: true` dans la même seconde. Si elles sont précédées de lignes `zigbee_connectivity` en `connected` (`power`), c'est un retour du courant sur le circuit des lampes. Si elles sont précédées d'une `scene`, regarde son nom : la scène « Lumineux » d'une pièce, lancée par l'appli ou par une règle. S'il n'y a rien du tout, c'est un ordre direct (`unknown`).

**Limites connues.** Le journal ne voit pas ce qui se passe quand House Sync est arrêté ou redémarre (les quelques secondes d'un `docker compose up --build sync`). Le pont n'envoie pas de rappel de ce qu'on a manqué. Une rafale d'événements (19 lampes d'un coup) fait 19 lignes.
