import { existsSync, mkdirSync, createWriteStream } from 'fs'
import archiver from 'archiver'

const dist = './dist'
const pack = './pack'
const outputZipFile = `${pack}/minecraft.mcaddon`

if (!existsSync(dist)) mkdirSync(dist)
if (!existsSync(pack)) mkdirSync(pack)

const output = createWriteStream(outputZipFile)
const archive = archiver('zip')

const distB = 'dist/behavior_pack'
const distR = 'dist/resource_pack'
if (existsSync(distB)) archive.directory(distB, 'behavior_pack')
if (existsSync(distR)) archive.directory(distR, 'resource_pack')

archive.pipe(output)
archive.finalize()
