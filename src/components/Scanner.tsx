import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CameraOff, Flashlight, FlashlightOff, Keyboard, SwitchCamera, X } from 'lucide-react'
import { getDetector, type Leitura } from '../lib/barcode'
import { isValidIsbn13 } from '../lib/isbn'
import { Button, Input } from './ui'
import { cn } from '../lib/utils'

const CAM_KEY = 'bd-camera-preferida'

/**
 * Leitor de código de barras / QR pela câmera do celular ou webcam.
 * - Câmera traseira em alta resolução com foco contínuo
 * - Lê só a faixa central da imagem (mais rápido)
 * - Lanterna e troca de câmera (celulares com várias lentes)
 * - Digitação manual ou leitor USB (funciona como teclado)
 */
export function ScannerModal({ open, onClose, onResult, title = 'Escanear código', hint }: {
  open: boolean; onClose: () => void; onResult: (code: string) => void; title?: string; hint?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)
  const [manual, setManual] = useState('')
  const [lanterna, setLanterna] = useState<boolean | null>(null) // null = sem suporte
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [camId, setCamId] = useState<string | null>(() => { try { return localStorage.getItem(CAM_KEY) } catch { return null } })
  const [sucesso, setSucesso] = useState(false)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const resultRef = useRef(onResult)
  resultRef.current = onResult

  useEffect(() => {
    if (!open) return
    let parado = false
    let stream: MediaStream | null = null
    let timer = 0
    setErro(null); setPronto(false); setManual(''); setSucesso(false); setLanterna(null)

    const iniciar = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setErro('A câmera só funciona em endereço seguro (https). Digite o código abaixo.')
        return
      }
      const detectorP = getDetector() // carrega em paralelo com a câmera
      try {
        const video: MediaTrackConstraints = {
          width: { ideal: 1920 }, height: { ideal: 1080 },
          ...(camId ? { deviceId: { exact: camId } } : { facingMode: { ideal: 'environment' } }),
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
        } catch (e) {
          if (!camId) throw e
          // câmera salva não existe mais
          localStorage.removeItem(CAM_KEY)
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
        }
        if (parado) { stream.getTracks().forEach(t => t.stop()); return }
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean }
        if (caps.focusMode?.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
        }
        if (caps.torch) setLanterna(false)
        navigator.mediaDevices.enumerateDevices().then(ds => setCameras(ds.filter(d => d.kind === 'videoinput'))).catch(() => {})

        const v = videoRef.current!
        v.srcObject = stream
        await v.play().catch(() => {})
        const detector = await detectorP
        if (parado) return
        setPronto(true)

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        const ler = async () => {
          if (parado) return
          if (v.readyState >= 2 && v.videoWidth) {
            // faixa central (90% x 60%), reduzida para no máx. 1280px de largura
            const sw = v.videoWidth * 0.9, sh = v.videoHeight * 0.6
            const sx = (v.videoWidth - sw) / 2, sy = (v.videoHeight - sh) / 2
            const escala = Math.min(1, 1280 / sw)
            canvas.width = Math.round(sw * escala); canvas.height = Math.round(sh * escala)
            ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            try {
              const r = valido(await detector.detect(canvas))
              if (r && !parado) {
                parado = true
                setSucesso(true)
                navigator.vibrate?.(80)
                beep()
                setTimeout(() => resultRef.current(r.rawValue.trim()), 150)
                return
              }
            } catch { /* quadro ruim: segue */ }
          }
          timer = window.setTimeout(ler, 60)
        }
        ler()
      } catch (e) {
        const nome = (e as { name?: string })?.name ?? ''
        setErro(nome === 'NotAllowedError'
          ? 'Permissão da câmera negada. Libere o acesso nas configurações do navegador ou digite o código.'
          : nome === 'NotFoundError' ? 'Nenhuma câmera encontrada neste aparelho. Digite o código abaixo.'
            : 'Não foi possível abrir a câmera. Feche outros apps que usam a câmera ou digite o código.')
      }
    }
    iniciar()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      parado = true
      clearTimeout(timer)
      stream?.getTracks().forEach(t => t.stop())
      trackRef.current = null
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, camId]) // eslint-disable-line react-hooks/exhaustive-deps

  const alternarLanterna = async () => {
    const t = trackRef.current
    if (!t || lanterna === null) return
    try { await t.applyConstraints({ advanced: [{ torch: !lanterna } as MediaTrackConstraintSet] }); setLanterna(!lanterna) } catch { setLanterna(null) }
  }

  const trocarCamera = () => {
    if (cameras.length < 2) return
    const atual = trackRef.current?.getSettings().deviceId
    const i = cameras.findIndex(c => c.deviceId === atual)
    const prox = cameras[(i + 1) % cameras.length].deviceId
    try { localStorage.setItem(CAM_KEY, prox) } catch { /* ignora */ }
    setCamId(prox)
  }

  const enviarManual = () => { const v = manual.trim(); if (v) onResult(v) }

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/80 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-pop-in relative flex h-dvh w-full flex-col overflow-hidden bg-navy text-white sm:h-auto sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-lg font-extrabold">{title}</p>
            <p className="text-sm text-blue-200">{hint ?? 'Aponte a câmera para o código de barras'}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Fechar"><X className="size-5" /></button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black sm:aspect-[4/3] sm:flex-none">
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />
          {!erro && (
            <div className={cn('pointer-events-none absolute inset-x-[5%] top-1/2 h-[45%] max-h-56 -translate-y-1/2 rounded-2xl border-[3px] transition-colors',
              sucesso ? 'border-leaf bg-leaf/20' : 'border-white/80')}>
              {pronto && !sucesso && <div className="scan-line absolute inset-x-3 h-0.5 rounded bg-leaf shadow-[0_0_12px_2px] shadow-leaf" />}
            </div>
          )}
          {(!pronto || erro) && (
            <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-blue-100">
              <div>
                {erro ? <CameraOff className="mx-auto mb-2 size-9" /> : <Camera className="mx-auto mb-2 size-9 animate-pulse" />}
                {erro ?? 'Abrindo a câmera...'}
              </div>
            </div>
          )}
          {pronto && !erro && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
              {lanterna !== null && (
                <button onClick={alternarLanterna} className={cn('flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold backdrop-blur', lanterna ? 'bg-leaf text-white' : 'bg-black/50 text-white')}>
                  {lanterna ? <FlashlightOff className="size-4" /> : <Flashlight className="size-4" />} Lanterna
                </button>
              )}
              {cameras.length > 1 && (
                <button onClick={trocarCamera} className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2.5 text-sm font-bold backdrop-blur">
                  <SwitchCamera className="size-4" /> Trocar câmera
                </button>
              )}
            </div>
          )}
        </div>

        <form className="bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-ink" onSubmit={e => { e.preventDefault(); enviarManual() }}>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Keyboard className="size-4" /> Ou digite / use o leitor USB</p>
          <div className="flex gap-2">
            <Input value={manual} onChange={e => setManual(e.target.value)} placeholder="Ex.: 9788535914849" autoFocus={!!erro} maxLength={64} />
            <Button type="submit" disabled={!manual.trim()}>OK</Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Dica: segure o livro a uns 15 cm, com o código reto e bem iluminado. Se demorar, toque em “Trocar câmera”.</p>
        </form>
      </div>
    </div>,
    document.body,
  )
}

/** Descarta leituras que não fazem sentido (ex.: EAN de produto que não é ISBN lido pela metade). */
function valido(rs: Leitura[]): Leitura | null {
  for (const r of rs) {
    const v = r.rawValue?.trim()
    if (!v) continue
    if (r.format === 'ean_13' && /^97[89]/.test(v) && !isValidIsbn13(v)) continue
    return r
  }
  return null
}

let audio: AudioContext | null = null
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audio ??= new Ctx()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = 1150
    g.gain.value = 0.08
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + 0.09)
  } catch { /* sem áudio */ }
}
