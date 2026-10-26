import K3sPanelUI from './UI'
import { COMMANDS, RULES } from './constants'
import { buildRows, quorumSummary } from './helpers'
import type { K3sPanelProps } from './types'

const K3sPanel = ({ nodes }: K3sPanelProps) => {
  const rows = buildRows(nodes)
  const quorum = quorumSummary(rows.length)
  return <K3sPanelUI rows={rows} quorum={quorum.text} quorumOk={quorum.ok} rules={RULES} commands={COMMANDS} />
}

export default K3sPanel
