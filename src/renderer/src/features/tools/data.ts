import type { ToolDefinition } from '@shared/types'

export const tools: ToolDefinition[] = [
  {
    id: 'video-to-gif',
    title: '视频转 GIF',
    description: '将视频片段快速转换成 GIF，支持裁剪与帧率设置',
    route: '/tool/video-to-gif'
  },
  {
    id: 'image-convert',
    title: '图片格式转换',
    description: 'PNG/JPG/WebP/AVIF 等格式互转，支持质量设置',
    route: '/tool/image-convert'
  },
  {
    id: 'image-compress',
    title: '图片压缩',
    description: '按目标体积压缩图片，自动选择更小策略并支持预览对比',
    route: '/tool/image-compress'
  },
  {
    id: 'image-crop',
    title: '图片裁剪',
    description: '矩形裁剪 + 圆角裁剪（适合做 App Icon）',
    route: '/tool/image-crop'
  },
  {
    id: 'svg-tool',
    title: 'SVG 转换',
    description: '编辑 SVG 并预览，导出为 PNG/JPG/WebP（支持尺寸与清晰度）',
    route: '/tool/svg-tool'
  },
  {
    id: 'timestamp-convert',
    title: '时间戳转换',
    description: '秒 / 毫秒互转，实时显示当前系统时间',
    route: '/tool/timestamp-convert'
  },
  {
    id: 'base64-tool',
    title: 'Base64 工具',
    description: '支持文本与图片的 Base64 互转',
    route: '/tool/base64-tool'
  },
  {
    id: 'qr-tool',
    title: '二维码生成与识别',
    description: '输入 URL/文本生成二维码，或上传二维码图片进行解析',
    route: '/tool/qr-tool'
  },
  {
    id: 'pdf-tool',
    title: 'PDF 助手',
    description: 'PDF 合并、拆分、按页导出图片',
    route: '/tool/pdf-tool'
  },
  {
    id: 'json-formatter',
    title: 'JSON 格式化',
    description: '快速格式化/压缩/校验 JSON，并一键复制结果',
    route: '/tool/json-formatter'
  }
]
