// Boîtier volet + clim : un ESP32 qui sert une page web et pilote, par radio 433 MHz (CC1101), des volets Somfy RTS et, par infrarouge,
// une pompe à chaleur Mitsubishi sans Wi-Fi. Pas de serveur à côté : la page et l'API sont ici.
#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <Update.h>
#include <vector>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiManager.h>

#include "aircon.h"
#include "config.h"
#include "page.h"
#include "somfy.h"

WebServer server(80);
Preferences settings;
float frequency = DEFAULT_MHZ;

String programsJson();
void runPrograms(const char *hhmm);

String shutterName(uint8_t id) { return settings.getString(("name" + String(id)).c_str(), "Volet " + String(id + 1)); }

/** Échappe une chaîne pour la mettre dans un JSON à la main. */
String quoted(const String &text) {
  String out = "\"";
  for (const char c : text) {
    if (c == '"' || c == '\\') out += '\\';
    if (c >= ' ') out += c;
  }
  return out + "\"";
}

void sendJson(int status, const String &body) {
  server.sendHeader("Cache-Control", "no-store");
  server.send(status, "application/json", body);
}

void sendError(int status, const char *message) { sendJson(status, String("{\"error\":") + quoted(message) + "}"); }

void handleState() {
  const AirconState a = aircon::last();
  String json = "{\"radio\":" + String(somfy::radioReady() ? "true" : "false") + ",\"mhz\":" + String(frequency, 2) + ",\"shutters\":[";
  for (uint8_t i = 0; i < SHUTTER_COUNT; i++) {
    if (i > 0) json += ",";
    json += "{\"id\":" + String(i) + ",\"name\":" + quoted(shutterName(i)) + ",\"code\":" + String(somfy::rollingCode(i)) + "}";
  }
  json += "],\"protocols\":[";
  const String names = aircon::protocols();
  int start = 0;
  while (start <= static_cast<int>(names.length())) {
    int end = names.indexOf(',', start);
    if (end < 0) end = names.length();
    if (start > 0) json += ",";
    json += quoted(names.substring(start, end));
    start = end + 1;
  }
  json += "],\"ac\":{\"power\":" + String(a.power ? "true" : "false") + ",\"mode\":" + quoted(a.mode) + ",\"temperature\":" + String(a.temperature, 0) +
          ",\"fan\":" + quoted(a.fan) + ",\"vane\":" + quoted(a.vane) + ",\"protocol\":" + quoted(a.protocol) + "},\"schedule\":{\"up\":" + quoted(settings.getString("up", "")) + ",\"down\":" + quoted(settings.getString("down", "")) + "},\"programs\":[" + programsJson() + "]}";
  sendJson(200, json);
}

void handleShutter() {
  if (!server.hasArg("id") || !server.hasArg("cmd")) return sendError(400, "id et cmd sont requis");
  const int id = server.arg("id").toInt();
  const String cmd = server.arg("cmd");
  if (id < 0 || id >= SHUTTER_COUNT) return sendError(404, "volet inconnu");
  if (!somfy::radioReady()) return sendError(503, "module radio introuvable");
  SomfyButton button;
  if (cmd == "up") button = SomfyButton::Up;
  else if (cmd == "down") button = SomfyButton::Down;
  else if (cmd == "my" || cmd == "stop") button = SomfyButton::My;
  else if (cmd == "prog") button = SomfyButton::Prog;
  else return sendError(400, "ordre inconnu");
  somfy::send(id, button);
  sendJson(200, "{\"ok\":true,\"code\":" + String(somfy::rollingCode(id)) + "}");
}

/** Vrai pour « HH:MM » (heures 0 à 23, minutes 0 à 59). */
bool validTime(const String &text) {
  if (text.length() != 5 || text[2] != ':') return false;
  for (const int i : {0, 1, 3, 4}) {
    if (!isDigit(text[i])) return false;
  }
  return text.substring(0, 2).toInt() < 24 && text.substring(3).toInt() < 60;
}

void handleSchedule() {
  const String up = server.arg("up");
  const String down = server.arg("down");
  // Vide = pas d'horaire.
  if ((!up.isEmpty() && !validTime(up)) || (!down.isEmpty() && !validTime(down))) return sendError(400, "heure au format HH:MM");
  settings.putString("up", up);
  settings.putString("down", down);
  sendJson(200, "{\"ok\":true}");
}

