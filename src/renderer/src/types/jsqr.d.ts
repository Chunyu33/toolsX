declare module 'jsqr' {
  export type InversionAttempts = 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst'

  export type QRCode = {
    data: string
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: InversionAttempts
    }
  ): QRCode | null
}
