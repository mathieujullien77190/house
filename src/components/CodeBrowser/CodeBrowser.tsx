import { useMemo, useState } from 'react'
import CodeBrowserUI from './UI'
import { DEFAULT_FILE, FILES } from './constants'
import { buildTree, explanationOf, languageOf, tokenize } from './helpers'

const CodeBrowser = () => {
  const nodes = useMemo(() => buildTree(Object.keys(FILES)), [])
  const [selected, setSelected] = useState(DEFAULT_FILE in FILES ? DEFAULT_FILE : (nodes.find((n) => !n.isFolder)?.path ?? ''))
  const tokens = useMemo(() => tokenize(FILES[selected] ?? '', languageOf(selected)), [selected])
  return (
    <CodeBrowserUI
      nodes={nodes}
      selected={selected}
      onSelect={setSelected}
      tokens={tokens}
      explanation={explanationOf(selected)}
    />
  )
}

export default CodeBrowser
