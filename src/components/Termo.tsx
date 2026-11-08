import { fmtDate, fmtDateTime } from '../lib/dates'
import { fmtPhone } from '../lib/utils'

export const TERMO_VERSAO = 'v1'

export interface DadosTermo {
  aluno: string
  nascimento: string | null
  curso: string
  turma: string
  horario: string
  responsavel: string
  parentesco: string
  telefone: string
  biblioteca: string
}

/** Texto do termo de autorização para menores (versão v1). */
export function TextoTermo({ d }: { d: DadosTermo }) {
  const r = d.responsavel || '__________________'
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-700">
      <p className="text-center font-extrabold uppercase tracking-wide text-navy">Termo de autorização e responsabilidade</p>
      <p>
        Eu, <b>{r}</b>{d.parentesco && <>, <b>{d.parentesco.toLowerCase()}</b></>} e responsável legal por <b>{d.aluno}</b>
        {d.nascimento && <>, nascido(a) em <b>{fmtDate(d.nascimento)}</b></>}, <b>autorizo</b> sua participação no curso
        gratuito <b>{d.curso}</b> — {d.turma} ({d.horario}), oferecido pela {d.biblioteca} / Prefeitura Municipal de Sobrália-MG.
      </p>
      <p>Declaro estar ciente de que:</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>o(a) aluno(a) deve seguir as regras do laboratório e da biblioteca, cuidando dos equipamentos e respeitando colegas e professores;</li>
        <li>a frequência é registrada e faltas seguidas sem justificativa podem liberar a vaga para outra pessoa;</li>
        <li>o trajeto até o local das aulas é de responsabilidade da família;</li>
        <li>a equipe pode me contatar pelo telefone {d.telefone ? <b>{fmtPhone(d.telefone)}</b> : 'informado'} sobre o curso;</li>
        <li>os dados informados serão usados somente para a gestão do curso, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</li>
      </ol>
      <p className="text-xs text-slate-500">Assinatura eletrônica simples, nos termos da Lei nº 14.063/2020, registrada com data e hora do envio.</p>
    </div>
  )
}

/** Termo assinado (para a equipe conferir/imprimir). */
export function TermoAssinado({ d, assinatura, aceitoEm }: { d: DadosTermo; assinatura: string | null; aceitoEm: string | null }) {
  return (
    <div className="print-area rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <TextoTermo d={d} />
      <div className="mt-5 flex flex-col items-center">
        {assinatura ? <img src={assinatura} alt={`Assinatura de ${d.responsavel}`} className="h-24 w-auto" /> : <p className="text-sm text-red-600">Sem assinatura</p>}
        <div className="w-64 border-t border-slate-400 pt-1 text-center text-sm font-semibold text-slate-700">{d.responsavel}</div>
        {aceitoEm && <p className="mt-1 text-xs text-slate-500">Assinado eletronicamente em {fmtDateTime(aceitoEm)} · termo {TERMO_VERSAO}</p>}
      </div>
    </div>
  )
}