/** Chaque seconde : à l'heure de montée ou de descente, l'ordre part une fois ce jour-là. Il faut que l'heure ait été reçue par internet (NTP). */
void runSchedule() {
  static unsigned long lastCheck = 0;
  static int lastDay[2] = {-1, -1};
  if (millis() - lastCheck < 1000) return;
  lastCheck = millis();
  struct tm now;
  if (!getLocalTime(&now, 0)) return;
  char hhmm[6];
  snprintf(hhmm, sizeof(hhmm), "%02d:%02d", now.tm_hour, now.tm_min);
  runPrograms(hhmm);
  const int today = now.tm_year * 366 + now.tm_yday;
  const char *keys[2] = {"up", "down"};
  const SomfyButton buttons[2] = {SomfyButton::Up, SomfyButton::Down};
  for (int i = 0; i < 2; i++) {
    const String planned = settings.getString(keys[i], "");
    if (planned.isEmpty() || planned != hhmm || lastDay[i] == today) continue;
    lastDay[i] = today;
    somfy::send(0, buttons[i]);
  }
}

struct AcProgram {
  String time;
  String mode;
  int temperature;
  String fan;
  String vane;
};
constexpr size_t MAX_PROGRAMS = 8;

std::vector<AcProgram> loadPrograms() {
  std::vector<AcProgram> programs;
  const String raw = settings.getString("acprog", "");
  int start = 0;
  while (start < static_cast<int>(raw.length())) {
    int end = raw.indexOf(';', start);
    if (end < 0) end = raw.length();
    const String line = raw.substring(start, end);
    start = end + 1;
    String parts[5];
    int from = 0;
    int count = 0;
    while (count < 5) {
      int comma = line.indexOf(',', from);
      if (comma < 0) comma = line.length();
      parts[count++] = line.substring(from, comma);
      from = comma + 1;
      if (from > static_cast<int>(line.length())) break;
    }
    if (count == 5) programs.push_back({parts[0], parts[1], parts[2].toInt(), parts[3], parts[4]});
  }
  return programs;
}

void savePrograms(const std::vector<AcProgram> &programs) {
  String raw;
  for (const AcProgram &p : programs) {
    if (!raw.isEmpty()) raw += ";";
    raw += p.time + "," + p.mode + "," + String(p.temperature) + "," + p.fan + "," + p.vane;
  }
  settings.putString("acprog", raw);
}

bool oneOf(const String &value, std::initializer_list<const char *> allowed) {
  for (const char *item : allowed) {
    if (value == item) return true;
  }
  return false;
}

String programsJson() {
  String json;
  for (const AcProgram &p : loadPrograms()) {
    if (!json.isEmpty()) json += ",";
    json += "{\"time\":" + quoted(p.time) + ",\"mode\":" + quoted(p.mode) + ",\"temperature\":" + String(p.temperature) + ",\"fan\":" + quoted(p.fan) + ",\"vane\":" + quoted(p.vane) + "}";
  }
  return json;
}

void handleProgramAdd() {
  AcProgram program{server.arg("time"), server.arg("mode"), static_cast<int>(constrain(server.arg("temp").toInt(), 16, 31)), server.arg("fan"), server.arg("vane")};
  if (!validTime(program.time)) return sendError(400, "heure au format HH:MM");
  if (!oneOf(program.mode, {"auto", "cool", "heat", "dry", "fan"}) || !oneOf(program.fan, {"auto", "min", "low", "medium", "high", "max"}) ||
      !oneOf(program.vane, {"auto", "highest", "high", "middle", "low", "lowest", "off"}))
    return sendError(400, "réglage inconnu");
  std::vector<AcProgram> programs = loadPrograms();
  if (programs.size() >= MAX_PROGRAMS) return sendError(400, "huit programmes au plus");
  // Rangé par heure : le nouveau passe avant le premier plus tardif.
  size_t index = 0;
  while (index < programs.size() && programs[index].time <= program.time) index++;
  programs.insert(programs.begin() + index, program);
  savePrograms(programs);
  sendJson(200, "{\"ok\":true}");
}

void handleProgramDelete() {
  std::vector<AcProgram> programs = loadPrograms();
  const int index = server.arg("index").toInt();
  if (index < 0 || index >= static_cast<int>(programs.size())) return sendError(404, "programme inconnu");
  programs.erase(programs.begin() + index);
  savePrograms(programs);
  sendJson(200, "{\"ok\":true}");
}

/** À chaque nouvelle minute : les programmes de la clim dont l'heure est celle-ci envoient leurs réglages (clim allumée, famille de télécommande en cours). */
void runPrograms(const char *hhmm) {
  static String lastMinute = "";
  if (lastMinute == hhmm) return;
  lastMinute = hhmm;
  for (const AcProgram &p : loadPrograms()) {
    if (p.time != hhmm) continue;
    AirconState state = aircon::last();
    state.power = true;
    state.mode = p.mode;
    state.temperature = p.temperature;
    state.fan = p.fan;
    state.vane = p.vane;
    aircon::send(state);
  }
}

