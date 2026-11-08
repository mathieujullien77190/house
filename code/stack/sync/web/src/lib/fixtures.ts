// Des données types, communes aux essais (hors couverture : ce n'est pas du code de la page).
import type { Docker, DockerContainer, DockerGlobal, HueBridge, NetworkInterface, Overview, Specs } from '@/types'

export const container = (patch: Partial<DockerContainer> = {}): DockerContainer => ({
  name: 'house-sync',
  service: 'sync',
  image: 'house-sync:latest',
  state: 'running',
  exitCode: null,
  startedAt: '2026-11-08T10:00:00Z',
  restartPolicy: 'unless-stopped',
  command: 'node src/index.ts',
  ports: ['8081:8081'],
  networks: ['sync_net'],
  mounts: [
    { type: 'bind', source: '/data', destination: '/data', writable: true },
    { type: 'bind', source: '/house', destination: '/house', writable: false },
  ],
  envNames: ['HOUSE_KEY', 'DATA_DIR'],
  cpu: '1.5%',
  memory: '80MiB',
  memoryPercent: '0.5%',
  network: '1kB / 2kB',
  disk: '0B / 0B',
  layerSize: '12kB',
  processes: [{ pid: '1', user: 'node', cpu: '1.0', mem: '0.5', command: 'node' }],
  ...patch,
})

export const dockerGlobal = (patch: Partial<DockerGlobal['engine']> = {}): DockerGlobal => ({
  engine: {
    version: '27.0',
    storageDriver: 'overlay2',
    loggingDriver: 'json-file',
    cgroupDriver: 'systemd',
    rootDir: '/var/lib/docker',
    os: 'Ubuntu 24.04',
    kernel: '6.8',
    cpus: 12,
    memory: 16 * 1024 ** 3,
    containers: 6,
    running: 5,
    paused: 0,
    stopped: 1,
    images: 8,
    ...patch,
  },
  images: [
    { repository: 'house-sync', tag: 'latest', size: '200MB', created: '2 days ago' },
    { repository: 'alpine', tag: '<none>', size: '', created: '' },
    { repository: 'node', tag: '', size: '1GB', created: '' },
  ],
  networks: [
    { name: 'sync_net', driver: 'bridge', subnet: '172.18.0.0/16', containers: ['sync', 'api'] },
    { name: 'vide', driver: 'bridge', subnet: '', containers: [] },
  ],
  diskUsage: [{ type: 'Images', total: '8', active: '6', size: '2GB', reclaimable: '500MB' }],
  env: [
    { name: 'DATA_DIR', value: '/data' },
    { name: 'HOUSE_KEY', value: null },
    { name: 'VIDE', value: '' },
  ],
})

export const docker = (patch: Partial<Docker> = {}): Docker => ({
  serviceAvailable: true,
  containers: [container(), container({ name: 'house-api', service: 'api' })],
  global: dockerGlobal(),
  compose: 'services:\n  sync: {}',
  ageSeconds: 3,
  ...patch,
})

export const specs = (patch: Partial<Specs> = {}): Specs => ({
  hostname: 'mini',
  os: 'Ubuntu 24.04',
  kernel: '6.8',
  architecture: 'x64',
  uptimeSeconds: 2 * 86_400 + 3 * 3_600 + 12 * 60,
  bios: '1.2.3',
  cpu: { model: 'Ryzen 5 7530U', cores: 6, threads: 12, maxMhz: 4500 },
  memory: 16 * 1024 ** 3,
  disk: { model: 'Samsung', size: 1024 ** 4, rotational: false },
  ...patch,
})

export const link = (patch: Partial<NetworkInterface> = {}): NetworkInterface => ({
  name: 'eth0',
  kind: 'ethernet',
  up: true,
  connected: true,
  speedMbps: 1000,
  duplex: 'full',
  mac: 'aa:bb',
  rxBytes: 2048,
  txBytes: 1024,
  signalDbm: null,
  ...patch,
})

export const bridge = (patch: Partial<HueBridge> = {}): HueBridge => ({
  configured: true,
  reachable: true,
  address: '192.168.1.81',
  name: 'Pont',
  model: 'BSB002',
  apiVersion: '1.60',
  softwareVersion: '1960',
  ...patch,
})

export const overview = (patch: Partial<Overview['backup']['disk']> = {}): Overview => ({
  database: {
    path: '/data/events.db',
    size: 5 * 1024 * 1024,
    tables: [
      { name: 'events', columns: ['id', 'camera', 'started_at', 'clip_path'], count: 3, filters: { match: 'camera', date: true } },
      { name: 'last_images', columns: ['camera', 'url'], count: 2 },
    ],
  },
  backup: {
    path: '/data',
    clips: { count: 2, size: 100 * 1024 * 1024 },
    snapshots: { count: 5, size: 10 * 1024 * 1024 },
    disk: { total: 1024 ** 4, free: 512 * 1024 ** 3, reserved: 50 * 1024 ** 3, ...patch },
  },
})
