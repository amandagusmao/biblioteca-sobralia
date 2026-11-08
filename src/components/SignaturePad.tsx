import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'

/** Campo para assinar com o dedo (celular) ou mouse. Devolve a assinatura como imagem PNG. */
export function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const tracos = useRef(0)
  const [vazio, setVazio] = useState(true)

  useEffect(() => {
    const c = ref.current!
    const ajustar = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 2.6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#06204a'
    }
    ajustar()
    return () => {}
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const exportar = () => {
    // Reduz para 600x200 com fundo branco (arquivo leve)
    const c = ref.current!
    const out = document.createElement('canvas')
    out.width = 600; out.height = 200
    const o = out.getContext('2d')!
    o.fillStyle = '#fff'; o.fillRect(0, 0, 600, 200)
    o.drawImage(c, 0, 0, 600, 200)
    return out.toDataURL('image/png')
  }

  const inicio = (e: React.PointerEvent) => {
    e.preventDefault()
    ref.current!.setPointerCapture(e.pointerId)
    desenhando.current = true
    ultimo.current = pos(e)
  }
  const mover = (e: React.PointerEvent) => {
    if (!desenhando.current || !ultimo.current) return
    const p = pos(e)
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(ultimo.current.x, ultimo.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ultimo.current = p
  }
  const fim = () => {
    if (!desenhando.current) return
    desenhando.current = false
    tracos.current++
    setVazio(false)
    onChange(exportar())
  }
  const limpar = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    tracos.current = 0
    setVazio(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={ref}
          className="block h-40 w-full touch-none cursor-crosshair rounded-2xl"
          onPointerDown={inicio} onPointerMove={mover} onPointerUp={fim} onPointerCancel={fim} onPointerLeave={fim}
          aria-label="Área de assinatura"
        />
        {vazio && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-sm text-slate-400">
            <PenLine className="mb-1 size-5" /> Assine aqui com o dedo ou o mouse
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-300" />
      </div>
      <button type="button" onClick={limpar} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600">
        <Eraser className="size-4" /> Limpar assinatura
      </button>
    </div>
  )
}
