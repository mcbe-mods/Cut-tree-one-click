import { fileURLToPath } from 'url'
import { join } from 'path'
import { removeSync } from 'fs-extra/esm'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const distPath = join(__dirname, '../dist')

removeSync(distPath)
