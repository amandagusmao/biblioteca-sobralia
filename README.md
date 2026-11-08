# 📚 Biblioteca Digital de Sobrália

Sistema web da **Biblioteca Digital** da Prefeitura Municipal de Sobrália/MG: acervo de livros, empréstimos e devoluções, computadores públicos e cursos de informática para crianças e jovens.

**Custo total: R$ 0,00.** Tudo roda em serviços gratuitos (Supabase + Cloudflare Pages ou Netlify + Brevo para e-mails).

---

## O que o sistema faz

### Área pública (qualquer pessoa)
- **Início**: livros novos, turmas abertas, quantos computadores estão livres agora, endereço e horário.
- **Acervo**: busca por título, autor, assunto ou ISBN, mostrando se o livro está **disponível** ou **emprestado**. Ninguém vê quem pegou o livro.
- **Cursos**: cursos, turmas, horários, vagas e grade semanal. **Inscrição online só para quem tem cadastro** — o site pergunta “já é cadastrado?” e leva para entrar ou se cadastrar. **Menores de 18 anos**: o responsável preenche os dados e **assina o termo de autorização na tela** (dedo ou mouse).
- **Autocadastro**: a pessoa cria a conta (nome, data de nascimento, e-mail, senha) e, ao confirmar o e-mail, **recebe a carteirinha digital na hora**. O balcão continua podendo cadastrar também.
- **Esqueci minha senha**: link de redefinição enviado por e-mail.

### Minha área (leitor/aluno)
- Livros comigo, prazos e histórico · aulas, horários e frequência · status das inscrições.
- **Mensagens** da biblioteca e dos professores (avisos de atraso, inscrição aprovada etc.).
- **Meus dados**: nome, nascimento e e-mail **só leitura**; pode cadastrar **telefone** e marcar **se tem WhatsApp** (opcional); **trocar a senha**.
- **Carteirinha com QR Code** para mostrar no balcão.

### Área administrativa
| Módulo | Recursos |
|---|---|
| **Painel** | números clicáveis (ex.: “Livros no acervo” abre a lista), **Central de avisos de atraso** (e-mail automático + WhatsApp em 1 clique), aulas do dia, gráficos |
| **Acervo** | cadastro por **câmera (ISBN)**, por ISBN digitado ou **manual para livros sem ISBN** (com etiqueta QR), CSV |
| **Empréstimos** | carteirinha e livro pela câmera, devolução rápida, renovação, atrasos, lembrete por WhatsApp |
| **Leitores e alunos** | cadastro único, responsável para menores, telefone/WhatsApp, carteirinha, histórico de desempenho |
| **Cursos e turmas** | turmas e horários, **análise das inscrições com o termo assinado**, aprovação (aluno recebe e-mail com as aulas), chamada, frequência, **desempenho e comportamento** |
| **Mensagens** | enviar avisos para pessoas, uma turma, quem está com atraso ou todos — aparecem na Minha área e, se marcado, por e-mail |
| **Computadores** | uso de cada máquina, tempo, finalidade, histórico |
| **Configurações** | dados e regras da biblioteca, equipe e acessos, **notificações (status dos e-mails)**, backup |

### Perfis de acesso
- **Administrador** — tudo (a equipe do balcão usa este perfil).
- **Professor** — vê **apenas alunos** (quem tem matrícula ou inscrição), cursos e turmas, chamada, desempenho/comportamento e mensagens para alunos. Não vê empréstimos, demais leitores nem configurações.
- **Leitor** — apenas os próprios dados.

### Como funciona o login da equipe
Todos usam a **mesma tela de login**. Para dar acesso a um professor ou administrador:
1. A pessoa cria a conta no site (**Entrar → Novo cadastro**) e confirma o e-mail.
2. Um administrador abre **Configurações → Equipe e acessos** e muda o perfil dela para **Professor** ou **Administrador**.
3. No próximo acesso ela entra direto no painel. Para tirar o acesso, volte o perfil para **Leitor**.

Ninguém consegue se dar acesso sozinho, ninguém altera o próprio perfil e o sistema sempre mantém pelo menos um administrador. O **primeiro administrador** é liberado uma única vez pelo SQL (veja a seção 2).

---

## 1. Ver funcionando agora (modo demonstração)

Sem configurar nada, o sistema abre em **modo demonstração**, com dados fictícios salvos só no navegador.

```bash
npm install
npm run dev
```

