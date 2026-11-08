import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { FeedbackProvider } from './components/ui'
import { PublicLayout } from './components/PublicLayout'
import { AdminLayout, RequireRole } from './components/AdminLayout'
import Home from './pages/public/Home'
import Acervo from './pages/public/Acervo'
import CursosPublico from './pages/public/Cursos'
import Entrar from './pages/public/Entrar'
import MinhaArea from './pages/public/MinhaArea'
import RedefinirSenha from './pages/public/RedefinirSenha'

// Painel administrativo carregado sob demanda: o site público fica leve no celular
const Painel = lazy(() => import('./pages/admin/Painel'))
const Livros = lazy(() => import('./pages/admin/Livros'))
const Pessoas = lazy(() => import('./pages/admin/Pessoas'))
const Emprestimos = lazy(() => import('./pages/admin/Emprestimos'))
const CursosAdmin = lazy(() => import('./pages/admin/Cursos'))
const TurmaDetalhe = lazy(() => import('./pages/admin/TurmaDetalhe'))
const Computadores = lazy(() => import('./pages/admin/Computadores'))
const Configuracoes = lazy(() => import('./pages/admin/Configuracoes'))
const Mensagens = lazy(() => import('./pages/admin/Mensagens'))

// HashRouter (#/rota): funciona em qualquer hospedagem estática gratuita, sem configuração extra.
export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <HashRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="acervo" element={<Acervo />} />
              <Route path="cursos" element={<CursosPublico />} />
              <Route path="entrar" element={<Entrar />} />
              <Route path="minha-area" element={<MinhaArea />} />
              <Route path="redefinir-senha" element={<RedefinirSenha />} />
            </Route>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Painel />} />
              <Route path="livros" element={<RequireRole balcao><Livros /></RequireRole>} />
              <Route path="pessoas" element={<Pessoas />} />
              <Route path="emprestimos" element={<RequireRole balcao><Emprestimos /></RequireRole>} />
              <Route path="cursos" element={<CursosAdmin />} />
              <Route path="turmas/:id" element={<TurmaDetalhe />} />
              <Route path="computadores" element={<RequireRole balcao><Computadores /></RequireRole>} />
              <Route path="mensagens" element={<Mensagens />} />
              <Route path="configuracoes" element={<RequireRole balcao><Configuracoes /></RequireRole>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </FeedbackProvider>
    </AuthProvider>
  )
}
