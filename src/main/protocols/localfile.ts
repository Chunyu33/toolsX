import { protocol } from 'electron'

export function registerLocalfileProtocol(): void {
  protocol.registerFileProtocol('localfile', (request, callback) => {
    try {
      const url = new URL(request.url)
      const pathname = decodeURIComponent(url.pathname)
      if (process.platform === 'win32') {
        // URL.pathname will look like: /E:/path/to/file
        const withoutLeadingSlash = pathname.replace(/^\//, '')
        const windowsPath = withoutLeadingSlash.replace(/\//g, '\\')
        callback({ path: windowsPath })
      } else {
        callback({ path: pathname })
      }
    } catch {
      callback({ error: -2 })
    }
  })
}
