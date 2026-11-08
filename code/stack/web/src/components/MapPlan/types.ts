import type { PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanTree } from '@house/ui'
import type { EditContext } from './edit'

/** La carte des caméras ou celle des lumières : même fond et même dessin, les lampes remplacent les caméras dans la seconde. */
export type MapMode = 'cameras' | 'lights'

/**
 * Le plan de la maison sur la carte : tous les éléments sont des données de la carte (longitude, latitude), donc ils restent exactement à leur place
 * à tout zoom. Les éléments modifiables se prennent à la souris quand le parent donne le rappel correspondant.
 */
export interface MapPlanProps extends Omit<EditContext, 'cameras' | 'trees' | 'hedges'> {
  /** Les caméras (mode caméras) ou les lampes (mode lumières) : l'autre jeu n'est pas dessiné. Par défaut les caméras. */
  mode?: MapMode
  cameras?: PlanCamera[]
  trees: PlanTree[]
  hedges: PlanHedge[]
  gates: PlanGate[]
  lamps?: PlanLamp[]
  plugs?: PlanPlug[]
  selectedCameraId?: string
  /** Les vraies caméras (leurs noms), le lien de chaque caméra du plan avec l'une d'elles (identifiant → nom), et le rappel pour le changer. */
  cameraNames?: string[]
  links?: Record<string, string>
  onLink?: (planId: string, camera: string) => void
  selectedTreeId?: string
  selectedHedgeId?: string
  /** L'écran du téléphone : la carte en plein écran, sans commandes de zoom, avec une flèche retour. */
  screen?: boolean
  onBack?: () => void
  backLabel?: string
}

/** Les props une fois complétées : rien n'y manque. */
export type ResolvedProps = Required<
  Pick<
    MapPlanProps,
    'mode' | 'cameras' | 'lamps' | 'plugs' | 'selectedCameraId' | 'cameraNames' | 'links' | 'selectedTreeId' | 'selectedHedgeId'
  >
> &
  Omit<
    MapPlanProps,
    'mode' | 'cameras' | 'lamps' | 'plugs' | 'selectedCameraId' | 'cameraNames' | 'links' | 'selectedTreeId' | 'selectedHedgeId'
  > &
  Pick<EditContext, 'cameras' | 'trees' | 'hedges'>
