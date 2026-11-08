const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const SUPABASE_URL = url ?? ''
export const SUPABASE_KEY = key ?? ''

/** Sem Supabase configurado, o sistema roda em modo demonstração (dados no navegador). */
export const DEMO_MODE = !(url && key && url.startsWith('http') && !url.includes('SEU-PROJETO'))
