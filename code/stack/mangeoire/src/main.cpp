// Mangeoire : caméra de la gamelle et deux servos (remplir, vider), pilotés par une petite page web.
// Carte Freenove ESP32-S3 WROOM CAM. Broches caméra : celles de l'exemple CameraWebServer de Freenove.
#include <Arduino.h>
#include <WiFiManager.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "esp_camera.h"
#include "page.h"

static const char *HOSTNAME = "mangeoire";

static WebServer server(80);

static bool sensorHasJpeg = true;

// --- Servos -------------------------------------------------------------------------------------

static const int SERVO_COUNT = 2;
static const int SERVO_PIN[SERVO_COUNT] = {1, 2};
// Canaux LEDC 2 et 4 : le canal 0 et le timer 0 sont pris par l'horloge de la caméra.
static const int SERVO_CHANNEL[SERVO_COUNT] = {2, 4};
static const int PULSE_MIN_US = 500;   // 0 degré
static const int PULSE_MAX_US = 2400;  // 180 degrés
static const unsigned long HOLD_MS = 1200;  // le signal est coupé après ce délai : le servo ne force pas et ne chauffe pas

static int servoAngle[SERVO_COUNT] = {-1, -1};
static unsigned long servoCutAt[SERVO_COUNT] = {0, 0};
static bool servoOn[SERVO_COUNT] = {false, false};

static void servoCut(int i) {
  if (!servoOn[i]) return;
  ledcWrite(SERVO_CHANNEL[i], 0);
  servoOn[i] = false;
}

static void servoMove(int i, int degrees) {
  // Un seul servo à la fois : le courant est celui d'un servo.
  for (int j = 0; j < SERVO_COUNT; j++) {
    if (j != i) servoCut(j);
  }
  degrees = constrain(degrees, 0, 180);
  int us = PULSE_MIN_US + (PULSE_MAX_US - PULSE_MIN_US) * degrees / 180;
  uint32_t duty = static_cast<uint32_t>(us) * 16383UL / 20000UL;  // 14 bits sur 20 ms
  ledcWrite(SERVO_CHANNEL[i], duty);
  servoOn[i] = true;
  servoAngle[i] = degrees;
  servoCutAt[i] = millis() + HOLD_MS;
}

static void servoSetup() {
  for (int i = 0; i < SERVO_COUNT; i++) {
    ledcSetup(SERVO_CHANNEL[i], 50, 14);
    ledcAttachPin(SERVO_PIN[i], SERVO_CHANNEL[i]);
    ledcWrite(SERVO_CHANNEL[i], 0);
  }
}

static void servoLoop() {
  unsigned long now = millis();
  for (int i = 0; i < SERVO_COUNT; i++) {
    if (servoOn[i] && static_cast<long>(now - servoCutAt[i]) >= 0) servoCut(i);
  }
}

// /servo?n=1&deg=90  (n = 1 ou 2, deg = 0 à 180)
static void handleServo() {
  if (!server.hasArg("n") || !server.hasArg("deg")) {
    server.send(400, "text/plain", "n et deg");
    return;
  }
  int n = server.arg("n").toInt();
  int deg = server.arg("deg").toInt();
  if (n < 1 || n > SERVO_COUNT || deg < 0 || deg > 180) {
    server.send(400, "text/plain", "n 1-2, deg 0-180");
    return;
  }
  servoMove(n - 1, deg);
  server.send(200, "text/plain", String(deg));
}

// --- Caméra -------------------------------------------------------------------------------------

static camera_config_t baseConfig() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = 11;
  c.pin_d1 = 9;
  c.pin_d2 = 8;
  c.pin_d3 = 10;
  c.pin_d4 = 12;
  c.pin_d5 = 18;
  c.pin_d6 = 17;
  c.pin_d7 = 16;
  c.pin_xclk = 15;
  c.pin_pclk = 13;
  c.pin_vsync = 6;
  c.pin_href = 7;
  c.pin_sccb_sda = 4;
  c.pin_sccb_scl = 5;
  c.pin_pwdn = -1;
  c.pin_reset = -1;
  c.xclk_freq_hz = 20000000;
  c.jpeg_quality = 12;
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;
  return c;
}

