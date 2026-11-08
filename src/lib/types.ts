export type Role = 'admin' | 'professor' | 'leitor'

export interface Livro {
  id: string
  isbn: string | null
  codigo_interno: string | null
  titulo: string
  subtitulo: string | null
  autores: string | null
  editora: string | null
  ano: number | null
  paginas: number | null
  categoria: string | null
  idioma: string | null
  descricao: string | null
  capa_url: string | null
  localizacao: string | null
  quantidade: number
  emprestados: number
  origem: 'isbn' | 'manual'
  created_at: string
}

export interface Membro {
  id: string
  carteirinha: string
  nome: string
  data_nascimento: string | null
  telefone: string | null
  telefone_whatsapp: boolean
  email: string | null
  endereco: string | null
  responsavel_nome: string | null
  responsavel_telefone: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
}

export interface Emprestimo {
  id: string
  livro_id: string
  membro_id: string
  data_emprestimo: string
  data_prevista: string
  data_devolucao: string | null
  renovacoes: number
  observacoes: string | null
  ultimo_aviso_em: string | null
  whatsapp_avisado_em: string | null
  created_at: string
}

export interface Curso {
  id: string
  nome: string
  descricao: string | null
  carga_horaria: number | null
  publico: string | null
  cor: string | null
  created_at: string
}

export type StatusTurma = 'inscricoes' | 'andamento' | 'encerrada'

export interface Turma {
  id: string
  curso_id: string
  nome: string
  professor: string | null
  dias_semana: number[]
  hora_inicio: string
  hora_fim: string
  sala: string | null
  vagas: number
  matriculados: number
  data_inicio: string | null
  data_fim: string | null
  status: StatusTurma
  created_at: string
}

export interface Matricula {
  id: string
  turma_id: string
  membro_id: string
  status: 'ativa' | 'concluida' | 'cancelada'
  created_at: string
}

export interface Frequencia {
  id: string
  turma_id: string
  membro_id: string
  data: string
  presente: boolean
  created_at: string
}

export interface Inscricao {
  id: string
  turma_id: string
  membro_id: string
  status: 'pendente' | 'aprovada' | 'recusada' | 'cancelada'
  menor: boolean
  responsavel_nome: string | null
  responsavel_parentesco: string | null
  responsavel_telefone: string | null
  responsavel_email: string | null
  termo_versao: string | null
  termo_aceito_em: string | null
  assinatura: string | null
  observacoes: string | null
  motivo_recusa: string | null
  avaliado_por: string | null
  avaliado_em: string | null
  created_at: string
}

export interface Mensagem {
  id: string
  membro_id: string
  remetente_id: string | null
  remetente_nome: string | null
  assunto: string
  corpo: string
  tipo: 'mensagem' | 'atraso' | 'inscricao' | 'sistema'
  por_email: boolean
  lida_em: string | null
  created_at: string
}

/** Escala 1 a 4: precisa melhorar · regular · bom · ótimo */
export interface Avaliacao {
  id: string
  turma_id: string
  membro_id: string
  data: string
  desempenho: number | null
  comportamento: number | null
  observacao: string | null
  autor_id: string | null
  autor_nome: string | null
  created_at: string
}

export interface FilaEmail {
  id: number
  para: string
  nome: string | null
  assunto: string
  html: string
  status: 'pendente' | 'enviando' | 'enviado' | 'erro'
  tentativas: number
  erro: string | null
  created_at: string
  enviado_em: string | null
}

export interface Computador {
  id: string
  nome: string
  descricao: string | null
  status: 'livre' | 'em_uso' | 'manutencao'
  created_at: string
}

export interface UsoComputador {
  id: string
  computador_id: string
  membro_id: string | null
  visitante: string | null
  finalidade: string | null
  inicio: string
  fim: string | null
  created_at: string
}

export interface Configuracao {
  id: number
  nome_biblioteca: string
  endereco: string | null
  telefone: string | null
  email: string | null
  horario: string | null
  sobre: string | null
  prazo_dias: number
  max_emprestimos: number
  max_renovacoes: number
  tempo_computador: number
}

export interface Profile {
  id: string
  email: string
  nome: string | null
  data_nascimento: string | null
  role: Role
  membro_id: string | null
  created_at: string
}

export interface Tables {
  livros: Livro
  membros: Membro
  emprestimos: Emprestimo
  cursos: Curso
  turmas: Turma
  matriculas: Matricula
  frequencias: Frequencia
  inscricoes: Inscricao
  mensagens: Mensagem
  avaliacoes: Avaliacao
  fila_emails: FilaEmail
  computadores: Computador
  usos_computador: UsoComputador
  configuracoes: Configuracao
  profiles: Profile
}

export type TableName = keyof Tables
export type Row<K extends TableName> = Tables[K]
export type RowId = string | number

export interface SessionUser {
  id: string
  email: string
  nome: string
  role: Role
  membro_id: string | null
}

export const TABLES: TableName[] = [
  'livros', 'membros', 'emprestimos', 'cursos', 'turmas', 'matriculas', 'frequencias', 'avaliacoes',
  'inscricoes', 'mensagens', 'fila_emails', 'computadores', 'usos_computador', 'configuracoes', 'profiles',
]
