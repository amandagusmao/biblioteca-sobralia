// Regras de negócio da biblioteca
import { db } from './db'
import { addDays, diffDays, today } from './dates'
import type { Configuracao, Emprestimo, Livro, Membro, Turma } from './types'

export const disponiveis = (l: Livro) => Math.max(0, l.quantidade - (l.emprestados ?? 0))
export const atrasado = (e: Emprestimo) => !e.data_devolucao && e.data_prevista < today()
export const diasAtraso = (e: Emprestimo) => (atrasado(e) ? diffDays(e.data_prevista, today()) : 0)
export const vagasRestantes = (t: Turma) => Math.max(0, t.vagas - (t.matriculados ?? 0))

export interface Alerta { tipo: 'erro' | 'aviso'; msg: string }

export function checarEmprestimo(livro: Livro | undefined, membro: Membro | undefined, emprestimos: Emprestimo[], cfg: Configuracao): Alerta[] {
  const out: Alerta[] = []
  if (livro && disponiveis(livro) <= 0) out.push({ tipo: 'erro', msg: 'Todos os exemplares deste livro estão emprestados.' })
  if (membro) {
    if (!membro.ativo) out.push({ tipo: 'erro', msg: 'Este cadastro está inativo.' })
    const ativos = emprestimos.filter(e => e.membro_id === membro.id && !e.data_devolucao)
    if (ativos.length >= cfg.max_emprestimos) out.push({ tipo: 'erro', msg: `Limite de ${cfg.max_emprestimos} empréstimos simultâneos atingido.` })
    const atrasos = ativos.filter(atrasado)
    if (atrasos.length) out.push({ tipo: 'aviso', msg: `Esta pessoa tem ${atrasos.length} livro(s) com devolução atrasada.` })
    if (livro && ativos.some(e => e.livro_id === livro.id)) out.push({ tipo: 'aviso', msg: 'Esta pessoa já está com um exemplar deste livro.' })
  }
  return out
}

export async function emprestar(livro_id: string, membro_id: string, data_prevista: string, observacoes?: string) {
  return db.insert('emprestimos', {
    livro_id, membro_id, data_emprestimo: today(), data_prevista, data_devolucao: null, renovacoes: 0,
    observacoes: observacoes || null,
  })
}

export async function devolver(e: Emprestimo) {
  await db.update('emprestimos', e.id, { data_devolucao: today() })
}

export function podeRenovar(e: Emprestimo, cfg: Configuracao): string | null {
  if (e.data_devolucao) return 'Já devolvido.'
  if (e.renovacoes >= cfg.max_renovacoes) return `Limite de ${cfg.max_renovacoes} renovações atingido.`
  return null
}

export async function renovar(e: Emprestimo, cfg: Configuracao) {
  const base = e.data_prevista > today() ? e.data_prevista : today()
  await db.update('emprestimos', e.id, { data_prevista: addDays(base, cfg.prazo_dias), renovacoes: e.renovacoes + 1 })
}

export function proximaCarteirinha(membros: Membro[]): string {
  const max = membros.reduce((m, x) => Math.max(m, Number(x.carteirinha) || 0), 0)
  return String(max + 1).padStart(6, '0')
}

export function proximoCodigoInterno(livros: Livro[]): string {
  const max = livros.reduce((m, l) => Math.max(m, Number(l.codigo_interno?.replace(/\D/g, '')) || 0), 0)
  return `BD-${String(max + 1).padStart(5, '0')}`
}

export const STATUS_TURMA: Record<Turma['status'], { label: string; tone: 'green' | 'blue' | 'gray' }> = {
  inscricoes: { label: 'Inscrições abertas', tone: 'green' },
  andamento: { label: 'Em andamento', tone: 'blue' },
  encerrada: { label: 'Encerrada', tone: 'gray' },
}

export const STATUS_INSCRICAO: Record<'pendente' | 'aprovada' | 'recusada' | 'cancelada', { label: string; tone: 'amber' | 'green' | 'red' | 'gray' }> = {
  pendente: { label: 'Aguardando análise', tone: 'amber' },
  aprovada: { label: 'Aprovada', tone: 'green' },
  recusada: { label: 'Não aprovada', tone: 'red' },
  cancelada: { label: 'Cancelada', tone: 'gray' },
}

/** Escala de desempenho/comportamento (1 a 4) */
export const ESCALA: Record<number, { label: string; tone: 'red' | 'amber' | 'blue' | 'green' }> = {
  1: { label: 'Precisa melhorar', tone: 'red' },
  2: { label: 'Regular', tone: 'amber' },
  3: { label: 'Bom', tone: 'blue' },
  4: { label: 'Ótimo', tone: 'green' },
}

export const CATEGORIAS = [
  'Literatura brasileira', 'Literatura estrangeira', 'Infantil', 'Infantojuvenil', 'Poesia', 'Biografia',
  'Didático', 'Informática', 'História', 'Ciências', 'Geografia', 'Religião', 'Autoajuda', 'Referência',
  'Quadrinhos', 'Outros',
]
