import { domains } from '@/domotics'
import DomainUI from './UI'
import { columnsOf } from './helpers'
import type { DomainProps } from './types'

/** L'état d'un domaine de la maison : ce qui est en place et ce qui est en préparation. */
const Domain = ({ id }: DomainProps) => {
  const domain = domains[id]
  return <DomainUI title={domain.label} intro={domain.intro} columns={columnsOf(domain)} />
}

export default Domain
