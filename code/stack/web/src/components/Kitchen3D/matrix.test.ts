import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { createAcLabels, createMatrix, MATRIX_CAMERA, MATRIX_COLORS, MATRIX_DARK_BACKGROUND, MATRIX_LIGHT, MATRIX_SHUTTER } from './matrix'
import { KINDS } from './merge'
import { BULB_OFF } from './primitives'

/** Les couleurs d'état de la vue Matrix : en marche, en démarrage, allumée (une lampe), injoignable (une ampoule). */
const [GREEN, ORANGE, YELLOW, UNREACHABLE] = [0x2fd45a, 0xff9a1f, 0xffd23a, 0xff2a1f]

const boxAt = (name: string, parent: THREE.Object3D, material: THREE.Material = new THREE.MeshStandardMaterial({ color: 0x884422 })): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  mesh.name = name
  mesh.position.set(1, 2, 3)
  parent.add(mesh)
  return mesh
}

const group = (name: string, parent: THREE.Object3D): THREE.Group => {
  const made = new THREE.Group()
  made.name = name
  parent.add(made)
  return made
}

const linesOf = (root: THREE.Object3D): THREE.LineSegments[] => {
  const lines: THREE.LineSegments[] = []
  root.traverse((child) => {
    if ((child as THREE.LineSegments).isLineSegments) lines.push(child as THREE.LineSegments)
  })
  return lines
}

const ringsOf = (root: THREE.Object3D): THREE.Group[] => {
  const rings: THREE.Group[] = []
  root.traverse((child) => {
    if (child.type === 'Group' && child.children.length === 3 && child.children.every((part) => (part as THREE.LineLoop).isLineLoop)) rings.push(child as THREE.Group)
  })
  return rings
}

describe('les couleurs de la vue Matrix', () => {
  it('une teinte par genre, du vert, et des couleurs vives pour les caméras et les volets', () => {
    expect(Object.keys(MATRIX_COLORS).sort()).toEqual([...KINDS].sort())
    expect(new Set(Object.values(MATRIX_COLORS)).size).toBe(KINDS.length)
    // Tous les verts : le canal vert domine.
    for (const color of Object.values(MATRIX_COLORS)) {
      const rgb = new THREE.Color(color)
      expect(rgb.g).toBeGreaterThan(rgb.r)
      expect(rgb.g).toBeGreaterThan(rgb.b)
    }
    expect(MATRIX_CAMERA).toBe(0xff3b30)
    // Les volets : violet fermés, bleu ciel ouverts.
    expect(MATRIX_SHUTTER).toEqual({ closed: 0x9b59ff, open: 0x6fc8ff })
  })

  it('le thème clair : un gris par genre (ni vert ni couleur), des objets pleins foncés, un fond clair ; le thème sombre a un fond noir', () => {
    expect(Object.keys(MATRIX_LIGHT.colors).sort()).toEqual([...KINDS].sort())
    for (const color of Object.values(MATRIX_LIGHT.colors)) {
      const rgb = new THREE.Color(color)
      expect(Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b)).toBeLessThan(0.08)
    }
    const hsl = { h: 0, s: 0, l: 0 }
    expect(new THREE.Color(MATRIX_LIGHT.background).getHSL(hsl).l).toBeGreaterThan(0.85)
    expect(new THREE.Color(MATRIX_LIGHT.solid).getHSL(hsl).l).toBeLessThan(0.3)
    expect(MATRIX_DARK_BACKGROUND).toBe(0x000000)
  })
})