void handleName() {
  const int id = server.arg("id").toInt();
  if (id < 0 || id >= SHUTTER_COUNT) return sendError(404, "volet inconnu");
  String name = server.arg("name");
  name.trim();
  if (name.isEmpty() || name.length() > 30) return sendError(400, "nom de 1 à 30 caractères");
  settings.putString(("name" + String(id)).c_str(), name);
  sendJson(200, "{\"ok\":true}");
}

void handleFrequency() {
  const float mhz = server.arg("mhz").toFloat();
  if (mhz < 433.0f || mhz > 434.0f) return sendError(400, "fréquence entre 433 et 434 MHz");
  frequency = mhz;
  settings.putFloat("mhz", mhz);
  somfy::setFrequency(mhz);
  sendJson(200, "{\"mhz\":" + String(mhz, 2) + "}");
}

void handleAc() {
  AirconState state = aircon::last();
  if (server.hasArg("power")) state.power = server.arg("power").toInt() != 0;
  if (server.hasArg("mode")) state.mode = server.arg("mode");
  if (server.hasArg("temp")) state.temperature = constrain(server.arg("temp").toFloat(), 16.0f, 31.0f);
  if (server.hasArg("fan")) state.fan = server.arg("fan");
  if (server.hasArg("vane")) state.vane = server.arg("vane");
  if (server.hasArg("protocol")) state.protocol = server.arg("protocol");
  if (!aircon::send(state)) return sendError(400, "famille de télécommande inconnue");
  sendJson(200, "{\"ok\":true}");
}

/** Mise à jour du programme depuis le navigateur : l'en-tête X-Update-Key doit valoir OTA_PASSWORD. Le Wi-Fi et les codes tournants (mémoire NVS) ne sont pas touchés. */
bool updateAllowed() { return server.header("X-Update-Key") == OTA_PASSWORD; }

void handleUpdateDone() {
  if (!updateAllowed()) return sendError(401, "mot de passe de mise à jour faux");
  const bool ok = !Update.hasError();
  sendJson(ok ? 200 : 500, ok ? "{\"ok\":true}" : "{\"error\":\"échec de la mise à jour\"}");
  if (ok) {
    delay(500);
    ESP.restart();
  }
}

void handleUpdateUpload() {
  if (!updateAllowed()) return;
  HTTPUpload &upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    Update.begin(UPDATE_SIZE_UNKNOWN);
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    Update.write(upload.buf, upload.currentSize);
  } else if (upload.status == UPLOAD_FILE_END) {
    Update.end(true);
  }
}

void setup() {
  Serial.begin(115200);
  settings.begin("box", false);
  frequency = settings.getFloat("mhz", DEFAULT_MHZ);

  // Radio et infrarouge d'abord : le boîtier est utilisable même si le Wi-Fi tarde.
  Serial.println(somfy::begin(frequency) ? "CC1101 : ok" : "CC1101 : introuvable (vérifier les 8 fils)");
  aircon::begin();

  // Premier démarrage : le boîtier crée un Wi-Fi temporaire « volet-clim-reglage » pour qu'on lui donne le Wi-Fi de la maison.
  WiFi.setHostname(HOSTNAME);
  WiFiManager manager;
  manager.setConfigPortalTimeout(300);
  if (!manager.autoConnect(SETUP_AP)) {
    Serial.println("Wi-Fi : pas de connexion, redémarrage");
    delay(1000);
    ESP.restart();
  }
  Serial.println("Wi-Fi : " + WiFi.localIP().toString());
  MDNS.begin(HOSTNAME);
  configTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "pool.ntp.org", "time.google.com");

  ArduinoOTA.setHostname(HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  ArduinoOTA.begin();

  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html; charset=utf-8", PAGE); });
  server.on("/api/state", HTTP_GET, handleState);
  server.on("/api/shutter", HTTP_POST, handleShutter);
  server.on("/api/name", HTTP_POST, handleName);
  server.on("/api/schedule", HTTP_POST, handleSchedule);
  server.on("/api/ac/program", HTTP_POST, handleProgramAdd);
  server.on("/api/ac/program/delete", HTTP_POST, handleProgramDelete);
  server.on("/api/frequency", HTTP_POST, handleFrequency);
  server.on("/api/ac", HTTP_POST, handleAc);
  const char *headers[] = {"X-Update-Key"};
  server.collectHeaders(headers, 1);
  server.on("/api/update", HTTP_POST, handleUpdateDone, handleUpdateUpload);
  server.onNotFound([]() { sendError(404, "not found"); });
  server.begin();
}

void loop() {
  server.handleClient();
  runSchedule();
  ArduinoOTA.handle();
}
