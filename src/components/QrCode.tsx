import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 128, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#06204a', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(''))
  }, [value, size])
  return src ? <img src={src} width={size} height={size} alt={`QR ${value}`} className={className} /> : <div style={{ width: size, height: size }} />
}