// Capteur avec JPEG (OV2640, OV5640) sinon image brute RGB565 compressée par la carte (GC0308 de cette carte).
static bool initCamera() {
  camera_config_t c = baseConfig();
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_UXGA;
  c.fb_count = 2;
  if (esp_camera_init(&c) == ESP_OK) {
    sensorHasJpeg = true;
    return true;
  }
  c = baseConfig();
  c.pixel_format = PIXFORMAT_RGB565;
  c.frame_size = FRAMESIZE_QVGA;
  c.fb_count = 2;
  c.xclk_freq_hz = 10000000;
  sensorHasJpeg = false;
  if (esp_camera_init(&c) != ESP_OK) return false;
  Serial.printf("capteur PID=0x%04x, sans JPEG : compression par la carte\n", esp_camera_sensor_get()->id.PID);
  return true;
}

// Rend une image JPEG (à libérer avec free si own). Le tampon caméra est rendu avant l'envoi :
// le garder pendant l'envoi bloque la carte.
static bool grabJpeg(uint8_t **jpg, size_t *len, bool *own, int quality) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) return false;
  if (sensorHasJpeg) {
    // Copie : le tampon est rendu tout de suite.
    *jpg = static_cast<uint8_t *>(ps_malloc(fb->len));
    if (*jpg) memcpy(*jpg, fb->buf, fb->len);
    *len = fb->len;
    *own = true;
    esp_camera_fb_return(fb);
    return *jpg != nullptr;
  }
  *jpg = nullptr;
  *len = 0;
  *own = true;
  bool ok = frame2jpg(fb, quality, jpg, len);
  esp_camera_fb_return(fb);
  return ok;
}

// Le WiFi lit mal dans la PSRAM : l'image passe par la mémoire normale avant l'envoi.
static void handleCapture() {
  uint8_t *jpg = nullptr;
  size_t len = 0;
  bool own = false;
  if (!grabJpeg(&jpg, &len, &own, 80)) {
    server.send(503, "text/plain", "camera");
    return;
  }
  String body;
  if (body.reserve(len)) {
    body.concat(reinterpret_cast<const char *>(jpg), len);
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "image/jpeg", body);
  } else {
    server.send(507, "text/plain", "memoire");
  }
  if (own) free(jpg);
}

// Flux MJPEG. Bloque la carte tant qu'un client le regarde : la page d'accueil utilise /capture à la place.
static void handleStream() {
  WiFiClient client = server.client();
  client.print("HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\nCache-Control: no-store\r\n\r\n");
  while (client.connected()) {
    uint8_t *jpg = nullptr;
    size_t len = 0;
    bool own = false;
    if (!grabJpeg(&jpg, &len, &own, 70)) break;
    String body;
    body.reserve(len);
    body.concat(reinterpret_cast<const char *>(jpg), len);
    if (own) free(jpg);
    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", static_cast<unsigned>(len));
    client.write(reinterpret_cast<const uint8_t *>(body.c_str()), len);
    client.print("\r\n");
    servoLoop();
    delay(1);
  }
}

// --- Démarrage ----------------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nmangeoire : demarrage");
  Serial.printf("PSRAM : %u octets\n", ESP.getPsramSize());

  servoSetup();

  if (!initCamera()) {
    Serial.println("camera : echec init (PSRAM OPI ? nappe ?)");
  } else {
    Serial.println("camera : OK");
  }

  WiFi.setHostname(HOSTNAME);
  WiFiManager wm;
  wm.setConfigPortalTimeout(300);
  if (!wm.autoConnect("mangeoire-setup")) {
    ESP.restart();
  }
  WiFi.setSleep(false);
  Serial.print("WiFi OK, IP : ");
  Serial.println(WiFi.localIP());
  MDNS.begin(HOSTNAME);

  server.on("/", []() { server.send_P(200, "text/html", PAGE); });
  server.on("/capture", handleCapture);
  server.on("/stream", handleStream);
  server.on("/servo", handleServo);
  server.begin();
}

void loop() {
  server.handleClient();
  servoLoop();
}
