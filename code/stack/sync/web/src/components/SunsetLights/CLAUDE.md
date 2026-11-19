# SunsetLights – l'allumage au coucher du soleil

Le bloc « Allumage au coucher du soleil » de la page des réglages (`../SettingsSection/CLAUDE.md`). Il lit `GET /api/sunset-lights` et enregistre l'interrupteur par `PUT /api/sunset-lights` `{enabled}` (tout de suite).

- Il montre l'interrupteur (activé par défaut), la **prochaine heure prévue** (heure de Paris), le décalage et les lampes (identifiants du pont, `SUNSET_LIGHTS` de House Sync).
- Rien d'autre ne se règle ici : lampes et décalage sont des variables du compose.
- Le planificateur et ses règles : `../../../../src/CLAUDE.md` (« Allumage au coucher du soleil »).
