// 纯前端路径工具：renderer 里不能用 Node.js 的 path（Vite 会 externalize）
// 这里用字符串处理，兼容 Windows 路径/URL 风格路径。

export function getBasename(filePath: string): string {
  const p = normalizePathSeparators(filePath)
  const idx = p.lastIndexOf('/')
  return idx >= 0 ? p.slice(idx + 1) : p
}

export function getExtname(filePath: string): string {
  const base = getBasename(filePath)
  const idx = base.lastIndexOf('.')
  return idx >= 0 ? base.slice(idx) : ''
}

export function getBasenameNoExt(filePath: string): string {
  const base = getBasename(filePath)
  const idx = base.lastIndexOf('.')
  return idx >= 0 ? base.slice(0, idx) : base
}

export function getDirname(filePath: string): string {
  const p = normalizePathSeparators(filePath)
  const idx = p.lastIndexOf('/')
  return idx >= 0 ? p.slice(0, idx) : ''
}

function normalizePathSeparators(p: string): string {
  return p.replace(/\\/g, '/')
}
