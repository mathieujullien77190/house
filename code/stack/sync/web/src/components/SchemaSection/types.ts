/** Une boîte du schéma : un appareil ou un service. */
export interface SchemaNode {
  id: string
  title: string
  /** Ce qu'il fait ou ce qui le caractérise, en petit sous le titre. */
  detail: string
  /** La couleur de la boîte : `accent` (au cœur du système), `green` (équipement), `orange` (point d'entrée de l'extérieur), `muted` (le reste). */
  tone: 'accent' | 'green' | 'orange' | 'muted'
}

/** Un étage du schéma : des boîtes côte à côte, puis une flèche vers l'étage suivant. */
export interface SchemaTier {
  id: string
  nodes: SchemaNode[]
  /** Ce qui passe entre cet étage et le suivant (câble, protocole), écrit sur la flèche. Absent sur le dernier étage. */
  link?: string
}

export interface SchemaDiagram {
  id: string
  title: string
  /** Une phrase qui dit comment le lire. */
  intro: string
  tiers: SchemaTier[]
}

export interface SchemaUIProps {
  diagrams: SchemaDiagram[]
}
