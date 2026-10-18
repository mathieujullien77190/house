import Card from '@/components/UI/Card'
import RichText from '@/components/UI/RichText'
import { CODE_CLASS, TITLE } from './constants'
import type { K3sPanelUIProps } from './types'

const K3sPanelUI = ({ rows, quorum, quorumOk, rules, commands }: K3sPanelUIProps) => {
  return (
    <Card as="section" className="h-full">
      <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
      <p className={`mb-3 mt-0.5 text-[0.9rem] ${quorumOk ? 'text-pi' : 'text-backup'}`}><RichText text={quorum} />
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="border-b border-line px-2.5 py-1.5 font-semibold">Nœud</th>
              <th className="border-b border-line px-2.5 py-1.5 font-semibold">Étage</th>
              <th className="border-b border-line px-2.5 py-1.5 font-semibold">Rôle</th>
              <th className="border-b border-line px-2.5 py-1.5 font-semibold">Taint</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line px-2.5 py-1.5 font-semibold">{r.name}</td>
                <td className="border-b border-line px-2.5 py-1.5">{r.floor}</td>
                <td className="border-b border-line px-2.5 py-1.5">
                  <RichText text={r.role} />
                </td>
                <td className="border-b border-line px-2.5 py-1.5 font-mono text-xs">{r.taint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-1 mt-4 text-[0.95rem] font-semibold">Règles</h3>
      <ul className="m-0 list-disc pl-[18px] text-[0.9rem]">
        {rules.map((rule) => (
          <li key={rule}>
            <RichText text={rule} />
          </li>
        ))}
      </ul>

      <h3 className="mb-1 mt-4 text-[0.95rem] font-semibold">Installation</h3>
      {commands.map((c) => (
        <div key={c.title} className="mb-2">
          <span className="text-xs text-muted">{c.title}</span>
          <pre className={CODE_CLASS}>
            <code>{c.code}</code>
          </pre>
        </div>
      ))}
    </Card>
  )
}

export default K3sPanelUI
