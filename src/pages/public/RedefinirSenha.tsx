import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Alert, Button, Card, Field, SenhaInput, Spinner, useFeedback } from '../../components/ui'
import { isEquipe, useAuth } from '../../lib/auth'
import { errMsg } from '../../lib/utils'

/** Aberta pelo link de "Esqueci minha senha" recebido por e-mail. */
export default function RedefinirSenha() {
  const { user, ready, updatePassword } = useAuth()
  const { toast } = useFeedback()
  const nav = useNavigate()
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  if (!ready) return <Spinner className="py-40" />

  const salvar = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setErro(null)
    if (senha.length < 8) return setErro('A senha deve ter pelo menos 8 caracteres.')
    if (senha !== senha2) return setErro('As senhas não conferem.')
    setSalvando(true)
    try {
      await updatePassword(senha, null)
      toast('Senha alterada com sucesso!')
      nav(user && isEquipe(user.role) ? '/admin' : '/minha-area', { replace: true })
    } catch (err) { setErro(errMsg(err)) } finally { setSalvando(false) }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6 sm:p-8">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy"><KeyRound className="size-5 text-royal" /> Criar nova senha</h1>
        {!user ? (
          <div className="mt-4 space-y-4">
            <Alert tone="warn">Este link expirou ou já foi usado. Peça um novo link na tela de login.</Alert>
            <Link to="/entrar"><Button className="w-full">Ir para o login</Button></Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="mt-5 space-y-4">
            <p className="text-sm text-slate-600">Conta: <b>{user.email}</b></p>
            <Field label="Nova senha" hint="Mínimo de 8 caracteres"><SenhaInput value={senha} onChange={setSenha} autoComplete="new-password" minLength={8} /></Field>
            <Field label="Repita a nova senha"><SenhaInput value={senha2} onChange={setSenha2} autoComplete="new-password" minLength={8} /></Field>
            {erro && <Alert tone="error">{erro}</Alert>}
            <Button type="submit" className="w-full" size="lg" loading={salvando}>Salvar nova senha</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
