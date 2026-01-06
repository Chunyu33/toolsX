import type { ToolDefinition } from '@shared/types'

export const tools: ToolDefinition[] = [
  {
    id: 'video-to-gif',
    title: '视频转 GIF',
    description: '将视频片段快速转换成 GIF，支持裁剪与帧率设置（占位页）',
    route: '/tool/video-to-gif'
  },
  {
    id: 'image-convert',
    title: '图片格式转换',
    description: 'PNG/JPG/WebP/AVIF 等格式互转（占位页）',
    route: '/tool/image-convert'
  },
  {
    id: 'image-compress',
    title: '图片压缩',
    description: '批量压缩图片并保持清晰度（占位页）',
    route: '/tool/image-compress'
  },
  {
    id: 'json-formatter',
    title: 'JSON 格式化',
    description: '快速格式化/压缩/校验 JSON（占位页）',
    route: '/tool/json-formatter'
  }
]
