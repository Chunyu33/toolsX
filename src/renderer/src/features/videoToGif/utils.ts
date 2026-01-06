export function toLocalfileUrl(filePath: string): string {
  const p = filePath.replace(/\\/g, '/')
  return `localfile:///${encodeURIComponent(p)}`
}
