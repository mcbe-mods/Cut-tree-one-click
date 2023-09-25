import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { copySync } from 'fs-extra/esm'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const distPath = join(__dirname, '../dist')
const BPPath = join(__dirname, '../src/behavior_pack')
const RPPath = join(__dirname, '../src/resource_pack')

if (existsSync(BPPath)) copySync(BPPath, join(distPath, 'behavior_pack'))
if (existsSync(RPPath)) copySync(RPPath, join(distPath, 'resource_pack'))
