import { useCallback, useEffect, useState } from 'react'
import type { DataAdapter, RpcName } from './adapter'
import { DEMO_MODE } from './config'
import { createLocalAdapter } from './localAdapter'
import { createSupabaseAdapter } from './supabaseAdapter'
import type { Configuracao, Row, RowId, TableName } from './types'
import { TABLES } from './types'
import { errMsg, uid } from './utils'

export const adapter: DataAdapter = DEMO_MODE ? createLocalAdapter() : createSupabaseAdapter()

// ---------- cache + avisos de mudança ----------
const cache = new Map<TableName, unknown[]>()
const subs = new Map<TableName, Set<() => void>>()

// Gatilhos do banco também alteram outras tabelas
const RELATED: Partial<Record<TableName, TableName[]>> = {
  emprestimos: ['livros'],
  matriculas: ['turmas'],
  usos_computador: ['computadores'],
  inscricoes: ['matriculas', 'turmas', 'mensagens', 'membros'],
}

const inflight = new Map<TableName, Promise<unknown[]>>()

function fetchTable(t: TableName): Promise<unknown[]> {
  let p = inflight.get(t)
  if (!p) {
    p = adapter.list(t)
      .then(rows => { if (inflight.get(t) === p) cache.set(t, rows); return rows as unknown[] })
      .finally(() => { if (inflight.get(t) === p) inflight.delete(t) })
    inflight.set(t, p)
  }
  return p
}

function notify(t: TableName) {
  for (const name of [t, ...(RELATED[t] ?? [])]) {
    cache.delete(name)
    inflight.delete(name)
    subs.get(name)?.forEach(fn => fn())
  }
}

export function invalidateAll() {
  cache.clear()
  inflight.clear()
  for (const t of TABLES) subs.get(t)?.forEach(fn => fn())
}

export const db = {
  list: adapter.list,
  async insert<K extends TableName>(t: K, row: Partial<Row<K>>): Promise<string> {
    const id = (row as { id?: string }).id ?? uid()
    await adapter.insert(t, { ...row, id } as Partial<Row<K>> & { id: RowId })
    notify(t)
    return id
  },
  async update<K extends TableName>(t: K, id: RowId, patch: Partial<Row<K>>) {
    await adapter.update(t, id, patch)
    notify(t)
  },
  async remove<K extends TableName>(t: K, id: RowId) {
    await adapter.remove(t, id)
    notify(t)
  },
  /** Chama uma função do banco e atualiza as tabelas que ela altera. */
  async rpc<T = unknown>(fn: RpcName, args: Record<string, unknown>, altera: TableName[] = []): Promise<T> {
    const r = await adapter.rpc<T>(fn, args)
    altera.forEach(notify)
    return r
  },
}

export function useTable<K extends TableName>(t: K) {
  const [data, setData] = useState<Row<K>[]>(() => (cache.get(t) as Row<K>[]) ?? [])
  const [loading, setLoading] = useState(!cache.has(t))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () => {
      const cached = cache.get(t) as Row<K>[] | undefined
      if (cached) { setData(cached); setLoading(false); return }
      fetchTable(t)
        .then(rows => { if (alive) { setData(rows as Row<K>[]); setError(null); setLoading(false) } })
        .catch(e => { if (alive) { setError(errMsg(e)); setLoading(false) } })
    }
    load()
    let set = subs.get(t)
    if (!set) subs.set(t, (set = new Set()))
    set.add(load)
    return () => { alive = false; set!.delete(load) }
  }, [t])

  const reload = useCallback(() => notify(t), [t])
  return { data, loading, error, reload }
}

export const DEFAULT_CONFIG: Configuracao = {
  id: 1, nome_biblioteca: 'Biblioteca Digital de Sobrália', endereco: 'Sobrália/MG', telefone: null, email: null,
  horario: 'Segunda a sexta, das 8h às 17h', sobre: null,
  prazo_dias: 14, max_emprestimos: 3, max_renovacoes: 2, tempo_computador: 60,
}

export function useConfig(): Configuracao {
  const { data } = useTable('configuracoes')
  return data[0] ?? DEFAULT_CONFIG
}
