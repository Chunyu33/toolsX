import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'node:module'

export type CornerFlags = {
  tl: boolean
  tr: boolean
  br: boolean
  bl: boolean
}

export type ImageCropArgs = {
  inputPath: string
  // 说明：裁剪区域以“原图像素”为单位（不是 CSS 像素）
  rect: { x: number; y: number; width: number; height: number }
  // 说明：圆角裁剪：radius=0 表示不做圆角；corners 控制每个角是否生效
  round: { radius: number; corners: CornerFlags }
}

export type ImageCropResult = {
  outputPath: string
  tempDir: string
  width: number
  height: number
}

function getSharp() {
  const require = createRequire(import.meta.url)
  try {
    return require('sharp') as any
  } catch {
    throw new Error('缺少依赖 sharp：请在项目根目录执行 npm i sharp（安装后重启 npm run dev）。')
  }
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, Math.round(v)))
}

function normalizeCorners(corners: Partial<CornerFlags> | undefined): CornerFlags {
  return {
    tl: corners?.tl !== false,
    tr: corners?.tr !== false,
    br: corners?.br !== false,
    bl: corners?.bl !== false
  }
}

function buildRoundedRectSvg(args: { width: number; height: number; radius: number; corners: CornerFlags }): Buffer {
  const w = Math.max(1, Math.round(args.width))
  const h = Math.max(1, Math.round(args.height))
  const r = clampInt(args.radius, 0, Math.floor(Math.min(w, h) / 2))

  const rtl = args.corners.tl ? r : 0
  const rtr = args.corners.tr ? r : 0
  const rbr = args.corners.br ? r : 0
  const rbl = args.corners.bl ? r : 0

  // 说明：用 SVG path 生成“可单独控制四角圆角”的遮罩。
  // 之后用 sharp.composite + blend=dest-in 保留遮罩内像素，实现透明圆角。
  const d = [
    `M ${rtl},0`,
    `H ${w - rtr}`,
    rtr > 0 ? `A ${rtr},${rtr} 0 0 1 ${w},${rtr}` : `L ${w},0`,
    `V ${h - rbr}`,
    rbr > 0 ? `A ${rbr},${rbr} 0 0 1 ${w - rbr},${h}` : `L ${w},${h}`,
    `H ${rbl}`,
    rbl > 0 ? `A ${rbl},${rbl} 0 0 1 0,${h - rbl}` : `L 0,${h}`,
    `V ${rtl}`,
    rtl > 0 ? `A ${rtl},${rtl} 0 0 1 ${rtl},0` : `L 0,0`,
    'Z'
  ].join(' ')

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="${d}" fill="#fff"/>` +
    `</svg>`

  return Buffer.from(svg)
}

export async function cropImage(args: ImageCropArgs): Promise<ImageCropResult> {
  if (!args.inputPath) throw new Error('缺少输入图片')

  const sharp = getSharp()

  // 说明：先读取元信息，用于把裁剪区域限制在图像边界内
  const meta = await sharp(args.inputPath).metadata()
  const iw = meta.width ?? 0
  const ih = meta.height ?? 0
  if (iw <= 0 || ih <= 0) throw new Error('无法读取图片尺寸')

  const x = clampInt(args.rect.x, 0, iw - 1)
  const y = clampInt(args.rect.y, 0, ih - 1)
  const w = clampInt(args.rect.width, 1, iw - x)
  const h = clampInt(args.rect.height, 1, ih - y)

  const radius = clampInt(args.round?.radius ?? 0, 0, Math.floor(Math.min(w, h) / 2))
  const corners = normalizeCorners(args.round?.corners)

  let pipeline = sharp(args.inputPath)
    // 说明：extract 是真正的像素级裁剪，避免 renderer 侧用 canvas 导出带来的质量/色彩空间问题
    .extract({ left: x, top: y, width: w, height: h })
    // 说明：统一转成 RGBA，方便后续做透明圆角（尤其是 JPEG 输入没有 alpha）
    .ensureAlpha()

  if (radius > 0 && (corners.tl || corners.tr || corners.br || corners.bl)) {
    const mask = buildRoundedRectSvg({ width: w, height: h, radius, corners })
    pipeline = pipeline.composite([{ input: mask, blend: 'dest-in' }])
  }

  const tmpDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'toolsx-crop-'))
  const outPath = path.join(tmpDir, 'cropped.png')
  await pipeline.png().toFile(outPath)

  return { outputPath: outPath, tempDir: tmpDir, width: w, height: h }
}
