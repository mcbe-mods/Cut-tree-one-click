const { existsSync, mkdirSync } = require('fs')
const { exec } = require('child_process')

const dist = './dist'
const filesToPack = ['./pack_icon.png', './manifest.json', 'LICENSE', './scripts']
const outputZipFile = `${dist}/Cut_tree_one_click_v.mcpack`

if (!existsSync(dist)) mkdirSync(dist)

function compressFiles(files, output, callback) {
  // Windows use tar compress
  if (process.platform === 'win32') {
    const tarCommand = `tar -cf ${output} ${files.join(' ')}`
    exec(tarCommand, callback)
  }
  // macOS and Linux use zip compress
  else {
    const zipCommand = `zip -r ${output} ${files.join(' ')}`
    exec(zipCommand, callback)
  }
}

compressFiles(filesToPack, outputZipFile, (error, stdout, stderr) => {
  if (error) {
    console.error(`compress error: ${error.message}`)
    return
  }
  console.log('file build success')
})
