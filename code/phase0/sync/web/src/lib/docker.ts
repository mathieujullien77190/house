import type { SpecItem } from '@house/ui'
import type { DockerContainer, DockerGlobal } from '@/types'
import { formatSize } from './format'
import { formatUptime } from './specs'

const lines = (values: string[]): string => values.join('\n')

/** Depuis combien de temps le conteneur tourne (« 2 h 5 min »), vide s'il est arrêté ou si la date manque. */
export const formatRunning = (container: DockerContainer, now = Date.now()): string => {
  const started = Date.parse(container.startedAt)
  return container.state === 'running' && !Number.isNaN(started) ? formatUptime(Math.max(0, Math.round((now - started) / 1000))) : ''
}

/** Le résumé d'un conteneur pour son titre : le service, l'état et la durée. */
export const containerDetail = (container: DockerContainer): string =>
  [container.service, container.state, formatRunning(container)].filter(Boolean).join(' · ')

/** Les lignes de la fiche d'un conteneur ; une ligne manque quand il n'y a rien à dire. */
export const buildContainerItems = (container: DockerContainer): SpecItem[] => {
  const resources = container.cpu
    ? [`CPU ${container.cpu}`, `RAM ${container.memory} (${container.memoryPercent})`, `réseau ${container.network}`, `disque ${container.disk}`].join(' · ')
    : ''
  const items: SpecItem[] = [
    { id: 'image', label: 'Image', value: container.image },
    { id: 'command', label: 'Commande', value: container.command },
    {
      id: 'state',
      label: 'État',
      value: [container.state, container.state === 'exited' ? `code ${container.exitCode}` : '', container.restartPolicy ? `redémarrage : ${container.restartPolicy}` : '']
        .filter(Boolean)
        .join(' · '),
    },
    { id: 'resources', label: 'Ressources', value: resources },
    { id: 'layer', label: 'Écrit dans le conteneur', value: container.layerSize },
    { id: 'ports', label: 'Ports', value: lines(container.ports) },
    { id: 'networks', label: 'Réseaux', value: container.networks.join(', ') },
    {
      id: 'mounts',
      label: 'Volumes',
      value: lines(container.mounts.map((mount) => `${mount.source} → ${mount.destination} (${mount.writable ? 'lecture et écriture' : 'lecture seule'})`)),
    },
    { id: 'env', label: 'Variables (noms)', value: container.envNames.join(', ') },
    {
      id: 'processes',
      label: 'Processus',
      value: lines(container.processes.map((process) => `${process.pid} · ${process.user} · CPU ${process.cpu} % · RAM ${process.mem} % · ${process.command}`)),
    },
  ]
  return items.filter((item) => item.value !== '')
}

const present = (items: SpecItem[]): SpecItem[] => items.filter((item) => item.value !== '')

/** Le moteur Docker : version, stockage, journaux, ressources vues et nombre de conteneurs et d'images. */
export const buildEngineItems = (global: DockerGlobal): SpecItem[] => {
  const { engine } = global
  return present([
    { id: 'version', label: 'Version', value: engine.version ?? '' },
    { id: 'os', label: 'Hôte', value: [engine.os, engine.kernel ? `noyau ${engine.kernel}` : ''].filter(Boolean).join(' · ') },
    { id: 'storage', label: 'Stockage', value: [engine.storageDriver, engine.rootDir].filter(Boolean).join(' · ') },
    { id: 'drivers', label: 'Pilotes', value: [engine.loggingDriver ? `journaux ${engine.loggingDriver}` : '', engine.cgroupDriver ? `cgroups ${engine.cgroupDriver}` : ''].filter(Boolean).join(' · ') },
    { id: 'resources', label: 'Ressources vues', value: [engine.cpus ? `${engine.cpus} threads` : '', engine.memory ? formatSize(engine.memory) : ''].filter(Boolean).join(' · ') },
    {
      id: 'containers',
      label: 'Conteneurs',
      value: engine.containers === null ? '' : `${engine.containers} dont ${engine.running ?? 0} en marche, ${engine.stopped ?? 0} arrêtés, ${engine.paused ?? 0} en pause`,
    },
    { id: 'images', label: 'Images', value: engine.images === null ? '' : String(engine.images) },
  ])
}

export const buildImageItems = (global: DockerGlobal): SpecItem[] =>
  global.images.map((image, index) => ({
    id: `image-${index}`,
    label: `${image.repository}${image.tag && image.tag !== '<none>' ? `:${image.tag}` : ''}`,
    value: [image.size, image.created].filter(Boolean).join(' · '),
  }))

export const buildNetworkItems = (global: DockerGlobal): SpecItem[] =>
  global.networks.map((network) => ({
    id: `network-${network.name}`,
    label: network.name,
    value: [network.driver, network.subnet, network.containers.length ? `conteneurs : ${network.containers.join(', ')}` : 'aucun conteneur'].filter(Boolean).join(' · '),
  }))

export const buildDiskItems = (global: DockerGlobal): SpecItem[] =>
  global.diskUsage.map((usage) => ({
    id: `df-${usage.type}`,
    label: usage.type,
    value: `${usage.size} · ${usage.total} (${usage.active} actifs) · récupérable ${usage.reclaimable}`,
  }))

/** Les réglages du .env : une valeur masquée s'affiche « masquée » (mot de passe ou clé). */
export const buildEnvItems = (global: DockerGlobal): SpecItem[] =>
  global.env.map((setting) => ({ id: `env-${setting.name}`, label: setting.name, value: setting.value === null ? '•••••••• (masquée)' : setting.value || '(vide)' }))
