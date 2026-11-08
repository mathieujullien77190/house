import type { PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanTree } from '@house/ui'
import type { EditContext } from './edit'

/**
 * Le plan de la maison sur la carte : tous les éléments sont des données de la carte (longitude, latitude), donc ils restent exactement à leur place
 * à tout zoom. Les éléments modifiables se prennent à la souris quand le parent donne le rappel correspondant.
 */
export interface MapPlanProps extends Omit<EditContext, 'cameras' | 'trees' | 'hedges'> {
  cameras: PlanCamera[]
  trees: PlanTree[]
  hedges: PlanHedge[]
  gates: PlanGate[]
  lamps: PlanLamp[]
  plugs: PlanPlug[]
  selectedCameraId: string
  /** Les vraies caméras (leurs noms), le lien de chaque caméra du plan avec l'une d'elles (identifiant → nom), et le rappel pour le changer. */
  cameraNames: string[]
  links: Record<string, string>
  onLink?: (planId: string, camera: string) => void
  selectedTreeId: string
  selectedHedgeId: string
}
