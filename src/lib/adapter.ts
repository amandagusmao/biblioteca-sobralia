import type { Row, RowId, SessionUser, TableName } from './types'

export interface SignUpResult {
  needsConfirmation: boolean
}

/** Resultado de um link recebido por e-mail (confirmação de conta ou redefinição de senha). */
export type RetornoEmail = 'confirmado' | 'recuperacao' | 'erro' | null

export interface AuthAdapter {
  current(): Promise<SessionUser | null>
  signIn(email: string, password: string): Promise<void>
  signUp(nome: string, email: string, password: string, nascimento: string | null): Promise<SignUpResult>
  signOut(): Promise<void>
  /** Envia o e-mail de "esqueci minha senha". */
  resetPassword(email: string): Promise<void>
  /** Troca a senha. Com `atual`, confere a senha atual antes (área do leitor). */
  updatePassword(nova: string, atual: string | null): Promise<void>
  /** Processa o link do e-mail ao abrir o site (?token_hash=...). */
  consumirLinkEmail(): Promise<RetornoEmail>
  onChange(cb: () => void): () => void
}

/** Funções do banco (regras que precisam rodar no servidor). */
export type RpcName =
  | 'aprovar_inscricao' | 'recusar_inscricao' | 'cancelar_minha_inscricao' | 'atualizar_meu_contato'
  | 'marcar_mensagem_lida' | 'enviar_mensagem' | 'email_configurado' | 'enviar_email_teste'

export interface DataAdapter {
  list<K extends TableName>(table: K): Promise<Row<K>[]>
  /** O `id` já vem preenchido (gerado no navegador). */
  insert<K extends TableName>(table: K, row: Partial<Row<K>> & { id: RowId }): Promise<void>
  update<K extends TableName>(table: K, id: RowId, patch: Partial<Row<K>>): Promise<void>
  remove<K extends TableName>(table: K, id: RowId): Promise<void>
  rpc<T = unknown>(fn: RpcName, args?: Record<string, unknown>): Promise<T>
  auth: AuthAdapter
}
