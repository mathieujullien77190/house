#!/usr/bin/env python3
"""Écrit dans $OUT (JSON) l'état des conteneurs Docker, pour la page de House Sync.

Tourne sur l'hôte, en root (il parle au socket Docker) : le conteneur de House Sync, lui, ne voit que ce fichier, monté
en lecture seule. Ne reprend jamais la valeur d'une variable d'environnement (mots de passe), seulement son nom, ni
les arguments des processus (une adresse RTSP peut y porter un mot de passe), seulement leur nom.
"""
import json
import os
import re
import subprocess
import time

PROJECT = os.environ.get('PROJECT', '/home/mathieu/house/code/phase0')
OUT = os.environ.get('OUT', PROJECT + '/data/power/docker.json')
# Une variable dont le nom évoque un secret est montrée sans sa valeur.
SECRET_NAME = re.compile(r'PASS|KEY|SECRET|TOKEN', re.IGNORECASE)
INTERVAL = 10


def run(*args):
    return subprocess.run(args, capture_output=True, text=True, timeout=25).stdout


def json_lines(text):
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def ports_of(settings):
    result = []
    for container_port, bindings in (settings.get('Ports') or {}).items():
        if bindings:
            result.extend(f"{b.get('HostPort')}→{container_port}" for b in bindings if b.get('HostIp') in ('0.0.0.0', ''))
        else:
            result.append(f'{container_port} (interne)')
    return sorted(set(result))


def processes_of(container_id):
    lines = run('docker', 'top', container_id, '-eo', 'pid,user,pcpu,pmem,comm').splitlines()[1:]
    processes = []
    for line in lines:
        parts = line.split(None, 4)
        if len(parts) == 5:
            processes.append({'pid': parts[0], 'user': parts[1], 'cpu': parts[2], 'mem': parts[3], 'command': parts[4]})
    return processes


def snapshot():
    ids = run('docker', 'ps', '-aq').split()
    if not ids:
        return []
    inspected = json.loads(run('docker', 'inspect', *ids))
    stats = {s.get('ID'): s for s in json_lines(run('docker', 'stats', '--no-stream', '--format', '{{json .}}'))}
    sizes = {p.get('ID'): p.get('Size', '') for p in json_lines(run('docker', 'ps', '-a', '-s', '--format', '{{json .}}'))}
    containers = []
    for item in inspected:
        short = item['Id'][:12]
        state = item.get('State', {})
        config = item.get('Config', {})
        labels = config.get('Labels') or {}
        stat = stats.get(short, {})
        containers.append(
            {
                'name': item['Name'].lstrip('/'),
                'service': labels.get('com.docker.compose.service', ''),
                'image': config.get('Image', ''),
                'state': state.get('Status', ''),
                'exitCode': state.get('ExitCode'),
                'startedAt': state.get('StartedAt', ''),
                'restartPolicy': (item.get('HostConfig', {}).get('RestartPolicy') or {}).get('Name', ''),
                'command': ' '.join((config.get('Entrypoint') or []) + (config.get('Cmd') or [])),
                'ports': ports_of(item.get('NetworkSettings', {})),
                'networks': sorted((item.get('NetworkSettings', {}).get('Networks') or {}).keys()),
                'mounts': [
                    {'type': m.get('Type'), 'source': m.get('Source', ''), 'destination': m.get('Destination', ''), 'writable': m.get('RW', False)}
                    for m in item.get('Mounts', [])
                ],
                'envNames': sorted(entry.split('=', 1)[0] for entry in config.get('Env') or []),
                'cpu': stat.get('CPUPerc', ''),
                'memory': stat.get('MemUsage', ''),
                'memoryPercent': stat.get('MemPerc', ''),
                'network': stat.get('NetIO', ''),
                'disk': stat.get('BlockIO', ''),
                'layerSize': sizes.get(short, ''),
                'processes': processes_of(short) if state.get('Running') else [],
            }
        )
    return sorted(containers, key=lambda c: c['name'])


def engine():
    info = json.loads(run('docker', 'info', '--format', '{{json .}}') or '{}')
    keys = {
        'version': 'ServerVersion',
        'storageDriver': 'Driver',
        'loggingDriver': 'LoggingDriver',
        'cgroupDriver': 'CgroupDriver',
        'rootDir': 'DockerRootDir',
        'os': 'OperatingSystem',
        'kernel': 'KernelVersion',
        'cpus': 'NCPU',
        'memory': 'MemTotal',
        'containers': 'Containers',
        'running': 'ContainersRunning',
        'paused': 'ContainersPaused',
        'stopped': 'ContainersStopped',
        'images': 'Images',
    }
    return {name: info.get(key) for name, key in keys.items()}


def images():
    return [
        {'repository': i.get('Repository', ''), 'tag': i.get('Tag', ''), 'size': i.get('Size', ''), 'created': i.get('CreatedSince', '')}
        for i in json_lines(run('docker', 'images', '--format', '{{json .}}'))
    ]


def networks():
    ids = [n['ID'] for n in json_lines(run('docker', 'network', 'ls', '--format', '{{json .}}'))]
    if not ids:
        return []
    result = []
    for n in json.loads(run('docker', 'network', 'inspect', *ids)):
        configs = (n.get('IPAM') or {}).get('Config') or []
        result.append(
            {
                'name': n.get('Name', ''),
                'driver': n.get('Driver', ''),
                'subnet': ', '.join(c.get('Subnet', '') for c in configs if c.get('Subnet')),
                'containers': sorted(c.get('Name', '') for c in (n.get('Containers') or {}).values()),
            }
        )
    return sorted(result, key=lambda n: n['name'])


def disk_usage():
    return [
        {'type': d.get('Type', ''), 'total': d.get('TotalCount', ''), 'active': d.get('Active', ''), 'size': d.get('Size', ''), 'reclaimable': d.get('Reclaimable', '')}
        for d in json_lines(run('docker', 'system', 'df', '--format', '{{json .}}'))
    ]


def read_text(path):
    try:
        with open(path, encoding='utf-8') as handle:
            return handle.read()
    except OSError:
        return ''


def env_settings():
    """Les réglages du .env : la valeur est remplacée par null quand le nom évoque un secret."""
    settings = []
    for line in read_text(PROJECT + '/.env').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name, value = line.split('=', 1)
        settings.append({'name': name.strip(), 'value': None if SECRET_NAME.search(name) else value.strip()})
    return settings


def global_config():
    return {
        'engine': engine(),
        'images': images(),
        'networks': networks(),
        'diskUsage': disk_usage(),
        'env': env_settings(),
    }


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    while True:
        try:
            data = {'at': int(time.time()), 'containers': snapshot(), 'global': global_config()}
            tmp = OUT + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as handle:
                json.dump(data, handle, ensure_ascii=False)
            os.chmod(tmp, 0o644)
            os.replace(tmp, OUT)
        except Exception as error:  # le service continue : Docker peut redémarrer
            print(f'house-docker : {error}', flush=True)
        time.sleep(INTERVAL)


if __name__ == '__main__':
    main()
