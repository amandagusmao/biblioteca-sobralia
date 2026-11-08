import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// base './' permite publicar em qualquer hospedagem estática gratuita
// (Cloudflare Pages, Netlify, GitHub Pages — inclusive em subpastas).
//
// `npm run celular` abre o site na rede Wi‑Fi com HTTPS (certificado de teste),
// para testar no celular — a câmera só funciona em endereço seguro.
// Política de segurança de conteúdo também como <meta>, para hospedagens sem suporte ao arquivo _headers.
const CSP = [
  "default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:", "media-src 'self' blob:", "worker-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brasilapi.com.br https://www.googleapis.com https://openlibrary.org https://covers.openlibrary.org",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", 'upgrade-insecure-requests',
].join('; ')

const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: html => html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// Na publicação (Cloudflare Pages define CF_PAGES=1, Netlify define NETLIFY=true) o build
// falha se o banco não estiver configurado — o site público nunca sobe em modo demonstração.
const exigeBanco = (): Plugin => ({
  name: 'exige-banco',
  apply: 'build',
  configResolved(cfg) {
    const publicando = process.env.CF_PAGES === '1' || process.env.NETLIFY === 'true'
    const env = { ...process.env, ...cfg.env }
    if (publicando && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
      throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da hospedagem.')
    }
  },
})

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), cspMeta(), exigeBanco(), ...(mode === 'celular' ? [basicSsl()] : [])],
  server: mode === 'celular' ? { host: true, port: 5174, strictPort: true } : undefined,
}))
