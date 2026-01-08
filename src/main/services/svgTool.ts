import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'node:module'

export type SvgRenderFormat = 'png' | 'jpeg' | 'webp'

export type RenderSvgArgs = {
  // 说明：svgText 由 renderer 传入。主进程只做渲染与落盘，不做 DOM 注入。
  svgText: string
  format: SvgRenderFormat
  // 说明：输出尺寸（像素）。不传则按 SVG 自身尺寸/默认密度渲染。
  width?: number
  height?: number
  // 说明：仅对 jpeg 生效；png/webp 可保留透明。
  background?: { r: number; g: number; b: number }
  // 说明：渲染密度（DPI），影响清晰度。一般 96/144/192。
  density?: number
}

export type RenderSvgResult = {
  outputPath: string
  tempDir: string
  sizeBytes: number
}

function getSharp() {
  const require = createRequire(import.meta.url)
  try {
    return require('sharp') as any
  } catch {
    throw new Error('缺少依赖 sharp：请在项目根目录执行 npm i sharp（安装后重启 npm run dev）。')
  }
}

function clampInt(v: number | undefined, min: number, max: number): number | undefined {
  if (!Number.isFinite(v)) return undefined
  return Math.min(max, Math.max(min, Math.round(v as number)))
}

function clampDensity(v: number | undefined): number {
  if (!Number.isFinite(v)) return 144
  return Math.min(600, Math.max(72, Math.round(v as number)))
}

export async function renderSvgToImage(args: RenderSvgArgs): Promise<RenderSvgResult> {
  const svgText = (args.svgText ?? '').trim()
  if (!svgText) throw new Error('SVG 代码为空')
  if (!svgText.includes('<svg')) throw new Error('未检测到 <svg> 标签，请确认输入为 SVG 代码')

  const sharp = getSharp()

  // 说明：sharp 可以直接渲染 SVG（底层依赖 librsvg），这里使用 Buffer 输入。
  // density 会影响 SVG->位图的采样密度，避免导出图片发虚。
  const density = clampDensity(args.density)
  const input = Buffer.from(svgText)

  let pipeline = sharp(input, { density })

  const w = clampInt(args.width, 1, 10000)
  const h = clampInt(args.height, 1, 10000)
  if (w || h) {
    // 说明：只要指定宽或高，就让 sharp 做等比缩放（fit='inside'），避免变形。
    pipeline = pipeline.resize(w, h, { fit: 'inside' })
  }

  if (args.format === 'png') {
    pipeline = pipeline.png()
  } else if (args.format === 'webp') {
    pipeline = pipeline.webp({ quality: 90 })
  } else {
    // 说明：JPEG 不支持透明；如果用户没指定背景色，默认白底。
    const bg = args.background ?? { r: 255, g: 255, b: 255 }
    pipeline = pipeline.flatten({ background: { r: bg.r, g: bg.g, b: bg.b } }).jpeg({ quality: 92 })
  }

  const tmpDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'toolsx-svg-'))
  const outPath = path.join(tmpDir, `out.${args.format === 'jpeg' ? 'jpg' : args.format}`)
  await pipeline.toFile(outPath)
  const st = await fs.stat(outPath)

  return { outputPath: outPath, tempDir: tmpDir, sizeBytes: st.size }
}
