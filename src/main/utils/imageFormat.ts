import fs from 'fs/promises'

/** HEIF/HEIC 魔数品牌码 */
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx'])

/**
 * 通过读取文件头部魔数判断是否为 HEIF/HEIC 格式。
 * 部分 iPhone 照片传到 Windows 后扩展名可能被改为 .jpg，但内部仍是 HEIF，
 * 此时 sharp 会报 "Bitstream not supported by this decoder" 之类的底层错误，
 * 对用户极不友好。这里做前置拦截，给出明确提示。
 */
export async function isHeifFile(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r')
    try {
      const buf = Buffer.alloc(12)
      const { bytesRead } = await fd.read(buf, 0, 12, 0)
      if (bytesRead < 12) return false
      // ISOBMFF 容器：offset 4-7 必须是 "ftyp"
      if (buf.toString('ascii', 4, 8) !== 'ftyp') return false
      // 主品牌码
      const brand = buf.toString('ascii', 8, 12)
      return HEIF_BRANDS.has(brand)
    } finally {
      await fd.close()
    }
  } catch {
    // 文件不可读时放行，交给 sharp 报具体错误
    return false
  }
}

/** 从 sharp 原始错误中提取对用户有用的信息 */
export function formatSharpError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)
  const msg = err.message
  // HEIF 相关错误统一给友好提示
  if (msg.includes('heif') || msg.includes('HEIF') || msg.includes('heic')) {
    return '不支持 HEIF/HEIC 格式图片。iPhone 照片请先在手机设置中将格式改为"兼容性最佳"，或使用其他工具转换为 JPG/PNG 后再试。'
  }
  // bad seek 通常是文件格式与扩展名不匹配
  if (msg.includes('bad seek')) {
    return '图片文件可能已损坏或格式与扩展名不匹配，请用其他工具将该图片重新导出为 JPG/PNG 后再试。'
  }
  // sharp 的通用 unsupported 错误
  if (msg.includes('unsupported image format') || msg.includes('Input file contains')) {
    return `图片格式不受支持：${msg}`
  }
  return msg
}
