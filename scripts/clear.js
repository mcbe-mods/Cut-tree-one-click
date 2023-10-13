import { fileURLToPath } from 'url'
import { join } from 'path'
import { emptydirSync } from 'fs-extra/esm'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const distPath = join(__dirname, '../dist')

emptydirSync(distPath)
