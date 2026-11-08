import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { Livro } from '../lib/types'
import { cn } from '../lib/utils'

const GRADS = [
  'from-royal to-ocean', 'from-electric to-royal', 'from-ocean to-navy', 'from-leaf-dark to-ocean',
  'from-navy to-royal', 'from-royal to-electric', 'from-teal-600 to-ocean', 'from-indigo-600 to-navy',
]

export function BookCover({ livro, className, size = 'md' }: { livro: Pick<Livro, 'titulo' | 'autores' | 'capa_url'>; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [erro, setErro] = useState(false)
  const g = GRADS[[...livro.titulo].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADS.length]
  const base = cn('relative aspect-[2/3] min-h-0 overflow-hidden rounded-lg shadow-md ring-1 ring-black/5', className)
  if (livro.capa_url && !erro) {
    return (
      <div className={cn(base, 'bg-slate-100')}>
        <img src={livro.capa_url} alt={`Capa de ${livro.titulo}`} loading="lazy" onError={() => setErro(true)} className="size-full object-cover" />
      </div>
    )
  }
  return (
    <div className={cn(base, 'flex flex-col justify-between bg-gradient-to-br text-white', size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-5' : 'p-3', g)}>
      <div className="absolute inset-y-0 left-[6%] w-px bg-white/25" />
      <BookOpen className={cn('opacity-70', size === 'sm' ? 'size-3' : 'size-4')} />
      {size !== 'sm' && (
        <div className="min-h-0">
          <p className={cn('font-extrabold leading-tight line-clamp-4', size === 'lg' ? 'text-lg' : 'text-xs')}>{livro.titulo}</p>
          {livro.autores && <p className={cn('mt-1 line-clamp-2 opacity-75', size === 'lg' ? 'text-sm' : 'text-[10px]')}>{livro.autores}</p>}
        </div>
      )}
    </div>
  )
}
