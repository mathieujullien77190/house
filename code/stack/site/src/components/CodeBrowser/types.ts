/** Une ligne du navigateur de fichiers : un dossier ou un fichier, avec son niveau d'indentation. */
export interface TreeNode {
  name: string
  path: string
  depth: number
  isFolder: boolean
}

export type Language = 'ts' | 'yaml' | 'json' | 'html' | 'css' | 'md' | 'dockerfile' | 'env' | 'sh' | 'plain'
export type TokenKind = 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'key' | 'variable' | 'tag' | 'attr'

/** Un morceau de code, avec sa nature pour la coloration. */
export interface Token {
  text: string
  kind: TokenKind
}

/** Une règle de coloration : la nature du morceau et l'expression qui le reconnaît (sans groupe capturant). */
export type Rule = [TokenKind, RegExp]

export interface CodeBrowserUIProps {
  /** Les lignes visibles : un fichier ou un dossier n'y est que si tous ses dossiers parents sont ouverts. */
  nodes: TreeNode[]
  /** Les dossiers ouverts (leur chemin). */
  open: Set<string>
  selected: string
  onToggle: (folder: string) => void
  onSelect: (path: string) => void
  tokens: Token[]
  explanation: string
}
