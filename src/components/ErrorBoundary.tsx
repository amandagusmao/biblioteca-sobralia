import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

/** Evita tela branca: mostra uma mensagem e permite recarregar (ex.: após publicar uma nova versão). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() { return { erro: true } }
  componentDidCatch(e: unknown) { console.error(e) }
  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-lg font-extrabold text-navy">Algo não carregou corretamente</p>
        <p className="mt-2 text-sm text-slate-600">Pode ser uma nova versão do site ou uma falha na internet. Recarregue a página.</p>
        <button onClick={() => location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-3 font-bold text-white hover:bg-ocean">
          <RefreshCw className="size-4" /> Recarregar
        </button>
      </div>
    )
  }
}
