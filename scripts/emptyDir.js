import fs from 'fs'
import path from 'path'

export function emptyDirSync(dirPath, options = {}) {
  // If the directory does not exist, create it
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath)
    return
  }

  // Get all files and subdirectories in the directory
  const files = fs.readdirSync(dirPath)

  // Delete all files and subdirectories in the directory
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)

    if (options.ignore && options.ignore.includes(file)) {
      // Skip ignored files/directories
      continue
    }

    if (stat.isDirectory()) {
      // Recursively delete subdirectories
      emptyDirSync(filePath, options)

      // Check if subdirectory is empty before deleting it
      const subFiles = fs.readdirSync(filePath)
      if (subFiles.length === 0) {
        fs.rmdirSync(filePath)
      }
    } else {
      // Delete files
      fs.unlinkSync(filePath)
    }
  }
}

export async function emptyDir(dirPath, options = {}) {
  try {
    // If the directory does not exist, create it
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath)
      return
    }

    const files = await fs.promises.readdir(dirPath)

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file)

        if (options.ignore && options.ignore.includes(file)) {
          // Skip ignored files/directories
          return
        }

        const stat = await fs.promises.stat(filePath)

        if (stat.isDirectory()) {
          await emptyDir(filePath, options)
          await fs.promises.rmdir(filePath)
        } else {
          await fs.promises.unlink(filePath)
        }
      })
    )
  } catch (error) {
    throw new Error('Failed to empty directory: ' + error.message)
  }
}
