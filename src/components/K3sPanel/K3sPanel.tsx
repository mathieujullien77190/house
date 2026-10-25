import K3sPanelUI from './UI'
import { COMMANDS, COMMANDS_PHASE1, RULES, RULES_PHASE1 } from './constants'
import { buildRows, quorumSummary } from './helpers'
import type { K3sPanelProps } from './types'

const K3sPanel = ({ nodes, phase }: K3sPanelProps) => {
  const rows = buildRows(nodes, phase)
  const quorum = quorumSummary(rows.length, phase)
  return <K3sPanelUI rows={rows} quorum={quorum.text} quorumOk={quorum.ok} rules={phase === 1 ? RULES_PHASE1 : RULES} commands={phase === 1 ? COMMANDS_PHASE1 : COMMANDS} />
}

export default K3sPanel
