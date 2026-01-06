export function toLocalfileUrl(filePath: string): string {
  // Convert backslashes to forward slashes for URL
  const p = filePath.replace(/\\/g, '/')

  // Encode special characters in path segments (spaces, Chinese chars, etc.)
  // but keep slashes and drive colon intact
  const segments = p.split('/')
  const encoded = segments.map((seg, i) => {
    // First segment on Windows is drive letter like "C:" - keep colon
    if (i === 0 && /^[A-Za-z]:$/.test(seg)) {
      return seg
    }
    return encodeURIComponent(seg)
  }).join('/')

  return `localfile:///${encoded}`
}
