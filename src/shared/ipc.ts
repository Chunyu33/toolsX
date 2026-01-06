export const IpcChannels = {
  SystemPing: 'system:ping'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
