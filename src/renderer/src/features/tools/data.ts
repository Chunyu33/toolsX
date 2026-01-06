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
    id: 'json-formatter',
    title: 'JSON 格式化',
    description: '快速格式化/压缩/校验 JSON，并一键复制结果',
    route: '/tool/json-formatter'
  }
]
