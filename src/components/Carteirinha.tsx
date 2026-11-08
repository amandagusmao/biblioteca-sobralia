import { LogoMark } from './Logo'
import { QrCode } from './QrCode'
import type { Membro } from '../lib/types'

/** Carteirinha da biblioteca (tamanho cartão de crédito), com QR para leitura no balcão. */
export function Carteirinha({ membro }: { membro: Membro }) {
  return (
    <div className="relative flex h-[204px] w-[324px] overflow-hidden rounded-2xl bg-gradient-to-br from-electric via-royal to-ocean p-4 text-white shadow-xl print:shadow-none" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <div className="absolute -right-14 -top-14 size-40 rounded-full border-[18px] border-leaf/30" />
      <div className="relative flex flex-1 flex-col justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <div className="leading-none">
            <p className="text-[13px] font-extrabold">Biblioteca Digital</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.2em] text-leaf">Sobrália · MG</p>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-blue-200">Leitor</p>
          <p className="line-clamp-2 text-[15px] font-extrabold leading-tight">{membro.nome}</p>
          <p className="mt-1.5 font-mono text-sm tracking-[.2em] text-leaf">Nº {membro.carteirinha}</p>
        </div>
      </div>
      <div className="relative flex flex-col items-center justify-end gap-1">
        <div className="rounded-lg bg-white p-1"><QrCode value={`BDS:${membro.carteirinha}`} size={88} /></div>
        <p className="text-[8px] text-blue-200">Prefeitura de Sobrália</p>
      </div>
    </div>
  )
}

/** Extrai o número da carteirinha de um código lido (QR "BDS:000123" ou só o número). */
export function lerCarteirinha(code: string): string | null {
  const m = code.trim().match(/^(?:BDS:)?(\d{1,10})$/i)
  return m ? m[1].padStart(6, '0') : null
}
