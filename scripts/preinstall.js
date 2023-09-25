/* eslint-disable camelcase */
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const BPmanifestPath = join(__dirname, '..', 'src/behavior_pack/manifest.json')
const RPmanifestPath = join(__dirname, '..', 'src/resource_pack/manifest.json')
const BP_UUID = crypto.webcrypto.randomUUID()
const RP_UUID = crypto.webcrypto.randomUUID()

if (!existsSync(BPmanifestPath)) {
  const BP_manifest_context = {
    format_version: 2,
    header: {
      description: 'pack.description',
      name: 'pack.name',
      uuid: BP_UUID,
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        description: 'JavaScript module code',
        language: 'javascript',
        type: 'script',
        uuid: crypto.webcrypto.randomUUID(),
        version: [1, 0, 0],
        entry: 'scripts/main.js'
      }
    ],
    dependencies: [
      {
        module_name: '@minecraft/server',
        version: '1.4.0-beta'
      },
      {
        uuid: RP_UUID,
        version: [1, 0, 0]
      }
    ],
    metadata: {
      authors: ['Lete114'],
      license: 'GPL-2.0',
      url: 'https://github.com/mcbe-mods'
    }
  }

  const RP_manifest_context = {
    format_version: 2,
    header: {
      name: 'pack.name',
      description: 'pack.description',
      uuid: RP_UUID,
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        type: 'resources',
        version: [1, 0, 0],
        uuid: crypto.webcrypto.randomUUID()
      }
    ],
    dependencies: [
      {
        uuid: BP_UUID,
        version: [1, 0, 0]
      }
    ]
  }

  writeFileSync(BPmanifestPath, JSON.stringify(BP_manifest_context, '', 2))
  writeFileSync(RPmanifestPath, JSON.stringify(RP_manifest_context, '', 2))
}
