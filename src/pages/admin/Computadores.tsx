import { useEffect, useState } from 'react'
import { Monitor, Pencil, Play, Plus, Square, Trash2, Wrench } from 'lucide-react'
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, SearchSelect, Select, Spinner, Tabs, useFeedback,
} from '../../components/ui'
import { db, useConfig, useTable } from '../../lib/db'
import { fmtDuration, fmtTime, minutesSince, toISODate, today, fmtDate } from '../../lib/dates'
import type { Computador } from '../../lib/types'
import { cn, errMsg } from '../../lib/utils'

const FINALIDADES = ['Pesquisa escolar', 'Trabalho / estudo', 'Currículo / emprego', 'Serviços públicos (gov.br)', 'Curso de informática', 'Lazer', 'Outro']

export default function Computadores() {
  const cfg = useConfig()
  const { toast, confirm } = useFeedback()
  const { data: pcs, loading } = useTable('computadores')
  const { data: usos } = useTable('usos_computador')
  const { data: membros } = useTable('membros')
  const [, tick] = useState(0)
  const [iniciar, setIniciar] = useState<Computador | null>(null)
  const [editar, setEditar] = useState<Partial<Computador> | null>(null)
  const [dia, setDia] = useState(today())

  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30_000); return () => clearInterval(t) }, [])

  const usoAtual = (pc: string) => usos.find(u => u.computador_id === pc && !u.fim)
  const nomeUso = (u: { membro_id: string | null; visitante: string | null }) => membros.find(m => m.id === u.membro_id)?.nome ?? u.visitante ?? 'Visitante'
  const doDia = usos.filter(u => toISODate(new Date(u.inicio)) === dia).sort((a, b) => b.inicio.localeCompare(a.inicio))
  const minutosDia = doDia.reduce((s, u) => s + minutesSince(u.inicio, u.fim), 0)

  const encerrar = async (pc: Computador) => {
    const u = usoAtual(pc.id)
    try {
      if (u) await db.update('usos_computador', u.id, { fim: new Date().toISOString() })
      await db.update('computadores', pc.id, { status: 'livre' })
      toast(`${pc.nome} liberado.`)
    } catch (e) { toast(errMsg(e), 'error') }
  }

  const manutencao = async (pc: Computador) => {
    if (pc.status === 'em_uso') { toast('Encerre o uso antes.', 'error'); return }
    await db.update('computadores', pc.id, { status: pc.status === 'manutencao' ? 'livre' : 'manutencao' })
  }

  return (
    <>
      <PageHeader title="Computadores" icon={<Monitor className="size-5" />}
        subtitle={`Controle de uso dos computadores públicos · tempo sugerido: ${cfg.tempo_computador} min por pessoa`}
        actions={<Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditar({ status: 'livre' })}>Adicionar computador</Button>} />

      {loading ? <Spinner /> : pcs.length === 0 ? (
        <Card><EmptyState icon={<Monitor className="size-7" />} title="Nenhum computador cadastrado" action={<Button onClick={() => setEditar({ status: 'livre' })}>Adicionar</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...pcs].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })).map(pc => {
            const u = usoAtual(pc.id)
            const min = u ? minutesSince(u.inicio) : 0
            const excedeu = u && min > cfg.tempo_computador
            return (
              <Card key={pc.id} className={cn('flex flex-col p-4', pc.status === 'em_uso' && (excedeu ? 'ring-2 ring-amber-400' : 'ring-2 ring-royal/40'))}>
                <div className="flex items-start justify-between">
                  <div className={cn('grid size-11 place-items-center rounded-2xl',
                    pc.status === 'livre' ? 'bg-leaf/15 text-leaf-dark' : pc.status === 'em_uso' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-400')}>
                    {pc.status === 'manutencao' ? <Wrench className="size-5" /> : <Monitor className="size-5" />}
                  </div>
                  <button onClick={() => setEditar(pc)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Editar"><Pencil className="size-4" /></button>
                </div>
                <p className="mt-3 text-lg font-extrabold text-navy">{pc.nome}</p>
                <p className="text-xs text-slate-500">{pc.descricao}</p>
                <div className="mt-3 min-h-[52px] text-sm">
                  {u ? (
                    <>
                      <p className="truncate font-semibold text-navy">{nomeUso(u)}</p>
                      <p className={cn('text-xs', excedeu ? 'font-bold text-amber-600' : 'text-slate-500')}>desde {fmtTime(u.inicio)} · {fmtDuration(min)}{excedeu && ' — tempo excedido'}</p>
                    </>
                  ) : pc.status === 'manutencao' ? <Badge tone="gray">Em manutenção</Badge> : <Badge tone="green">Livre</Badge>}
                </div>
                <div className="mt-3 flex gap-2">
                  {pc.status === 'em_uso'
                    ? <Button size="sm" variant="secondary" className="flex-1" icon={<Square className="size-3.5" />} onClick={() => encerrar(pc)}>Encerrar uso</Button>
                    : <Button size="sm" className="flex-1" disabled={pc.status === 'manutencao'} icon={<Play className="size-3.5" />} onClick={() => setIniciar(pc)}>Iniciar uso</Button>}
                  <Button size="sm" variant="ghost" title={pc.status === 'manutencao' ? 'Liberar' : 'Manutenção'} onClick={() => manutencao(pc)} icon={<Wrench className="size-4" />} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-navy">Registro de uso</h2>
            <p className="text-sm text-slate-500">{doDia.length} uso(s) em {fmtDate(dia)} · {fmtDuration(minutosDia)} no total</p>
          </div>
          <Input type="date" value={dia} max={today()} onChange={e => setDia(e.target.value)} className="sm:w-48" />
        </div>
        {doDia.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum uso registrado neste dia.</p> : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Computador</th><th className="px-4 py-3">Pessoa</th><th className="hidden px-4 py-3 sm:table-cell">Finalidade</th><th className="px-4 py-3">Horário</th><th className="px-4 py-3 text-right">Duração</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doDia.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-semibold text-navy">{pcs.find(p => p.id === u.computador_id)?.nome ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{nomeUso(u)}</td>
                    <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{u.finalidade ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{fmtTime(u.inicio)}–{u.fim ? fmtTime(u.fim) : <Badge tone="blue">em uso</Badge>}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmtDuration(minutesSince(u.inicio, u.fim))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <IniciarUso pc={iniciar} onClose={() => setIniciar(null)} />
      <ComputadorForm rascunho={editar} onClose={() => setEditar(null)} onDelete={async pc => {
        if (pc.status === 'em_uso') { toast('Encerre o uso antes.', 'error'); return }
        if (await confirm({ title: 'Remover computador?', msg: `${pc.nome} e seu histórico de uso serão apagados.`, danger: true, okLabel: 'Remover' })) {
          await db.remove('computadores', pc.id); setEditar(null); toast('Computador removido.')
        }
      }} />
    </>
  )
}

function IniciarUso({ pc, onClose }: { pc: Computador | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const { data: membros } = useTable('membros')
  const [modo, setModo] = useState<'cadastrado' | 'visitante'>('cadastrado')
  const [membroId, setMembroId] = useState<string | null>(null)
  const [visitante, setVisitante] = useState('')
  const [finalidade, setFinalidade] = useState(FINALIDADES[0])
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (pc) { setMembroId(null); setVisitante('') } }, [pc])

  const salvar = async () => {
    if (!pc) return
    if (modo === 'cadastrado' && !membroId) { toast('Escolha a pessoa.', 'error'); return }
    if (modo === 'visitante' && !visitante.trim()) { toast('Informe o nome do visitante.', 'error'); return }
    setSalvando(true)
    try {
      await db.insert('usos_computador', {
        computador_id: pc.id, membro_id: modo === 'cadastrado' ? membroId : null, visitante: modo === 'visitante' ? visitante.trim() : null,
        finalidade, inicio: new Date().toISOString(), fim: null, created_at: new Date().toISOString(),
      })
      await db.update('computadores', pc.id, { status: 'em_uso' })
      toast(`${pc.nome} em uso.`)
      onClose()
    } catch (e) { toast(errMsg(e), 'error') } finally { setSalvando(false) }
  }

  return (
    <Modal open={!!pc} onClose={onClose} title={`Iniciar uso — ${pc?.nome}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando} icon={<Play className="size-4" />}>Iniciar</Button></>}>
      <div className="space-y-4">
        <Tabs value={modo} onChange={setModo} items={[{ value: 'cadastrado', label: 'Pessoa cadastrada' }, { value: 'visitante', label: 'Visitante' }]} />
        {modo === 'cadastrado' ? (
          <SearchSelect items={membros.filter(m => m.ativo)} value={membroId} onChange={setMembroId} getLabel={m => m.nome}
            getSearch={m => `${m.nome} ${m.carteirinha}`} placeholder="Nome ou carteirinha"
            render={m => <span><b className="text-navy">{m.nome}</b> <span className="text-slate-500">· nº {m.carteirinha}</span></span>} />
        ) : (
          <Field label="Nome do visitante"><Input value={visitante} onChange={e => setVisitante(e.target.value)} autoFocus /></Field>
        )}
        <Field label="Finalidade"><Select value={finalidade} onChange={e => setFinalidade(e.target.value)}>{FINALIDADES.map(f => <option key={f}>{f}</option>)}</Select></Field>
      </div>
    </Modal>
  )
}

function ComputadorForm({ rascunho, onClose, onDelete }: { rascunho: Partial<Computador> | null; onClose: () => void; onDelete: (pc: Computador) => void }) {
  const { toast } = useFeedback()
  const { data: pcs } = useTable('computadores')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  useEffect(() => {
    if (rascunho) { setNome(rascunho.nome ?? `PC ${String(pcs.length + 1).padStart(2, '0')}`); setDescricao(rascunho.descricao ?? '') }
  }, [rascunho]) // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!nome.trim()) return
    try {
      if (rascunho?.id) await db.update('computadores', rascunho.id, { nome: nome.trim(), descricao: descricao || null })
      else await db.insert('computadores', { nome: nome.trim(), descricao: descricao || null, status: 'livre', created_at: new Date().toISOString() })
      toast('Computador salvo.'); onClose()
    } catch (e) { toast(errMsg(e), 'error') }
  }
  return (
    <Modal open={!!rascunho} onClose={onClose} title={rascunho?.id ? 'Editar computador' : 'Novo computador'} size="sm"
      footer={<>
        {rascunho?.id && <Button variant="ghost" className="mr-auto text-red-600" icon={<Trash2 className="size-4" />} onClick={() => onDelete(rascunho as Computador)}>Remover</Button>}
        <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar}>Salvar</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Nome / identificação"><Input value={nome} onChange={e => setNome(e.target.value)} autoFocus /></Field>
        <Field label="Descrição"><Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Uso livre, Laboratório..." /></Field>
      </div>
    </Modal>
  )
}
