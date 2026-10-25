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
  nodes: TreeNode[]
  selected: string
  onSelect: (path: string) => void
  tokens: Token[]
  explanation: string
}
