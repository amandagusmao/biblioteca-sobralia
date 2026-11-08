// Motor de leitura de códigos de barras.
// 1) Usa o leitor NATIVO do aparelho quando existe (Android/Chrome) — o mais rápido.
// 2) Senão, usa ZXing em WebAssembly (iPhone, computadores) — rápido e preciso.
// O arquivo .wasm é servido pelo próprio site (sem depender de CDN externo).
import { BarcodeDetector as ZXingDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

export interface Leitura { rawValue: string; format: string }
export interface Detector { detect(src: CanvasImageSource): Promise<Leitura[]> }

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code'] as const

const overrides = {
  locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? new URL(wasmUrl, location.href).href : prefix + path),
}
let preparado = false
let detector: Promise<Detector> | null = null

export function getDetector(): Promise<Detector> {
  if (!detector) detector = criar()
  return detector
}

async function criar(): Promise<Detector> {
  const Nativo = (window as unknown as { BarcodeDetector?: { new(o: object): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
  if (Nativo) {
    try {
      const suportados = await Nativo.getSupportedFormats()
      if (suportados.includes('ean_13')) return new Nativo({ formats: FORMATOS.filter(f => suportados.includes(f)) })
    } catch { /* cai para o ZXing */ }
  }
  if (!preparado) {
    preparado = true
    // já começa a baixar o .wasm enquanto a câmera abre
    void prepareZXingModule({ overrides, fireImmediately: true }).catch(() => { preparado = false })
  }
  return new ZXingDetector({ formats: [...FORMATOS] }) as unknown as Detector
}

/** Pré-carrega o motor (chamar quando a tela que usa o leitor abrir). */
export function preaquecer() { void getDetector() }
