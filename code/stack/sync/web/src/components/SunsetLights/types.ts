/** L'allumage au coucher du soleil (`GET`/`PUT /api/sunset-lights`) : l'interrupteur, les lampes allumées (identifiants du pont), le décalage, la prochaine heure prévue (ISO UTC, null : coupé) et le rattrapage. */
export interface SunsetLightsSettings {
  enabled: boolean
  lights: string[]
  offset_minutes: number
  next_run: string | null
  catch_up_minutes: number
}

export interface SunsetLightsUIProps {
  settings: SunsetLightsSettings
  failed: boolean
  onChange: (enabled: boolean) => void
}
