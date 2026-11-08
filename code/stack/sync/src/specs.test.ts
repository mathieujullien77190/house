// Tests des caractéristiques de la machine (faux /proc et /sys dans un dossier temporaire).
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseCpuInfo, parseOsRelease, readSpecs } from './specs.ts'
import { tempDir } from './testing.ts'

test('parseOsRelease : le nom joli, avec ou sans guillemets', () => {
  assert.equal(parseOsRelease('NAME=Ubuntu\nPRETTY_NAME="Ubuntu 24.04 LTS"\n'), 'Ubuntu 24.04 LTS')
  assert.equal(parseOsRelease('PRETTY_NAME=Alpine'), 'Alpine')
  assert.equal(parseOsRelease('NAME=x'), '')
})

test('parseCpuInfo : modèle, cœurs et threads', () => {
  const info = 'processor : 0\nmodel name : Ryzen 5 7530U\ncpu cores : 6\nprocessor : 1\nmodel name : Ryzen 5 7530U\n'
  assert.deepEqual(parseCpuInfo(info), { model: 'Ryzen 5 7530U', cores: 6, threads: 2 })
  assert.deepEqual(parseCpuInfo('processor : 0\nprocessor : 1\nmodel name : X'), { model: 'X', cores: 2, threads: 2 })
  assert.equal(parseCpuInfo('processor : 0'), null)
})

const write = (root: string, files: Record<string, string>) => {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(`${root}/${name}/..`, { recursive: true })
    writeFileSync(`${root}/${name}`, content)
  }
}

test('readSpecs : tout est lu', async () => {
  const root = tempDir()
  write(root, {
    'proc/cpuinfo': 'processor : 0\nmodel name : Ryzen\ncpu cores : 1\n',
    'proc/meminfo': 'MemTotal: 2000 kB\n',
    'sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq': '4500000\n',
    'sys/class/dmi/id/bios_version': ' 1.2.3 \n',
    'sys/block/sdb/size': '10',
    'sys/block/nvme0n1/size': '2000000',
    'sys/block/nvme0n1/device/model': 'Samsung SSD \n',
    'sys/block/nvme0n1/queue/rotational': '0\n',
    'sys/block/loop0/size': '5',
    'host/hostname': 'minipc\n',
    'host/os-release': 'PRETTY_NAME="Ubuntu"\n',
  })
  const specs = await readSpecs(root, { hostname: `${root}/host/hostname`, osRelease: `${root}/host/os-release` })
  assert.equal(specs.hostname, 'minipc')
  assert.equal(specs.os, 'Ubuntu')
  assert.equal(specs.bios, '1.2.3')
  assert.deepEqual(specs.cpu, { model: 'Ryzen', cores: 1, threads: 1, maxMhz: 4500 })
  assert.equal(specs.memory, 2048000)
  assert.deepEqual(specs.disk, { model: 'Samsung SSD', size: 1024000000, rotational: false })
  assert.equal(typeof specs.kernel, 'string')
  assert.equal(typeof specs.architecture, 'string')
  assert.equal(typeof specs.uptimeSeconds, 'number')
})

test('readSpecs : un disque sans modèle prend son fabricant, puis son nom ; à plateaux', async () => {
  const root = tempDir()
  write(root, { 'sys/block/sda/size': '8', 'sys/block/sda/device/vendor': 'ATA \n', 'sys/block/sda/queue/rotational': '1' })
  assert.deepEqual((await readSpecs(root)).disk, { model: 'ATA', size: 4096, rotational: true })
  const bare = tempDir()
  write(bare, { 'sys/block/vda/size': '2' })
  assert.equal((await readSpecs(bare)).disk?.model, 'vda')
})

test('readSpecs : rien de lisible', async () => {
  const root = tempDir()
  write(root, { 'sys/block/sda/size': '0', 'proc/cpuinfo': 'processor : 0', 'proc/meminfo': 'rien' })
  const specs = await readSpecs(root)
  assert.deepEqual([specs.cpu, specs.memory, specs.disk, specs.bios], [null, null, null, null])
  const none = await readSpecs(`${root}/absent`)
  assert.equal(none.disk, null)
})

test('readSpecs : sans paramètre, la machine réelle (valeurs par défaut)', async () => {
  const specs = await readSpecs()
  assert.equal(typeof specs.hostname, 'string')
})

test('readSpecs : une fréquence absente ou nulle', async () => {
  const root = tempDir()
  write(root, { 'proc/cpuinfo': 'processor : 0\nmodel name : X', 'sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq': '0' })
  assert.equal((await readSpecs(root)).cpu?.maxMhz, null)
})

test('parseCpuInfo : un modèle sans ligne processor compte zéro thread', () => {
  assert.deepEqual(parseCpuInfo('model name : X'), { model: 'X', cores: 0, threads: 0 })
})
