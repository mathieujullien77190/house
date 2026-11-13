import { useMemo, useState } from 'react'
import CodeBrowserUI from './UI'
import { DEFAULT_FILE, FILES } from './constants'
import { buildTree, explanationOf, languageOf, tokenize, visibleNodes } from './helpers'

const CodeBrowser = () => {
  const nodes = useMemo(() => buildTree(Object.keys(FILES)), [])
  const [selected, setSelected] = useState(DEFAULT_FILE in FILES ? DEFAULT_FILE : (nodes.find((n) => !n.isFolder)?.path ?? ''))
  // Tous les dossiers sont fermés au départ ; un clic sur un dossier l'ouvre ou le ferme.
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (folder: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  const tokens = useMemo(() => tokenize(FILES[selected] ?? '', languageOf(selected)), [selected])
  return (
    <CodeBrowserUI
      nodes={visibleNodes(nodes, open)}
      open={open}
      selected={selected}
      onToggle={toggle}
      onSelect={setSelected}
      tokens={tokens}
      explanation={explanationOf(selected)}
    />
  )
}

export default CodeBrowser
