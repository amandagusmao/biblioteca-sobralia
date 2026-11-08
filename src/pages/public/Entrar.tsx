import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, GraduationCap, IdCard, KeyRound, Library, LogIn, Mail, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { LogoMark } from '../../components/Logo'
import { Alert, Button, Card, DateInput, Field, Input, SenhaInput, Tabs } from '../../components/ui'
import { isEquipe, useAuth } from '../../lib/auth'
import { DEMO_MODE } from '../../lib/config'
import { cn, errMsg } from '../../lib/utils'

type Modo = 'entrar' | 'criar' | 'esqueci'

export default function Entrar() {
  const { user, signIn, signUp, resetPassword } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [modo, setModo] = useState<Modo>(params.get('criar') ? 'criar' : 'entrar')
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [equipeAberto, setEquipeAberto] = useState(false)
  const voltar = params.get('voltar')
  const motivo = params.get('motivo')

  useEffect(() => {
    if (user) nav(voltar ?? (isEquipe(user.role) ? '/admin' : '/minha-area'), { replace: true })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const trocar = (m: Modo) => { setModo(m); setErro(null); setInfo(null) }

  const enviar = async (e?: { preventDefault: () => void }, demo?: string) => {
    e?.preventDefault()
    setErro(null); setInfo(null); setCarregando(true)
    try {
      if (demo) await signIn(demo, 'demo123')
      else if (modo === 'entrar') await signIn(email, senha)
      else if (modo === 'esqueci') {
        await resetPassword(email)
        setInfo(`Se existir uma conta com ${email.trim()}, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.`)
      } else {
        if (nome.trim().split(/\s+/).length < 2) throw new Error('Informe seu nome completo (nome e sobrenome).')
        if (!nascimento) throw new Error('Informe uma data de nascimento válida (DD/MM/AAAA).')
        if (senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.')
        if (senha !== senha2) throw new Error('As senhas não conferem.')
        const r = await signUp(nome, email, senha, nascimento)
        if (r.needsConfirmation) {
          setInfo('Quase pronto! Enviamos um link de confirmação para o seu e-mail. Ao confirmar, sua carteirinha é criada na hora e você já pode entrar.')
          setSenha(''); setSenha2('')
        }
      }
    } catch (err) {
      setErro(errMsg(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <div className="hidden md:block md:pt-6">
        <LogoMark className="size-16" />
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-navy">Sua biblioteca, <span className="text-royal">na palma da mão.</span></h1>
        <ul className="mt-8 space-y-4 text-slate-600">
          <li className="flex gap-3"><IdCard className="size-6 shrink-0 text-leaf-dark" /> Crie sua conta e receba a carteirinha digital na hora — não precisa ir ao balcão.</li>
          <li className="flex gap-3"><Library className="size-6 shrink-0 text-leaf-dark" /> Veja os livros que estão com você e as datas de devolução.</li>
          <li className="flex gap-3"><GraduationCap className="size-6 shrink-0 text-leaf-dark" /> Inscreva-se nos cursos de informática e acompanhe suas aulas.</li>
          <li className="flex gap-3"><ShieldCheck className="size-6 shrink-0 text-leaf-dark" /> Já tem carteirinha feita no balcão? Crie a conta com o mesmo e-mail informado lá.</li>
        </ul>
      </div>

      <div className="space-y-4">
        {motivo === 'inscricao' && <Alert tone="info">Para se inscrever em um curso é preciso ter cadastro na biblioteca. <b>Já é cadastrado?</b> Entre. <b>Ainda não?</b> Faça seu cadastro — leva 1 minuto.</Alert>}
        {params.get('link') === 'expirado' && <Alert tone="warn">O link do e-mail expirou ou já foi usado. Entre normalmente ou peça um novo em “Esqueci minha senha”.</Alert>}

        <Card className="p-6 sm:p-8">
          {modo === 'esqueci' ? (
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy"><KeyRound className="size-5 text-royal" /> Esqueci minha senha</h2>
              <p className="mt-1 text-sm text-slate-600">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
            </div>
          ) : (
            <Tabs value={modo} onChange={trocar} items={[
              { value: 'entrar', label: 'Já sou cadastrado' }, { value: 'criar', label: 'Novo cadastro' },
            ]} />
          )}

          <form onSubmit={enviar} className="mt-6 space-y-4">
            {modo === 'criar' && <>
              <Field label="Nome completo"><Input value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" maxLength={120} required /></Field>
              <Field label="Data de nascimento" hint="Menores de 18 anos podem se cadastrar; para os cursos, o responsável assina um termo online."><DateInput value={nascimento} onChange={setNascimento} required /></Field>
            </>}
            <Field label="E-mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={160} required /></Field>
            {modo !== 'esqueci' && (
              <Field label="Senha" hint={modo === 'criar' ? 'Mínimo de 8 caracteres — evite datas e nomes' : undefined}>
                <SenhaInput value={senha} onChange={setSenha} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={modo === 'criar' ? 8 : 6} />
              </Field>
            )}
            {modo === 'criar' && <Field label="Repita a senha"><SenhaInput value={senha2} onChange={setSenha2} autoComplete="new-password" minLength={8} /></Field>}

            {erro && <Alert tone="error">{erro}</Alert>}
            {info && <Alert tone="success">{info}</Alert>}

            <Button type="submit" className="w-full" size="lg" loading={carregando}
              icon={modo === 'entrar' ? <LogIn className="size-5" /> : modo === 'criar' ? <UserPlus className="size-5" /> : <Mail className="size-5" />}>
              {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta e carteirinha' : 'Enviar link'}
            </Button>

            {modo === 'entrar' && <button type="button" onClick={() => trocar('esqueci')} className="block w-full text-center text-sm font-semibold text-royal hover:underline">Esqueci minha senha</button>}
            {modo === 'esqueci' && <button type="button" onClick={() => trocar('entrar')} className="block w-full text-center text-sm font-semibold text-slate-500 hover:underline">Voltar para o login</button>}
            {modo === 'criar' && <p className="text-center text-xs text-slate-500">Ao criar a conta você concorda com o uso dos seus dados apenas para os serviços da biblioteca (LGPD).</p>}
          </form>

          {DEMO_MODE && modo !== 'esqueci' && (
            <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-amber-600">Acessos de demonstração</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  ['admin@demo.com', 'Administrador', <ShieldCheck key="a" className="size-4" />],
                  ['professor@demo.com', 'Professor', <GraduationCap key="p" className="size-4" />],
                  ['leitor@demo.com', 'Leitor', <UserRound key="l" className="size-4" />],
                ].map(([em, label, icon]) => (
                  <Button key={em as string} variant="secondary" size="sm" icon={icon} disabled={carregando} onClick={() => enviar(undefined, em as string)}>{label}</Button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">senha: demo123</p>
            </div>
          )}
        </Card>

        {/* Como funciona o acesso da equipe */}
        <Card className="overflow-hidden">
          <button onClick={() => setEquipeAberto(o => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
            <span className="flex items-center gap-2 text-sm font-bold text-navy"><ShieldCheck className="size-4 text-royal" /> Sou da equipe (administrador ou professor)</span>
            <ChevronDown className={cn('size-4 text-slate-400 transition', equipeAberto && 'rotate-180')} />
          </button>
          {equipeAberto && (
            <div className="animate-fade-in space-y-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
              <p>A equipe usa <b>este mesmo login</b>. O acesso funciona assim:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Crie sua conta em <b>Novo cadastro</b>, com seu e-mail, e confirme pelo link recebido.</li>
                <li>Um <b>administrador</b> libera seu acesso em <i>Configurações → Equipe e acessos</i>, escolhendo <b>Administrador</b> ou <b>Professor</b>.</li>
                <li>Pronto: ao entrar, você vai direto para o painel administrativo.</li>
              </ol>
              <p className="text-xs text-slate-500">O primeiro administrador é liberado uma única vez por quem instala o sistema (veja o guia de instalação). Por segurança, ninguém consegue se dar acesso de equipe sozinho.</p>
            </div>
          )}
        </Card>
        {voltar && <p className="text-center text-sm"><Link to="/" className="text-slate-500 hover:underline">Voltar ao site</Link></p>}
      </div>
    </div>
  )
}
