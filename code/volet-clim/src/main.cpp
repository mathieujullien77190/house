// Boîtier volet + clim : un ESP32 qui sert une page web et pilote, par radio 433 MHz (CC1101), des volets Somfy RTS et, par infrarouge,
// une pompe à chaleur Mitsubishi sans Wi-Fi. Pas de serveur à côté : la page et l'API sont ici.
#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <Preferences.h>
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
          ",\"fan\":" + quoted(a.fan) + ",\"vane\":" + quoted(a.vane) + ",\"protocol\":" + quoted(a.protocol) + "}}";
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

  ArduinoOTA.setHostname(HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  ArduinoOTA.begin();

  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html; charset=utf-8", PAGE); });
  server.on("/api/state", HTTP_GET, handleState);
  server.on("/api/shutter", HTTP_POST, handleShutter);
  server.on("/api/name", HTTP_POST, handleName);
  server.on("/api/frequency", HTTP_POST, handleFrequency);
  server.on("/api/ac", HTTP_POST, handleAc);
  server.onNotFound([]() { sendError(404, "not found"); });
  server.begin();
}

void loop() {
  server.handleClient();
  ArduinoOTA.handle();
}
