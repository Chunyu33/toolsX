import { protocol } from 'electron'

function getMimeType(filePath: string): string | undefined {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.avif')) return 'image/avif'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff'
  return undefined
}

export function registerLocalfileProtocol(): void {
  protocol.registerFileProtocol('localfile', (request, callback) => {
    try {
      const url = new URL(request.url)
      const combined = `${url.host}${url.pathname}`
      const pathname = decodeURIComponent(combined)
      if (process.platform === 'win32') {
        // URL.pathname will look like: /E:/path/to/file
        const withoutLeadingSlash = pathname.replace(/^\//, '')
        let windowsPath = withoutLeadingSlash.replace(/\//g, '\\')
        // Chromium may rewrite localfile:///F:/a/b.mp4 into localfile://f/a/b.mp4
        // which becomes "f\\a\\b.mp4" here. Detect and restore drive colon.
        if (/^[A-Za-z]\\/.test(windowsPath) && !/^[A-Za-z]:\\/.test(windowsPath)) {
          windowsPath = `${windowsPath[0].toUpperCase()}:\\${windowsPath.slice(2)}`
        }
        callback({ path: windowsPath, mimeType: getMimeType(windowsPath) })
      } else {
        callback({ path: pathname, mimeType: getMimeType(pathname) })
      }
    } catch {
      callback({ error: -2 })
    }
  })
}