Abra http://localhost:5173, clique em **Entrar** e use um dos botões de demonstração (senha `demo123`). Você também pode criar contas novas (ex.: com data de nascimento de criança, para ver o termo de autorização).

### Testar no celular (mesmo Wi‑Fi)
```bash
npm run celular
```
Abra no celular o endereço da linha **Network** (ex.: `https://192.168.15.124:5174`). Aceite o aviso de certificado (é só para teste) e permita a câmera. Se não abrir, libere o Node.js no firewall do Windows para *Redes privadas*.

---

## 2. Criar o banco de dados gratuito (Supabase)

1. Crie uma conta em **https://supabase.com** e clique em **New project** (região **South America (São Paulo)**).
2. Em **Database → Extensions**, ative **pg_cron** e **pg_net** (rotinas automáticas e envio de e-mails).
3. Abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon / publishable key**. Copie `.env.example` para `.env` e cole os valores.
5. Em **Authentication → URL Configuration**: **Site URL** = endereço publicado do site (ex.: `https://biblioteca-sobralia.pages.dev`); adicione o mesmo endereço em **Redirect URLs**.
6. Em **Authentication → Providers → Email**: mantenha **Confirm email LIGADO** e **Minimum password length = 8**. ⚠️ A confirmação é o que impede alguém de usar o e-mail de outra pessoa.
7. Em **Authentication → Email Templates**, troque o link dos modelos abaixo (assim o link funciona mesmo se a pessoa abrir o e-mail em outro aparelho):
   - **Confirm signup**: `<a href="{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=email">Confirmar meu cadastro</a>`
   - **Reset password**: `<a href="{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery">Criar nova senha</a>`

### Primeiro administrador
1. Abra o site, **Entrar → Novo cadastro**, cadastre-se e confirme o e-mail.
2. No **SQL Editor**, rode (com o seu e-mail):
   ```sql
   update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
   ```
3. Saia e entre de novo. Os demais membros da equipe você libera pelo próprio site (veja acima).

---

## 3. E-mails automáticos (grátis com Brevo)

Usados para: confirmação de cadastro, “esqueci minha senha”, **aviso de livro atrasado** (todo dia às 9h, repetindo a cada 3 dias), **inscrição aprovada/recusada** (com dias, horário e local das aulas) e mensagens da equipe.

1. Crie uma conta gratuita em **https://www.brevo.com** (300 e-mails/dia grátis) com o **e-mail da biblioteca**.
2. Em **Senders, Domains & Dedicated IPs → Senders**, valide o e-mail da biblioteca como remetente.
3. **Para os e-mails de cadastro e senha:** no Brevo, abra **SMTP & API → SMTP**, copie servidor, porta, login e chave SMTP. No Supabase: **Project Settings → Authentication → SMTP Settings** → ative *Custom SMTP* e cole os dados (remetente = e-mail da biblioteca).
4. **Para os avisos automáticos:** no Brevo, **SMTP & API → API Keys → Generate**. No **SQL Editor** do Supabase rode (a chave fica criptografada no Vault, nunca no site):
   ```sql
   select vault.create_secret('COLE-A-CHAVE-API-DO-BREVO', 'brevo_api_key');
   ```
5. No site, em **Configurações → Biblioteca e regras**, preencha o **E-mail** da biblioteca (o mesmo validado no Brevo).
6. Em **Configurações → Notificações**, clique em **Enviar e-mail de teste para mim**.

Enquanto o e-mail não estiver configurado, nada se perde: as mensagens ficam na fila e aparecem na “Minha área” de cada pessoa.

### E o WhatsApp?
O envio **100% automático** pelo WhatsApp só é possível pela **API oficial do WhatsApp (Meta)**, que **cobra por mensagem** enviada pela empresa — e as alternativas “gratuitas” não oficiais violam as regras do WhatsApp e podem **bloquear o número da biblioteca**. Por isso o sistema faz assim, sem custo:
- A **Central de avisos de atraso** (Painel) lista quem está atrasado, com o botão **Avisar** que abre o WhatsApp com a mensagem **já escrita** — é só tocar em enviar. O sistema marca quem já foi avisado e sugere repetir após 3 dias.
- O leitor informa na “Minha área” se o número tem WhatsApp.
Se no futuro a prefeitura quiser pagar pelo envio automático, dá para integrar a API oficial aproveitando os telefones e a marcação de WhatsApp que o sistema já guarda.

---

## 4. Publicar o site (grátis)