describe('createMatrix', () => {
  it('chaque maillage devient des arêtes à sa place, dans la teinte de son genre, et le maillage se cache ; puis tout revient', () => {
    const root = new THREE.Group()
    const shell = group('shell', root)
    const tree = group('tree', root)
    const plain = group('', root)
    const wall = boxAt('wall', shell)
    wall.scale.set(2, 1, 1)
    wall.rotation.y = 0.5
    const trunk = boxAt('trunk', tree)
    const chair = boxAt('chair', plain)
    const show = createMatrix(root)
    // Rien n'est calculé ni changé avant la première demande.
    expect(linesOf(root)).toHaveLength(0)
    show(true)
    expect([wall.visible, trunk.visible, chair.visible]).toEqual([false, false, false])
    const lines = linesOf(root)
    expect(lines).toHaveLength(3)
    expect(lines.every((line) => line.visible)).toBe(true)
    // Les arêtes sont voisines du maillage : même parent, même place, mêmes échelle et tour.
    const edgesOf = (mesh: THREE.Mesh) => lines.find((line) => line.parent === mesh.parent) as THREE.LineSegments
    expect(edgesOf(wall).position.toArray()).toEqual(wall.position.toArray())
    expect(edgesOf(wall).scale.toArray()).toEqual([2, 1, 1])
    expect(edgesOf(wall).quaternion.equals(wall.quaternion)).toBe(true)
    // La teinte vient du genre : gros œuvre, arbre, et mobilier pour ce qui n'est dans aucun groupe nommé.
    const colorOf = (mesh: THREE.Mesh) => ((edgesOf(mesh).material as THREE.LineBasicMaterial).color.getHex())
    expect(colorOf(wall)).toBe(MATRIX_COLORS.shell)
    expect(colorOf(trunk)).toBe(MATRIX_COLORS.tree)
    expect(colorOf(chair)).toBe(MATRIX_COLORS.furniture)
    // Les arêtes d'un même genre partagent leur matériau, à demi transparent.
    const material = edgesOf(wall).material as THREE.LineBasicMaterial
    expect(material.transparent).toBe(true)
    expect(material.opacity).toBeLessThan(1)
    show(false)
    expect([wall.visible, trunk.visible, chair.visible]).toEqual([true, true, true])
    expect(lines.some((line) => line.visible)).toBe(false)
  })

  it('un genre inconnu du jardin (`garden`) a sa teinte aussi', () => {
    const root = new THREE.Group()
    const garden = group('garden', root)
    const rock = boxAt('rock', garden)
    createMatrix(root)(true)
    const [edges] = linesOf(root)
    expect((edges.material as THREE.LineBasicMaterial).color.getHex()).toBe(MATRIX_COLORS.garden)
    expect(rock.visible).toBe(false)
  })

  it('ce qui était caché reste caché : ses arêtes ne se montrent pas, et il ne réapparaît pas à la sortie', () => {
    const root = new THREE.Group()
    const hidden = boxAt('hidden', root)
    const shown = boxAt('shown', root)
    hidden.visible = false
    const show = createMatrix(root)
    show(true)
    const edges = linesOf(root)
    expect(edges).toHaveLength(2)
    expect(edges.filter((line) => line.visible)).toHaveLength(1)
    show(false)
    expect(hidden.visible).toBe(false)
    expect(shown.visible).toBe(true)
    // Une seconde fois : même chose, sans recalculer les arêtes.
    show(true)
    expect(linesOf(root)).toHaveLength(2)
    expect(edges.filter((line) => line.visible)).toHaveLength(1)
    show(false)
    expect(hidden.visible).toBe(false)
  })

  it('les copies (herbe, feuilles) et un maillage sans parent sont simplement cachés, sans arêtes', () => {
    const root = new THREE.Group()
    const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial(), 4)
    root.add(grass)
    const show = createMatrix(grass)
    show(true)
    expect(grass.visible).toBe(false)
    expect(linesOf(root)).toHaveLength(0)
    show(false)
    expect(grass.visible).toBe(true)
    // Un maillage racine, sans parent.
    const lone = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())
    const showLone = createMatrix(lone)
    showLone(true)
    expect(lone.visible).toBe(false)
    showLone(false)
    expect(lone.visible).toBe(true)
  })

  it('une ampoule de luminaire ou de lampe nue garde son matériau et son maillage, entourée de trois cercles : jaunes allumée, rouges éteinte ou injoignable', () => {
    const root = new THREE.Group()
    const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xffd080 })
    const fixture = boxAt('fixture', root, fixtureMaterial)
    fixture.userData.fixture = true
    const bareMaterial = new THREE.MeshBasicMaterial({ color: BULB_OFF })
    const bare = boxAt('bare', root, bareMaterial)
    bare.userData.lampBulb = true
    const show = createMatrix(root)
    show(true)
    expect(fixture.visible).toBe(true)
    expect(bare.visible).toBe(true)
    expect(fixture.material).toBe(fixtureMaterial)
    // Pas d'arêtes pour une ampoule : seulement ses cercles, dans trois plans.
    expect(linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)).toHaveLength(0)
    const rings = ringsOf(root)
    expect(rings).toHaveLength(2)
    expect(rings.every((ring) => ring.visible && ring.scale.x === 1)).toBe(true)
    const [flat, upright, side] = rings[0].children as THREE.LineLoop[]
    const ringColor = (ring: THREE.Group) => ((ring.children[0] as THREE.LineLoop).material as THREE.LineBasicMaterial).color.getHex()
    // Les trois cercles d'une ampoule partagent un matériau, propre à elle : celle du luminaire est allumée (jaune), l'ampoule nue éteinte (rouge).
    expect(upright.material).toBe(flat.material)
    expect(side.material).toBe(flat.material)
    expect(rings.map(ringColor)).toEqual([YELLOW, MATRIX_CAMERA])
    // `tint` les remet à jour quand les lampes changent : injoignable (ampoule rouge), elle a des cercles rouges ; rallumée, jaunes.
    fixtureMaterial.color.set(UNREACHABLE)
    bareMaterial.color.set(0xffe0a0)
    show.tint()
    expect(rings.map(ringColor)).toEqual([MATRIX_CAMERA, YELLOW])
    expect([flat.rotation.x, upright.rotation.x, side.rotation.y]).toEqual([0, Math.PI / 2, Math.PI / 2])
    // Cercles de 10 cm de rayon.
    flat.geometry.computeBoundingSphere()
    expect(flat.geometry.boundingSphere?.radius).toBeCloseTo(0.1)
    show(false)
    expect(rings.some((ring) => ring.visible)).toBe(false)
    expect(fixture.visible).toBe(true)
  })

  it('une lampe qui apparaît après la première fois (ampoule nue d’une lampe lue plus tard) est prise à l’appel suivant, sans refaire le reste', () => {
    const root = new THREE.Group()
    const wall = boxAt('wall', root)
    const show = createMatrix(root)
    show(true)
    show(false)
    const late = boxAt('late', root, new THREE.MeshBasicMaterial({ color: 0x4a4640 }))
    late.userData.lampBulb = true
    show(true)
    expect(linesOf(root)).toHaveLength(1)
    expect(ringsOf(root)).toHaveLength(1)
    expect(wall.visible).toBe(false)
    expect(late.visible).toBe(true)
    show(false)
    expect(wall.visible).toBe(true)
    expect(ringsOf(root)[0].visible).toBe(false)
  })

  it('un volet roulant reste en place, en fil de fer, et le cadre de sa fenêtre prend sa couleur : bleu ciel ouvert, violet fermé ; puis il retrouve son matériau', () => {
    const root = new THREE.Group()
    const window = group('', root)
    const slats = group('', window)
    slats.userData.shutter = 'cuisine'
    const material = new THREE.MeshStandardMaterial({ color: 0xddddcc })
    const slat = boxAt('slat', slats, material)
    // Le cadre de la fenêtre (dans un sous-groupe), et un mur qui n'est pas d'elle.
    const frame = boxAt('frame', group('', window))
    const wall = boxAt('wall', group('shell', root))
    // Une seconde fenêtre, fermée d'emblée.
    const other = group('', root)
    const otherSlats = group('', other)
    otherSlats.userData.shutter = 'salon'
    otherSlats.userData.goal = 1
    const otherSlat = boxAt('slat', otherSlats)
    const show = createMatrix(root)
    show(true)
    expect(slat.visible).toBe(true)
    const wire = slat.material as THREE.MeshBasicMaterial
    expect(wire.wireframe).toBe(true)
    // Sans but connu : ouvert.
    expect(wire.color.getHex()).toBe(MATRIX_SHUTTER.open)
    expect((otherSlat.material as THREE.MeshBasicMaterial).color.getHex()).toBe(MATRIX_SHUTTER.closed)
    expect(otherSlat.material).not.toBe(wire)
    // Des arêtes pour le cadre et le mur seulement : celles du cadre à la couleur du volet, celles du mur à celle de son genre.
    const lines = linesOf(root)
    expect(lines).toHaveLength(2)
    const edgesOf = (mesh: THREE.Mesh) => (lines.find((line) => line.parent === mesh.parent) as THREE.LineSegments).material as THREE.LineBasicMaterial
    expect(edgesOf(frame).color.getHex()).toBe(MATRIX_SHUTTER.open)
    expect(edgesOf(wall).color.getHex()).toBe(MATRIX_COLORS.shell)
    // Le volet se ferme (sa part fermée à atteindre passe la moitié) : `tint` le passe au violet, lames et cadre.
    slats.userData.goal = 0.5
    show.tint()
    expect(wire.color.getHex()).toBe(MATRIX_SHUTTER.closed)
    expect(edgesOf(frame).color.getHex()).toBe(MATRIX_SHUTTER.closed)
    slats.userData.goal = 0.4
    show.tint()
    expect(wire.color.getHex()).toBe(MATRIX_SHUTTER.open)
    expect(edgesOf(frame).color.getHex()).toBe(MATRIX_SHUTTER.open)
    show(false)
    expect(slat.material).toBe(material)
  })

  it('une caméra : son modèle en blanc plein, un seul jeu de trois cercles rouges, plus larges, pour tout le modèle', () => {
    const root = new THREE.Group()
    const model = group('', root)
    model.userData.camera = 'voliere-toit'
    const body = group('', model)
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f2ee })
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0d10 })
    const barrel = boxAt('barrel', body, barrelMaterial)
    const lens = boxAt('lens', body, lensMaterial)
    const show = createMatrix(root)
    show(true)
    for (const part of [barrel, lens]) {
      expect(part.visible).toBe(true)
      const white = part.material as THREE.MeshBasicMaterial
      expect(white.color.getHex()).toBe(0xffffff)
      expect(white.wireframe).toBe(false)
    }
    // Les deux morceaux partagent le même blanc.
    expect(barrel.material).toBe(lens.material)
    const rings = ringsOf(root)
    expect(rings).toHaveLength(1)
    expect(rings[0].parent).toBe(model)
    expect(rings[0].scale.x).toBe(2)
    expect(rings[0].position.z).toBeCloseTo(0.12)
    expect(rings[0].visible).toBe(true)
    expect(linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)).toHaveLength(0)
    show(false)
    expect(barrel.material).toBe(barrelMaterial)
    expect(lens.material).toBe(lensMaterial)
    expect(rings[0].visible).toBe(false)
  })

  it('les cercles d’une caméra disent son état : verts en marche, orange en démarrage, rouges coupée ou sans état ; un état reçu avant la première vue est gardé', () => {
    const root = new THREE.Group()
    const models = ['voliere-toit', 'pommier', 'portail', 'potager'].map((name) => {
      const model = group('', root)
      model.userData.camera = name
      boxAt('barrel', model)
      return model
    })
    const show = createMatrix(root)
    // Les cercles n'existent pas encore : l'état est retenu.
    show.cameras({ 'voliere-toit': 'on', pommier: 'starting', portail: 'off' })
    expect(ringsOf(root)).toHaveLength(0)
    show(true)
    const colorOf = (model: THREE.Object3D) => ((ringsOf(model)[0].children[0] as THREE.LineLoop).material as THREE.LineBasicMaterial).color.getHex()
    expect(models.map(colorOf)).toEqual([GREEN, ORANGE, MATRIX_CAMERA, MATRIX_CAMERA])
    // Chaque caméra a son propre matériau de cercles.
    expect(new Set(models.map((model) => (ringsOf(model)[0].children[0] as THREE.LineLoop).material)).size).toBe(4)
    // Un nouvel état les recolore tout de suite.
    show.cameras({ 'voliere-toit': 'off', potager: 'on' })
    expect(models.map(colorOf)).toEqual([MATRIX_CAMERA, MATRIX_CAMERA, MATRIX_CAMERA, GREEN])
  })

  it('une clim et le radiateur de la cage : pleins, en blanc, leur voyant intact, et trois cercles verts en marche, rouges à l’arrêt ou sans état', () => {
    const root = new THREE.Group()
    // Une clim : son bloc est marqué ; son voyant et une grille sont ses enfants.
    const acMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee })
    const ac = boxAt('ac', root, acMaterial)
    ac.userData.acUnit = 'salon'
    const grille = boxAt('grille', ac)
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x8a8f96 })
    const led = boxAt('led', root, ledMaterial)
    led.userData.acLed = 'salon'
    const idle = boxAt('idle', root)
    idle.userData.acUnit = 'chambre-invite'
    // Le radiateur : un groupe marqué `plug`, son corps et son voyant.
    const heater = group('', root)
    heater.userData.plug = true
    const body = boxAt('body', heater)
    const plugLedMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4640 })
    const plugLed = boxAt('plugLed', heater, plugLedMaterial)
    plugLed.userData.plugLed = true
    const show = createMatrix(root)
    show.devices({ salon: true, 'chambre-invite': null, plug: false })
    show(true)
    // Pleins et blancs, toujours visibles, sans arêtes.
    const white = ac.material as THREE.MeshBasicMaterial
    expect(white.color.getHex()).toBe(0xffffff)
    expect(white.wireframe).toBe(false)
    for (const part of [grille, idle, body]) expect(part.material).toBe(white)
    for (const part of [ac, grille, idle, body, led, plugLed]) expect(part.visible).toBe(true)
    expect(linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)).toHaveLength(0)
    // Les voyants gardent leur matériau : leur couleur dit l'état.
    expect(led.material).toBe(ledMaterial)
    expect(plugLed.material).toBe(plugLedMaterial)
    // Un jeu de cercles par appareil : larges (50 cm) pour une clim, 35 cm et à mi-hauteur pour le radiateur.
    const rings = ringsOf(root)
    expect(rings).toHaveLength(3)
    expect(rings.map((ring) => [ring.parent, ring.scale.x, ring.position.y])).toEqual([
      [ac, 5, 0],
      [idle, 5, 0],
      [heater, 3.5, 0.27],
    ])
    expect(rings.every((ring) => ring.visible)).toBe(true)
    const colorOf = (ring: THREE.Group) => ((ring.children[0] as THREE.LineLoop).material as THREE.LineBasicMaterial).color.getHex()
    expect(rings.map(colorOf)).toEqual([GREEN, MATRIX_CAMERA, MATRIX_CAMERA])
    show.devices({ salon: false, 'chambre-invite': true, plug: true })
    expect(rings.map(colorOf)).toEqual([MATRIX_CAMERA, GREEN, GREEN])
    show(false)
    expect(ac.material).toBe(acMaterial)
    expect(rings.some((ring) => ring.visible)).toBe(false)
  })

  it('le thème : clair, les arêtes en gris et les objets pleins en gris foncé, sur fond clair ; sombre, les verts et le blanc, sur fond noir', () => {
    const root = new THREE.Group()
    const wall = boxAt('wall', group('shell', root))
    const trunk = boxAt('trunk', group('tree', root))
    const model = group('', root)
    model.userData.camera = 'portail'
    const barrel = boxAt('barrel', model)
    const show = createMatrix(root)
    show(true)
    const lines = linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)
    const edgesOf = (mesh: THREE.Mesh) => (lines.find((line) => line.parent === mesh.parent) as THREE.LineSegments).material as THREE.LineBasicMaterial
    expect(show.theme(true)).toBe(MATRIX_LIGHT.background)
    expect(edgesOf(wall).color.getHex()).toBe(MATRIX_LIGHT.colors.shell)
    expect(edgesOf(trunk).color.getHex()).toBe(MATRIX_LIGHT.colors.tree)
    expect((barrel.material as THREE.MeshBasicMaterial).color.getHex()).toBe(MATRIX_LIGHT.solid)
    expect(show.theme(false)).toBe(MATRIX_DARK_BACKGROUND)
    expect(edgesOf(wall).color.getHex()).toBe(MATRIX_COLORS.shell)
    expect(edgesOf(trunk).color.getHex()).toBe(MATRIX_COLORS.tree)
    expect((barrel.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)
  })
})

