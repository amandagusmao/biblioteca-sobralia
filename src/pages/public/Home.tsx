import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock, GraduationCap, MapPin, Monitor, Search, Sparkles, Wifi } from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import { Badge } from '../../components/ui'
import { useConfig, useTable } from '../../lib/db'
import { DIAS_CURTOS, hhmm } from '../../lib/dates'
import { disponiveis, STATUS_TURMA, vagasRestantes } from '../../lib/services'

export default function Home() {
  const cfg = useConfig()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const { data: livros } = useTable('livros')
  const { data: cursos } = useTable('cursos')
  const { data: turmas } = useTable('turmas')
  const { data: pcs } = useTable('computadores')

  const totalExemplares = livros.reduce((s, l) => s + l.quantidade, 0)
  const pcsLivres = pcs.filter(p => p.status === 'livre').length
  const novidades = [...livros].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
  const abertas = turmas.filter(t => t.status !== 'encerrada').slice(0, 4)

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-electric via-royal to-ocean text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full border-[40px] border-leaf/25" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-white/5" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.25fr_1fr] md:py-24">
          <div>
            <Badge tone="navy" className="bg-white/15 ring-white/20"><Sparkles className="size-3.5 text-leaf" /> Gratuito para toda a comunidade</Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              Ler, aprender e se <span className="text-leaf">conectar</span> em Sobrália.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100">
              Consulte o acervo, veja se o livro está disponível, acompanhe seus empréstimos e conheça os cursos de informática da Biblioteca Digital.
            </p>
            <form onSubmit={e => { e.preventDefault(); nav(`/acervo?q=${encodeURIComponent(q)}`) }} className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-navy/30">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Busque por título, autor ou assunto"
                  className="w-full rounded-xl py-3 pl-11 pr-3 text-ink placeholder:text-slate-400 focus:outline-none" />
              </div>
              <button className="rounded-xl bg-leaf px-5 font-bold text-white transition hover:bg-leaf-dark">Buscar</button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <BookOpen className="size-6" />, n: totalExemplares, l: 'livros no acervo' },
              { icon: <GraduationCap className="size-6" />, n: cursos.length, l: 'cursos de informática' },
              { icon: <Monitor className="size-6" />, n: `${pcsLivres}/${pcs.length}`, l: 'computadores livres agora' },
              { icon: <Wifi className="size-6" />, n: '100%', l: 'gratuito' },
            ].map((s, i) => (
              <div key={i} className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
                <div className="text-leaf">{s.icon}</div>
                <p className="mt-3 text-3xl font-extrabold">{s.n}</p>
                <p className="text-sm text-blue-100">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <BookOpen className="size-6" />, t: 'Empréstimo de livros', d: `Crie sua conta, receba a carteirinha na hora e leve até ${cfg.max_emprestimos} livros por ${cfg.prazo_dias} dias.`, to: '/acervo', c: 'Ver acervo' },
            { icon: <Monitor className="size-6" />, t: 'Computadores com internet', d: 'Use os computadores para estudar, pesquisar, fazer currículo e acessar serviços públicos.', to: '/', c: `${pcsLivres} livre(s) agora — é só chegar` },
            { icon: <GraduationCap className="size-6" />, t: 'Cursos de informática', d: 'Aulas para crianças e jovens: informática básica, digitação, escritório e programação.', to: '/cursos', c: 'Ver turmas e horários' },
          ].map(s => (
            <Link key={s.t} to={s.to} className="group rounded-3xl bg-white p-6 shadow-lg shadow-navy/5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl">
              <div className="grid size-12 place-items-center rounded-2xl bg-royal/10 text-royal transition group-hover:bg-royal group-hover:text-white">{s.icon}</div>
              <h3 className="mt-4 text-lg font-extrabold text-navy">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.d}</p>
              <p className="mt-4 flex items-center gap-1 text-sm font-bold text-royal">{s.c} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>
      </section>

      {/* NOVIDADES */}
      {novidades.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-leaf-dark">Chegaram na estante</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-navy">Novidades do acervo</h2>
            </div>
            <Link to="/acervo" className="hidden items-center gap-1 text-sm font-bold text-royal hover:underline sm:flex">Ver todos <ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {novidades.map(l => (
              <Link key={l.id} to={`/acervo?livro=${l.id}`} className="group">
                <BookCover livro={l} className="transition group-hover:-translate-y-1 group-hover:shadow-xl" />
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-navy">{l.titulo}</p>
                <p className={disponiveis(l) > 0 ? 'text-xs font-semibold text-leaf-dark' : 'text-xs font-semibold text-slate-400'}>
                  {disponiveis(l) > 0 ? 'Disponível' : 'Emprestado'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CURSOS */}
      {abertas.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4">
          <div className="overflow-hidden rounded-[2rem] bg-navy p-6 text-white sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-leaf">Cursos gratuitos</p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight">Informática para crianças e jovens</h2>
                <p className="mt-2 max-w-xl text-blue-200">Inscreva-se pelo site com seu cadastro da biblioteca. Menores de idade: o responsável assina o termo online.</p>
              </div>
              <Link to="/cursos" className="inline-flex items-center gap-2 self-start rounded-xl bg-leaf px-5 py-3 font-bold text-white hover:bg-leaf-dark">
                Ver turmas <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {abertas.map(t => {
                const c = cursos.find(c => c.id === t.curso_id)
                const st = STATUS_TURMA[t.status]
                return (
                  <div key={t.id} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c?.cor ?? '#7CBF17' }} />
                      <Badge tone={st.tone === 'green' ? 'green' : 'blue'}>{st.label}</Badge>
                    </div>
                    <p className="mt-3 font-bold">{c?.nome}</p>
                    <p className="text-sm text-blue-200">{t.nome}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-blue-100"><Clock className="size-4 text-leaf" />
                      {t.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')} · {hhmm(t.hora_inicio)}–{hhmm(t.hora_fim)}
                    </p>
                    <p className="mt-1 text-xs text-blue-300">{vagasRestantes(t)} vaga(s) disponível(is)</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* VISITE */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-6 rounded-[2rem] bg-white p-6 ring-1 ring-slate-200 sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-navy">Como participar</h2>
            <ol className="mt-5 space-y-4">
              {[
                ['Crie sua conta no site', 'É grátis: nome, data de nascimento, e-mail e senha. Se preferir, faça no balcão da biblioteca.'],
                ['Receba a carteirinha na hora', 'Ao confirmar o e-mail, sua carteirinha digital com QR Code fica pronta na “Minha área”.'],
                ['Aproveite', 'Pegue livros mostrando o QR Code, use os computadores e inscreva-se nos cursos de informática.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf font-extrabold text-white">{i + 1}</span>
                  <div><p className="font-bold text-navy">{t}</p><p className="text-sm text-slate-600">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-3xl bg-paper p-6">
            <p className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-royal" /><span><b className="block text-navy">Endereço</b>{cfg.endereco ?? '—'}</span></p>
            <p className="flex items-start gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-royal" /><span><b className="block text-navy">Horário de funcionamento</b>{cfg.horario ?? '—'}</span></p>
            <Link to="/entrar?criar=1" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-royal px-5 py-3 font-bold text-white hover:bg-ocean">Criar minha conta</Link>
          </div>
        </div>
      </section>
    </>
  )
}