### Opção A — Cloudflare Pages (recomendado: sem limite de visitas)
1. Envie esta pasta para um repositório no **GitHub** (pode ser privado).
2. Em **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório.
3. Configure:
   - **Project name:** `biblioteca-sobralia` (vira `https://biblioteca-sobralia.pages.dev`)
   - **Framework preset:** Vite (ou nenhum) · **Build command:** `npm run build` · **Output directory:** `dist`
   - **Environment variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
4. **Save and Deploy.** A cada alteração enviada ao GitHub o site é atualizado sozinho.

> Proteção: se as variáveis não estiverem preenchidas, a publicação **falha de propósito** — o site público nunca abre em modo demonstração.

**Manter o banco ativo:** no GitHub, em **Settings → Secrets and variables → Actions**, crie os segredos `SUPABASE_URL` e `SUPABASE_ANON_KEY` (mesmos valores). O GitHub pausa agendamentos de repositórios sem alterações por 60 dias — se receber o e-mail de aviso, basta abrir **Actions → Manter banco ativo → Enable workflow**.

### Opção B — Netlify (sem GitHub)
Com o `.env` preenchido: `npm run build` e arraste a pasta `dist` em **app.netlify.com/drop**.

### Domínio
- Grátis e imediato: `biblioteca-sobralia.pages.dev` / `.netlify.app`.
- Melhor (também grátis): peça à TI da prefeitura o subdomínio **`biblioteca.sobralia.mg.gov.br`** (registro CNAME) e adicione em *Custom domains*.

> A câmera só funciona em **HTTPS** — use sempre o endereço publicado.

---

## 5. Rotina recomendada
- **Backup semanal:** Configurações → Backup.
- **Manter o banco ativo:** o Supabase gratuito pausa após 7 dias sem uso. O arquivo `.github/workflows/manter-ativo.yml` faz um acesso a cada 3 dias (cadastre os *secrets* `SUPABASE_URL` e `SUPABASE_ANON_KEY` no GitHub).
- **Inscrições:** confira diariamente o aviso de “inscrições aguardando análise” no Painel.
- **Leitor de código de barras USB** (opcional, ~R$ 80): funciona como teclado.

## 6. Limites do plano gratuito
| Serviço | Limite gratuito | Uso estimado |
|---|---|---|
| Supabase banco | 500 MB | ~50 mil livros + 100 mil empréstimos + termos assinados ≈ 100 MB |
| Supabase usuários | 50 mil contas ativas/mês | toda a cidade |
| Brevo | 300 e-mails/dia | o sistema respeita o limite sozinho |
| Cloudflare Pages | visitas ilimitadas | — |

## 7. Segurança e LGPD
- **Regras no próprio banco (Row Level Security)**, testadas automaticamente (53 verificações): visitantes só veem catálogo/cursos; leitores só os próprios dados; professores só alunos e sem empréstimos; só administrador apaga cadastros e gerencia a equipe.
- **Contas:** toda conta nova é *Leitor*; a carteirinha (que dá acesso a dados pessoais) só é criada/vinculada **após confirmar o e-mail**; ninguém muda o próprio perfil.
- **Dados que o leitor não pode alterar** (nome, nascimento, e-mail) são protegidos no banco — o telefone é alterado por uma função específica.
- **Inscrições:** só para o próprio cadastro, com limite anti-spam; menoridade calculada pelo banco; termo com assinatura, data e hora registrados (assinatura eletrônica simples — Lei 14.063/2020).
- **Anotações de desempenho/comportamento** visíveis apenas para a equipe.
- **E-mails:** chave do Brevo guardada criptografada no Vault; conteúdo dos e-mails protegido contra código malicioso.
- **Sem CPF**, saída automática após 30 min sem uso, cabeçalhos de segurança (CSP, anti-clickjacking, HSTS), CSV protegido contra fórmulas.
- Nunca coloque a chave `service_role`/`secret` no site ou no GitHub. Ative a verificação em duas etapas nas contas do Supabase, Brevo e GitHub/Cloudflare.

---

## Tecnologia
React 18 + TypeScript + Vite + Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, pg_cron, pg_net, Vault) · ZXing WebAssembly / leitor nativo (código de barras) · Brevo (e-mail) · BrasilAPI, Google Books e Open Library (dados dos livros).

```
src/lib/            dados, regras, ISBN, leitor de código, autenticação
src/components/     interface (scanner, carteirinha, assinatura, termo, etc.)
src/pages/public/   site público e Minha área
src/pages/admin/    painel administrativo
supabase/schema.sql banco + regras de segurança + rotinas automáticas
```
