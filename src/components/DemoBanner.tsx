import { FlaskConical } from 'lucide-react'
import { DEMO_MODE } from '../lib/config'

export function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div className="no-print bg-amber-300 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
      <FlaskConical className="mr-1 inline size-3.5 -translate-y-px" />
      Modo demonstração — dados fictícios salvos só neste navegador. Configure o Supabase para usar de verdade.
    </div>
  )
}
