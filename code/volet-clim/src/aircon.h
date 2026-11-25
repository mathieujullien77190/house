// Pompe à chaleur Mitsubishi sans Wi-Fi : la télécommande infrarouge virtuelle (IRremoteESP8266).
#pragma once

#include <Arduino.h>

/** Ce qu'on envoie à la clim : l'état voulu, comme sur sa télécommande. Les mots sont ceux de l'API (`mode`, `fan`, `vane`, `protocol`). */
struct AirconState {
  bool power = false;
  String mode = "heat";      // auto, cool, heat, dry, fan
  float temperature = 21;    // °C
  String fan = "auto";       // auto, min, low, medium, high, max
  String vane = "auto";      // auto, highest, high, middle, low, lowest, off
  String protocol = "mitsubishi_ac";  // mitsubishi_ac (Mitsubishi Electric, ex. MSZ-SF), mitsubishi112, heavy152, heavy88
};

namespace aircon {

void begin();

/** Envoie l'état par la LED infrarouge. Faux si le protocole est inconnu ou non géré par la bibliothèque. */
bool send(const AirconState &state);

/** Le dernier état envoyé (gardé en flash : la télécommande virtuelle ne sait pas l'état réel de la clim). */
AirconState last();

/** Les protocoles proposés, séparés par des virgules (pour la page). */
String protocols();

}  // namespace aircon
