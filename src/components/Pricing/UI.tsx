import Badge from '@/components/UI/Badge'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import Stepper from '@/components/UI/Stepper'
import { LINK_CLASS, NUM_CLASS, REPO_URL, TD_CLASS, TH_CLASS } from './constants'
import type { PricingUIProps } from './types'

const PricingUI = ({ sections, total, breakdown, estimated, ports, warnings, onQuantityChange, onReset }: PricingUIProps) => {
  return (
    <Card as="section" className="mt-4">
      <h2 className="m-0 text-[1.15rem] font-semibold">Estimation des prix</h2>
      <p className="mb-3 mt-0.5 text-[0.9rem] text-muted">
        Les boutons +/− ajoutent ou retirent le composant dans le schéma. Prix « dépôt » repris de{' '}
        <a className="text-camera" href={REPO_URL} target="_blank" rel="noreferrer">
          mathieujullien77190/birds
        </a>{' '}
        (docs/schema-electronique.md) ; les autres sont des estimations à confirmer.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex flex-col">
          <span className="text-[0.8rem] text-muted">Total</span>
          <strong className="text-2xl leading-tight">{total}</strong>
          <small className="text-muted">dont {estimated} estimés</small>
          {breakdown && (
            <small className="text-muted">
              sans la phase 0 déjà achetée ({breakdown.owned}) ; avec : {breakdown.withPrevious}
            </small>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[0.8rem] text-muted">Ports switch</span>
          <strong className="text-2xl leading-tight">{ports}</strong>
        </div>
        <Button className="ml-auto" onClick={onReset}>
          Réinitialiser le schéma
        </Button>
      </div>

      {warnings.length > 0 && (
        <ul className="mb-3 list-disc rounded-lg border border-backup py-2 pl-7 pr-3 text-[0.9rem] text-backup">
          {warnings.map((w) => (
            <li key={w.id}>{w.text}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr>
              <th className={TH_CLASS}>Désignation</th>
              <th className={`${TH_CLASS} ${NUM_CLASS}`}>Prix unitaire</th>
              <th className={`${TH_CLASS} ${NUM_CLASS}`}>Quantité</th>
              <th className={`${TH_CLASS} ${NUM_CLASS}`}>Total</th>
              <th className={TH_CLASS}>Source</th>
            </tr>
          </thead>
          {sections.map((s) => (
            <tbody key={s.group}>
              <tr>
                <th colSpan={3} className={`${TD_CLASS} bg-bg text-left text-[0.85rem]`}>
                  {s.group}
                </th>
                <th className={`${TD_CLASS} ${NUM_CLASS} bg-bg text-[0.85rem]`}>{s.subtotal}</th>
                <th className={`${TD_CLASS} bg-bg`} />
              </tr>
              {s.rows.map((r) => (
                <tr key={r.id}>
                  <td className={TD_CLASS}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                        {r.label}
                      </a>
                    ) : (
                      r.label
                    )}
                    {r.note && <small className="block text-xs text-muted">{r.note}</small>}
                  </td>
                  <td className={`${TD_CLASS} ${NUM_CLASS}`}>{r.unit}</td>
                  <td className={`${TD_CLASS} ${NUM_CLASS}`}>
                    {r.editable ? (
                      <Stepper label={r.label} value={r.qty} onChange={(v) => onQuantityChange(r.editable!, v)} />
                    ) : (
                      r.qty
                    )}
                  </td>
                  <td className={`${TD_CLASS} ${NUM_CLASS}`}>{r.total}</td>
                  <td className={TD_CLASS}>
                    <Badge tone={r.source}>{r.sourceLabel}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr>
              <th colSpan={3} className="px-2.5 py-1.5 text-left text-base">
                Total
              </th>
              <th className={`px-2.5 py-1.5 text-base ${NUM_CLASS}`}>{total}</th>
              <th />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

export default PricingUI