describe('createAcLabels', () => {
  /** Deux clims (dont une faite de deux morceaux marqués du même identifiant) dans une scène décalée, et une étiquette de plus pour un détecteur. */
  const stage = (context: ReturnType<typeof fakeContext2d> | null) => {
    stubCanvasContext(context)
    const root = new THREE.Group()
    root.position.set(0, -0.33, 0)
    const salon = boxAt('salon', root)
    salon.userData.acUnit = 'salon'
    const second = boxAt('salon-bis', root)
    second.userData.acUnit = 'salon'
    const guest = boxAt('guest', root)
    guest.position.set(-4, 2, -3)
    guest.userData.acUnit = 'chambre-invite'
    root.updateMatrixWorld(true)
    const labels = createAcLabels(root, [{ id: 'sdb', at: new THREE.Vector3(5, 1.9, 6) }])
    const sprites = root.children.filter((child): child is THREE.Sprite => (child as THREE.Sprite).isSprite)
    return { root, labels, sprites }
  }

  it('une étiquette par clim, 30 cm au-dessus d’elle, et une à chaque place donnée ; cachées, tournées vers l’utilisateur, visibles à travers les murs', () => {
    const { sprites } = stage(null)
    // Une seule pour les deux morceaux de la clim du salon.
    expect(sprites).toHaveLength(3)
    expect(sprites.map((sprite) => sprite.position.toArray())).toEqual([
      [1, expect.closeTo(2.3), 3],
      [-4, expect.closeTo(2.3), -3],
      [5, 1.9, 6],
    ])
    for (const sprite of sprites) {
      expect(sprite.visible).toBe(false)
      expect(sprite.material.depthTest).toBe(false)
      expect(sprite.material.transparent).toBe(true)
      expect(sprite.renderOrder).toBe(10)
      expect(sprite.scale.toArray()).toEqual([0.6, 0.3, 1])
      const canvas = (sprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement
      expect([canvas.width, canvas.height]).toEqual([256, 128])
    }
    // Chacune sa texture.
    expect(new Set(sprites.map((sprite) => sprite.material.map)).size).toBe(3)
  })

  it('sans `extra` : seulement les clims', () => {
    stubCanvasContext(null)
    const root = new THREE.Group()
    boxAt('salon', root).userData.acUnit = 'salon'
    boxAt('chair', root)
    createAcLabels(root)
    expect(root.children.filter((child) => (child as THREE.Sprite).isSprite)).toHaveLength(1)
  })

  it('`show` les montre ou les cache toutes', () => {
    const { labels, sprites } = stage(null)
    labels.show(true)
    expect(sprites.map((sprite) => sprite.visible)).toEqual([true, true, true])
    labels.show(false)
    expect(sprites.map((sprite) => sprite.visible)).toEqual([false, false, false])
  })

  it('`apply` écrit la température (à la française, un chiffre après la virgule) : verte pour une clim en marche, rouge à l’arrêt ou sans état, orange pour un détecteur ; « – » si elle est inconnue', () => {
    const context = fakeContext2d()
    const { labels, sprites } = stage(context)
    const colors: string[] = []
    context.fillText.mockImplementation(() => colors.push(context.fillStyle))
    labels.apply({ salon: 21.46, 'chambre-invite': null, sdb: 19 }, { salon: true, 'chambre-invite': false })
    expect(context.fillText.mock.calls.map(([text]) => text as string)).toEqual(['21,5°', '–', '19,0°'])
    expect(colors).toEqual(['#2fd45a', '#ff3b30', '#ff9a1f'])
    // Écrite au milieu de l'étiquette, cernée de noir pour se lire sur tout fond.
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 256, 128)
    expect(context.fillText).toHaveBeenCalledWith('21,5°', 128, 64)
    expect(context.strokeText).toHaveBeenCalledWith('21,5°', 128, 64)
    expect([context.strokeStyle, context.textAlign, context.textBaseline, context.lineWidth]).toEqual(['#000000', 'center', 'middle', 10])
    expect(context.font).toContain('bold')
    const versions = () => sprites.map((sprite) => (sprite.material.map as THREE.Texture).version)
    // (Une texture de canevas naît à la version 1 : chaque dessin en ajoute une.)
    expect(versions()).toEqual([2, 2, 2])
    // Rien n'a changé : rien n'est redessiné.
    labels.apply({ salon: 21.46, 'chambre-invite': null, sdb: 19 }, { salon: true, 'chambre-invite': false })
    expect(context.fillText).toHaveBeenCalledTimes(3)
    expect(versions()).toEqual([2, 2, 2])
    // La clim du salon s'arrête, celle de la chambre n'a plus d'état connu, une température manque : seules les étiquettes qui changent sont refaites.
    colors.length = 0
    context.fillText.mockClear()
    labels.apply({ salon: 21.46, sdb: 19 }, { salon: false, 'chambre-invite': null })
    expect(context.fillText.mock.calls.map(([text]) => text as string)).toEqual(['21,5°'])
    expect(colors).toEqual(['#ff3b30'])
    expect(versions()).toEqual([3, 2, 2])
    // Sans état des clims : toutes orange.
    colors.length = 0
    labels.apply({ salon: 21.46, sdb: 19 })
    expect(colors).toEqual(['#ff9a1f', '#ff9a1f'])
  })

  it('sans contexte 2D (le navigateur ne sait pas dessiner) : rien ne casse, la texture est quand même redemandée', () => {
    const { labels, sprites } = stage(null)
    expect(() => labels.apply({ salon: 20 }, { salon: true })).not.toThrow()
    expect((sprites[0].material.map as THREE.Texture).version).toBe(2)
  })
})
