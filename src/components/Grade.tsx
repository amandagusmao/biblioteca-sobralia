import type { Curso, Turma } from '../lib/types'
import { DIAS_CURTOS, hhmm } from '../lib/dates'
import { cn } from '../lib/utils'

/** Grade semanal de aulas (segunda a sábado). */
export function GradeSemanal({ turmas, cursos, onClick, destaque }: {
  turmas: Turma[]; cursos: Curso[]; onClick?: (t: Turma) => void; destaque?: number
}) {
  const dias = [1, 2, 3, 4, 5, 6]
  const ativas = turmas.filter(t => t.status !== 'encerrada')
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-6 gap-2">
        {dias.map(d => {
          const aulas = ativas.filter(t => t.dias_semana.includes(d)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
          return (
            <div key={d} className={cn('rounded-2xl p-2', destaque === d ? 'bg-royal/10 ring-2 ring-royal/30' : 'bg-slate-50')}>
              <p className={cn('px-1 pb-2 text-center text-xs font-extrabold uppercase tracking-wider', destaque === d ? 'text-royal' : 'text-slate-500')}>
                {DIAS_CURTOS[d]}{destaque === d && ' · hoje'}
              </p>
              <div className="flex flex-col gap-2">
                {aulas.length === 0 && <p className="py-6 text-center text-xs text-slate-300">—</p>}
                {aulas.map(t => {
                  const c = cursos.find(c => c.id === t.curso_id)
                  return (
                    <button key={t.id} type="button" onClick={() => onClick?.(t)} disabled={!onClick}
                      className="rounded-xl bg-white p-2.5 text-left shadow-sm ring-1 ring-slate-200 transition enabled:hover:ring-royal/40"
                      style={{ borderLeft: `4px solid ${c?.cor ?? '#0339A6'}` }}>
                      <p className="text-xs font-bold text-royal">{hhmm(t.hora_inicio)}–{hhmm(t.hora_fim)}</p>
                      <p className="mt-0.5 text-sm font-bold leading-tight text-navy">{c?.nome}</p>
                      <p className="text-xs text-slate-500">{t.nome}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
