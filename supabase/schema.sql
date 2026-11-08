-- =====================================================================
--  BIBLIOTECA DIGITAL DE SOBRÁLIA — banco de dados (Supabase / Postgres)
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  Pode ser executado mais de uma vez (também atualiza bancos antigos).
-- =====================================================================

-- ---------- EXTENSÕES (agendamento e envio de e-mails) ----------
do $$ begin create extension if not exists pg_net with schema extensions;
exception when others then raise notice 'pg_net indisponível: e-mails automáticos desativados'; end $$;
do $$ begin create extension if not exists pg_cron;
exception when others then raise notice 'pg_cron indisponível: rotinas automáticas desativadas'; end $$;

-- ---------- TABELAS ----------
create table if not exists public.configuracoes (
  id int primary key default 1 check (id = 1),
  nome_biblioteca text not null default 'Biblioteca Digital de Sobrália',
  endereco text, telefone text, email text,
  horario text default 'Segunda a sexta, das 8h às 17h',
  sobre text,
  prazo_dias int not null default 14,
  max_emprestimos int not null default 3,
  max_renovacoes int not null default 2,
  tempo_computador int not null default 60
);
insert into public.configuracoes (id, endereco, sobre)
values (1, 'Sobrália/MG', 'Um espaço público e gratuito com livros, computadores com internet e cursos de informática para toda a comunidade de Sobrália.')
on conflict (id) do nothing;

-- Carteirinha numerada automaticamente pelo banco (sem números repetidos)
create sequence if not exists public.carteirinha_seq;

create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  carteirinha text not null unique default lpad(nextval('public.carteirinha_seq')::text, 6, '0'),
  nome text not null,
  data_nascimento date,
  telefone text,
  telefone_whatsapp boolean not null default false,
  email text,
  endereco text,
  responsavel_nome text,
  responsavel_telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Sem CPF: dado sensível desnecessário (LGPD — minimização). Remove de bancos antigos.
alter table public.membros drop column if exists cpf;
alter table public.membros add column if not exists telefone_whatsapp boolean not null default false;
alter table public.membros alter column carteirinha set default lpad(nextval('public.carteirinha_seq')::text, 6, '0');
select setval('public.carteirinha_seq', m) from (
  select max(nullif(regexp_replace(carteirinha, '\D', '', 'g'), '')::bigint) m from public.membros
) x where m is not null and m >= (select last_value from public.carteirinha_seq);
create index if not exists membros_email_idx on public.membros (lower(email));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  data_nascimento date,
  role text not null default 'leitor',
  membro_id uuid references public.membros(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists data_nascimento date;
-- Perfis: administrador (inclui a equipe do balcão), professor e leitor
update public.profiles set role = 'admin' where role = 'bibliotecario';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','professor','leitor'));

create table if not exists public.livros (
  id uuid primary key default gen_random_uuid(),
  isbn text unique,
  codigo_interno text unique,
  titulo text not null,
  subtitulo text, autores text, editora text,
  ano int, paginas int, categoria text, idioma text, descricao text, capa_url text, localizacao text,
  quantidade int not null default 1 check (quantidade >= 0),
  emprestados int not null default 0,
  origem text not null default 'isbn' check (origem in ('isbn','manual')),
  created_at timestamptz not null default now()
);

create table if not exists public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid not null references public.livros(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  data_emprestimo date not null default current_date,
  data_prevista date not null,
  data_devolucao date,
  renovacoes int not null default 0,
  observacoes text,
  ultimo_aviso_em timestamptz,      -- último aviso automático (e-mail/mensagem) de atraso
  whatsapp_avisado_em timestamptz,  -- último aviso enviado pela equipe via WhatsApp
  created_at timestamptz not null default now()
);
alter table public.emprestimos add column if not exists ultimo_aviso_em timestamptz;
alter table public.emprestimos add column if not exists whatsapp_avisado_em timestamptz;
create index if not exists emprestimos_abertos_idx on public.emprestimos (livro_id) where data_devolucao is null;
create index if not exists emprestimos_membro_idx on public.emprestimos (membro_id);

create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text, carga_horaria int, publico text, cor text,
  created_at timestamptz not null default now()
);

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  nome text not null,
  professor text,
  dias_semana int[] not null default '{}',
  hora_inicio time not null,
  hora_fim time not null,
  sala text,
  vagas int not null default 10,
  matriculados int not null default 0,
  data_inicio date, data_fim date,
  status text not null default 'inscricoes' check (status in ('inscricoes','andamento','encerrada')),
  created_at timestamptz not null default now()
);

create table if not exists public.matriculas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  status text not null default 'ativa' check (status in ('ativa','concluida','cancelada')),
  created_at timestamptz not null default now(),
  unique (turma_id, membro_id)
);

create table if not exists public.frequencias (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  data date not null,
  presente boolean not null default true,
  created_at timestamptz not null default now(),
  unique (turma_id, membro_id, data)
);

-- Desempenho e comportamento (visível só para a equipe). Escala: 1 precisa melhorar · 2 regular · 3 bom · 4 ótimo
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  data date not null default current_date,
  desempenho smallint check (desempenho between 1 and 4),
  comportamento smallint check (comportamento between 1 and 4),
  observacao text,
  autor_id uuid references public.profiles(id) on delete set null,
  autor_nome text,
  created_at timestamptz not null default now()
);

-- Inscrições nos cursos: só quem tem cadastro (conta + carteirinha). Menores: termo assinado pelo responsável.
drop table if exists public.pre_inscricoes cascade; -- substituída por "inscricoes"
create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada','cancelada')),
  menor boolean not null default false,
  responsavel_nome text,
  responsavel_parentesco text,
  responsavel_telefone text,
  responsavel_email text,
  termo_versao text,
  termo_aceito_em timestamptz,
  assinatura text check (assinatura is null or (assinatura like 'data:image/png;base64,%' and char_length(assinatura) <= 300000)),
  observacoes text,
  motivo_recusa text,
  avaliado_por uuid references public.profiles(id) on delete set null,
  avaliado_em timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists inscricoes_unica on public.inscricoes (turma_id, membro_id) where status in ('pendente','aprovada');

-- Mensagens para leitores/alunos (aparecem na "Minha área" e, se marcado, vão por e-mail)
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  remetente_id uuid references public.profiles(id) on delete set null,
  remetente_nome text,
  assunto text not null,
  corpo text not null,
  tipo text not null default 'mensagem' check (tipo in ('mensagem','atraso','inscricao','sistema')),
  por_email boolean not null default false,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mensagens_membro_idx on public.mensagens (membro_id, created_at desc);

-- Fila de e-mails (enviados automaticamente pelo banco via Brevo — gratuito até 300/dia)
create table if not exists public.fila_emails (
  id bigint generated always as identity primary key,
  para text not null,
  nome text,
  assunto text not null,
  html text not null,
  status text not null default 'pendente' check (status in ('pendente','enviando','enviado','erro')),
  tentativas int not null default 0,
  request_id bigint,
  erro text,
  created_at timestamptz not null default now(),
  enviado_em timestamptz
);
create index if not exists fila_emails_status_idx on public.fila_emails (status, created_at);

create table if not exists public.computadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'livre' check (status in ('livre','em_uso','manutencao')),
  created_at timestamptz not null default now()
);

create table if not exists public.usos_computador (
  id uuid primary key default gen_random_uuid(),
  computador_id uuid not null references public.computadores(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete set null,
  visitante text,
  finalidade text,
  inicio timestamptz not null default now(),
  fim timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- LIMITES DE TAMANHO (evita abuso e dados lixo) ----------
do $$
declare c record;
begin
  for c in select * from (values
    ('membros','nome',120), ('membros','telefone',15), ('membros','email',160), ('membros','endereco',200),
    ('membros','responsavel_nome',120), ('membros','responsavel_telefone',15), ('membros','observacoes',1000),
    ('profiles','nome',120), ('profiles','email',160),
    ('livros','titulo',300), ('livros','autores',400), ('livros','descricao',5000), ('livros','capa_url',600),
    ('inscricoes','responsavel_nome',120), ('inscricoes','responsavel_parentesco',40), ('inscricoes','responsavel_telefone',15),
    ('inscricoes','responsavel_email',160), ('inscricoes','observacoes',1000), ('inscricoes','motivo_recusa',500),
    ('mensagens','assunto',150), ('mensagens','corpo',4000),
    ('avaliacoes','observacao',1000),
    ('usos_computador','visitante',120)
  ) as t(tabela, coluna, maximo) loop
    execute format('alter table public.%I drop constraint if exists %I', c.tabela, c.tabela || '_' || c.coluna || '_tam');
    execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
      c.tabela, c.tabela || '_' || c.coluna || '_tam', c.coluna, c.maximo);
  end loop;
end $$;
alter table public.livros drop constraint if exists livros_capa_https;
alter table public.livros add constraint livros_capa_https check (capa_url is null or capa_url ~* '^https://') not valid;

-- ---------- FUNÇÕES DE PERMISSÃO ----------
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- "Balcão" = administrador (a equipe do balcão usa o perfil de administrador)
create or replace function public.is_balcao() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'admin', false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'admin', false)
$$;

create or replace function public.is_professor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'professor', false)
$$;

create or replace function public.is_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('admin','professor'), false)
$$;

create or replace function public.meu_membro() returns uuid
language sql stable security definer set search_path = public as $$
  select membro_id from public.profiles where id = auth.uid()
$$;

-- Aluno = tem matrícula ou inscrição em algum curso (o professor só enxerga alunos, não os demais leitores)
create or replace function public.e_aluno(p_membro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matriculas where membro_id = p_membro)
      or exists (select 1 from public.inscricoes where membro_id = p_membro)
$$;

-- Pode ver/gerenciar esta pessoa? (admin: todos · professor: só alunos)
create or replace function public.ve_membro(p_membro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_professor() and public.e_aluno(p_membro))
$$;

-- ---------- E-MAIL ----------
create or replace function public.html_seguro(t text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- Coloca um e-mail na fila (uso interno — não pode ser chamado pelo site)
create or replace function public.enfileirar_email(p_para text, p_nome text, p_assunto text, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare cfg public.configuracoes;
begin
  if p_para is null or p_para !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  select * into cfg from public.configuracoes where id = 1;
  insert into public.fila_emails (para, nome, assunto, html) values (
    lower(p_para), p_nome, left(p_assunto, 150),
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0d0d0d">'
    || '<div style="background:#0339A6;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">'
    || public.html_seguro(cfg.nome_biblioteca) || '</div>'
    || '<div style="border:1px solid #e2e8f0;border-top:0;padding:22px;border-radius:0 0 12px 12px;line-height:1.55">'
    || '<p>Olá, ' || public.html_seguro(split_part(coalesce(p_nome, ''), ' ', 1)) || '!</p>'
    || replace(public.html_seguro(p_texto), E'\n', '<br>')
    || '<hr style="border:0;border-top:1px solid #e2e8f0;margin:22px 0">'
    || '<p style="font-size:12px;color:#64748b">' || public.html_seguro(coalesce(cfg.endereco, '')) || ' · '
    || public.html_seguro(coalesce(cfg.horario, '')) || '<br>Mensagem automática — não responda este e-mail.</p>'
    || '</div></div>'
  );
end $$;

-- Mensagem interna (Minha área) + e-mail opcional
create or replace function public.criar_mensagem(p_membro uuid, p_assunto text, p_corpo text, p_tipo text, p_email boolean,
  p_remetente uuid default null, p_remetente_nome text default null) returns void
language plpgsql security definer set search_path = public as $$
declare m public.membros; destino text;
begin
  select * into m from public.membros where id = p_membro;
  if not found then return; end if;
  insert into public.mensagens (membro_id, remetente_id, remetente_nome, assunto, corpo, tipo, por_email)
  values (p_membro, p_remetente, p_remetente_nome, left(p_assunto, 150), left(p_corpo, 4000), p_tipo, p_email);
  if p_email then
    destino := coalesce(m.email, (select email from public.profiles where membro_id = m.id order by created_at limit 1));
    perform public.enfileirar_email(destino, m.nome, p_assunto, p_corpo);
  end if;
end $$;

-- Envia a fila pelo Brevo (chamado a cada 5 min pelo agendador). A chave fica no Vault do Supabase.
create or replace function public.processar_fila_emails() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  chave text; cfg public.configuracoes; r record; enviados_hoje int; req bigint; lote int := 0;
begin
  begin
    select decrypted_secret into chave from vault.decrypted_secrets where name = 'brevo_api_key' limit 1;
  exception when others then chave := null;
  end;
  select * into cfg from public.configuracoes where id = 1;
  if chave is null or cfg.email is null then return 'E-mail não configurado'; end if;

  -- confere respostas dos envios anteriores
  for r in select f.id, f.tentativas, h.status_code, h.error_msg, h.content
           from public.fila_emails f join net._http_response h on h.id = f.request_id
           where f.status = 'enviando' loop
    if r.status_code between 200 and 299 then
      update public.fila_emails set status = 'enviado', enviado_em = now(), erro = null where id = r.id;
    else
      update public.fila_emails set status = case when r.tentativas >= 3 then 'erro' else 'pendente' end,
        erro = left(coalesce(r.error_msg, '') || ' ' || coalesce(r.content, ''), 500) where id = r.id;
    end if;
  end loop;

  -- respeita o limite gratuito (300/dia)
  select count(*) into enviados_hoje from public.fila_emails
  where status in ('enviado','enviando') and coalesce(enviado_em, created_at) > now() - interval '1 day';

  for r in select * from public.fila_emails where status = 'pendente' order by created_at
           limit greatest(0, least(50, 290 - enviados_hoje)) loop
    req := net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object('api-key', chave, 'content-type', 'application/json', 'accept', 'application/json'),
      body := jsonb_build_object(
        'sender', jsonb_build_object('name', cfg.nome_biblioteca, 'email', cfg.email),
        'to', jsonb_build_array(jsonb_build_object('email', r.para, 'name', coalesce(r.nome, r.para))),
        'subject', r.assunto, 'htmlContent', r.html)
    );
    update public.fila_emails set status = 'enviando', request_id = req, tentativas = tentativas + 1 where id = r.id;
    lote := lote + 1;
  end loop;
  return lote || ' e-mail(s) enviados para processamento';
end $$;

-- Rotina diária: avisa automaticamente quem está com livro atrasado (repete a cada 3 dias)
create or replace function public.notificar_atrasos() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; cfg public.configuracoes;
begin
  select * into cfg from public.configuracoes where id = 1;
  for r in
    select e.id, e.membro_id, e.data_prevista, l.titulo, m.nome
    from public.emprestimos e join public.livros l on l.id = e.livro_id join public.membros m on m.id = e.membro_id
    where e.data_devolucao is null and e.data_prevista < current_date
      and (e.ultimo_aviso_em is null or e.ultimo_aviso_em < now() - interval '3 days')
  loop
    perform public.criar_mensagem(r.membro_id, 'Livro com devolução atrasada',
      'O livro "' || r.titulo || '" deveria ter sido devolvido em ' || to_char(r.data_prevista, 'DD/MM/YYYY')
      || ' (' || (current_date - r.data_prevista) || ' dia(s) de atraso).' || E'\n\n'
      || 'Por favor, devolva o livro na biblioteca ou peça a renovação no balcão'
      || coalesce(' ou pelo telefone ' || cfg.telefone, '') || '. Outras pessoas podem estar esperando por ele. Obrigado!',
      'atraso', true);
    update public.emprestimos set ultimo_aviso_em = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- CONTAS E CARTEIRINHA ----------
-- Ao confirmar o e-mail, a conta ganha a carteirinha: vincula ao cadastro feito no balcão
-- (mesmo e-mail) ou cria um cadastro novo automaticamente.
create or replace function public.garantir_carteirinha(p_user uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare p public.profiles; mid uuid;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return null; end if;
  if p.membro_id is not null then return p.membro_id; end if;
  select id into mid from public.membros where lower(email) = lower(p.email)
    and not exists (select 1 from public.profiles x where x.membro_id = membros.id)
    order by created_at limit 1;
  if mid is null then
    insert into public.membros (nome, data_nascimento, email) values (coalesce(p.nome, split_part(p.email, '@', 1)), p.data_nascimento, lower(p.email))
    returning id into mid;
  end if;
  update public.profiles set membro_id = mid where id = p_user;
  return mid;
end $$;

-- Novo usuário → perfil de LEITOR (nunca outro papel). A carteirinha só sai depois do e-mail confirmado:
-- impede que alguém use o e-mail de outra pessoa para ver os dados dela.
create or replace function public.tg_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare nasc date;
begin
  begin
    nasc := nullif(new.raw_user_meta_data->>'data_nascimento', '')::date;
  exception when others then nasc := null;
  end;
  insert into public.profiles (id, email, nome, data_nascimento, role)
  values (new.id, new.email, left(coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)), 120), nasc, 'leitor')
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then perform public.garantir_carteirinha(new.id); end if;
  return new;
end $$;
drop trigger if exists novo_usuario on auth.users;
create trigger novo_usuario after insert on auth.users
for each row execute function public.tg_novo_usuario();

create or replace function public.tg_email_confirmado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.garantir_carteirinha(new.id);
  end if;
  return new;
end $$;
drop trigger if exists email_confirmado on auth.users;
create trigger email_confirmado after update of email_confirmed_at on auth.users
for each row execute function public.tg_email_confirmado();

-- Cadastro feito no balcão com e-mail de uma conta confirmada sem carteirinha → vincula
create or replace function public.tg_vincula_membro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    update public.profiles p set membro_id = new.id
    where p.membro_id is null and lower(p.email) = lower(new.email)
      and exists (select 1 from auth.users u where u.id = p.id and u.email_confirmed_at is not null);
  end if;
  return null;
end $$;
drop trigger if exists vincula_membro on public.membros;
create trigger vincula_membro after insert or update of email on public.membros
for each row execute function public.tg_vincula_membro();

-- Ninguém altera o próprio papel; o último administrador não pode ser rebaixado; e-mail/nome só pelo admin
create or replace function public.tg_protege_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id <> old.id or new.email <> old.email then raise exception 'Campo não pode ser alterado'; end if;
  if new.role <> old.role then
    if old.id = auth.uid() then raise exception 'Você não pode alterar o seu próprio perfil de acesso'; end if;
    if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'É preciso manter pelo menos um administrador';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protege_perfil on public.profiles;
create trigger protege_perfil before update on public.profiles
for each row execute function public.tg_protege_perfil();

-- ---------- CONTADORES ----------
create or replace function public.tg_conta_emprestados() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.livros l set emprestados = (
    select count(*) from public.emprestimos e where e.livro_id = l.id and e.data_devolucao is null
  ) where l.id in (coalesce(new.livro_id, old.livro_id), coalesce(old.livro_id, new.livro_id));
  return null;
end $$;
drop trigger if exists conta_emprestados on public.emprestimos;
create trigger conta_emprestados after insert or update or delete on public.emprestimos
for each row execute function public.tg_conta_emprestados();

create or replace function public.tg_conta_matriculados() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.turmas t set matriculados = (
    select count(*) from public.matriculas m where m.turma_id = t.id and m.status = 'ativa'
  ) where t.id in (coalesce(new.turma_id, old.turma_id), coalesce(old.turma_id, new.turma_id));
  return null;
end $$;
drop trigger if exists conta_matriculados on public.matriculas;
create trigger conta_matriculados after insert or update or delete on public.matriculas
for each row execute function public.tg_conta_matriculados();

-- ---------- INSCRIÇÕES ----------
create or replace function public.tg_inscricao() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.membros; t public.turmas; idade int;
begin
  if public.is_equipe() then return new; end if;
  -- leitor: só para si mesmo, sempre pendente
  if new.membro_id is distinct from public.meu_membro() then raise exception 'Inscrição permitida apenas para o próprio cadastro'; end if;
  select * into m from public.membros where id = new.membro_id;
  select * into t from public.turmas where id = new.turma_id;
  if t.status = 'encerrada' then raise exception 'Esta turma está encerrada'; end if;
  if (select count(*) from public.inscricoes where membro_id = new.membro_id and status = 'pendente') >= 5 then
    raise exception 'Você já tem muitas inscrições aguardando análise';
  end if;
  new.status := 'pendente';
  new.created_at := now();
  new.avaliado_por := null; new.avaliado_em := null; new.motivo_recusa := null;
  idade := extract(year from age(current_date, m.data_nascimento));
  new.menor := coalesce(idade < 18, true); -- sem data de nascimento: trata como menor (exige termo)
  if new.menor then
    if coalesce(trim(new.responsavel_nome), '') = '' or char_length(regexp_replace(coalesce(new.responsavel_telefone, ''), '\D', '', 'g')) < 10
       or new.assinatura is null then
      raise exception 'Para menores de 18 anos é obrigatório o termo assinado pelo responsável';
    end if;
    new.termo_aceito_em := now();
  else
    new.assinatura := null; new.termo_aceito_em := null;
  end if;
  new.responsavel_telefone := nullif(regexp_replace(coalesce(new.responsavel_telefone, ''), '\D', '', 'g'), '');
  return new;
end $$;
drop trigger if exists inscricao_segura on public.inscricoes;
create trigger inscricao_segura before insert on public.inscricoes
for each row execute function public.tg_inscricao();

create or replace function public.aprovar_inscricao(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare i public.inscricoes; t public.turmas; c public.cursos; dias text;
begin
  if not public.is_equipe() then raise exception 'Sem permissão'; end if;
  select * into i from public.inscricoes where id = p_id for update;
  if not found or i.status <> 'pendente' then raise exception 'Inscrição não está pendente'; end if;
  select * into t from public.turmas where id = i.turma_id for update;
  select * into c from public.cursos where id = t.curso_id;
  if t.matriculados >= t.vagas then raise exception 'A turma está cheia'; end if;
  insert into public.matriculas (turma_id, membro_id, status) values (i.turma_id, i.membro_id, 'ativa')
  on conflict (turma_id, membro_id) do update set status = 'ativa';
  update public.inscricoes set status = 'aprovada', avaliado_por = auth.uid(), avaliado_em = now() where id = p_id;
  if i.menor then
    update public.membros set responsavel_nome = coalesce(responsavel_nome, i.responsavel_nome),
      responsavel_telefone = coalesce(responsavel_telefone, i.responsavel_telefone) where id = i.membro_id;
  end if;
  select string_agg((array['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'])[d + 1], ', ' order by d)
    into dias from unnest(t.dias_semana) d;
  perform public.criar_mensagem(i.membro_id, 'Inscrição aprovada: ' || c.nome,
    'Sua inscrição no curso ' || c.nome || ' foi aprovada! 🎉' || E'\n\n'
    || 'Turma: ' || t.nome || E'\n'
    || 'Dias: ' || coalesce(dias, '-') || E'\n'
    || 'Horário: ' || to_char(t.hora_inicio, 'HH24:MI') || ' às ' || to_char(t.hora_fim, 'HH24:MI') || E'\n'
    || coalesce('Local: ' || t.sala || E'\n', '')
    || coalesce('Professor: ' || t.professor || E'\n', '')
    || coalesce('Início: ' || to_char(t.data_inicio, 'DD/MM/YYYY') || E'\n', '')
    || E'\nChegue alguns minutos antes da primeira aula. Até lá!',
    'inscricao', true, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  return 'ok';
end $$;

create or replace function public.recusar_inscricao(p_id uuid, p_motivo text) returns text
language plpgsql security definer set search_path = public as $$
declare i public.inscricoes; c text;
begin
  if not public.is_equipe() then raise exception 'Sem permissão'; end if;
  select * into i from public.inscricoes where id = p_id for update;
  if not found or i.status <> 'pendente' then raise exception 'Inscrição não está pendente'; end if;
  update public.inscricoes set status = 'recusada', motivo_recusa = left(p_motivo, 500), avaliado_por = auth.uid(), avaliado_em = now() where id = p_id;
  select cu.nome into c from public.turmas t join public.cursos cu on cu.id = t.curso_id where t.id = i.turma_id;
  perform public.criar_mensagem(i.membro_id, 'Sobre sua inscrição: ' || c,
    'Não foi possível confirmar sua inscrição no curso ' || c || '.' || coalesce(E'\n\nMotivo: ' || nullif(trim(p_motivo), ''), '')
    || E'\n\nProcure a biblioteca se tiver dúvidas.', 'inscricao', true, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  return 'ok';
end $$;

create or replace function public.cancelar_minha_inscricao(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.inscricoes set status = 'cancelada' where id = p_id and membro_id = public.meu_membro() and status = 'pendente'
$$;

-- ---------- AÇÕES DO LEITOR ----------
create or replace function public.atualizar_meu_contato(p_telefone text, p_whatsapp boolean) returns void
language plpgsql security definer set search_path = public as $$
declare tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
begin
  if public.meu_membro() is null then raise exception 'Conta sem carteirinha'; end if;
  if tel is not null and char_length(tel) not between 10 and 11 then raise exception 'Telefone inválido: use DDD + número'; end if;
  update public.membros set telefone = tel, telefone_whatsapp = coalesce(p_whatsapp, false) and tel is not null
  where id = public.meu_membro();
end $$;

create or replace function public.marcar_mensagem_lida(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.mensagens set lida_em = now() where id = p_id and membro_id = public.meu_membro() and lida_em is null
$$;

-- ---------- AÇÕES DA EQUIPE ----------
-- Mensagem para várias pessoas (professor: apenas para alunos)
create or replace function public.enviar_mensagem(p_membros uuid[], p_assunto text, p_corpo text, p_email boolean) returns int
language plpgsql security definer set search_path = public as $$
declare mid uuid; n int := 0; nome_rem text;
begin
  if not public.is_equipe() then raise exception 'Sem permissão'; end if;
  if coalesce(trim(p_assunto), '') = '' or coalesce(trim(p_corpo), '') = '' then raise exception 'Preencha assunto e mensagem'; end if;
  if array_length(p_membros, 1) > 500 then raise exception 'Máximo de 500 destinatários por envio'; end if;
  select nome into nome_rem from public.profiles where id = auth.uid();
  foreach mid in array p_membros loop
    if public.ve_membro(mid) then
      perform public.criar_mensagem(mid, p_assunto, p_corpo, 'mensagem', coalesce(p_email, false), auth.uid(), nome_rem);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.email_configurado() returns boolean
language plpgsql security definer set search_path = public as $$
declare chave text;
begin
  if not public.is_admin() then return null; end if;
  begin
    select decrypted_secret into chave from vault.decrypted_secrets where name = 'brevo_api_key' limit 1;
  exception when others then chave := null;
  end;
  return chave is not null and (select email from public.configuracoes where id = 1) is not null;
end $$;

create or replace function public.enviar_email_teste() returns text
language plpgsql security definer set search_path = public as $$
declare meu text;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select email into meu from public.profiles where id = auth.uid();
  perform public.enfileirar_email(meu, 'Equipe', 'Teste de e-mail da biblioteca', 'Se você recebeu esta mensagem, os e-mails automáticos estão funcionando. ✅');
  return public.processar_fila_emails();
end $$;

-- ---------- SEGURANÇA (Row Level Security) ----------
alter table public.configuracoes   enable row level security;
alter table public.membros         enable row level security;
alter table public.profiles        enable row level security;
alter table public.livros          enable row level security;
alter table public.emprestimos     enable row level security;
alter table public.cursos          enable row level security;
alter table public.turmas          enable row level security;
alter table public.matriculas      enable row level security;
alter table public.frequencias     enable row level security;
alter table public.avaliacoes      enable row level security;
alter table public.inscricoes      enable row level security;
alter table public.mensagens       enable row level security;
alter table public.fila_emails     enable row level security;
alter table public.computadores    enable row level security;
alter table public.usos_computador enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Público: catálogo, cursos, turmas, computadores livres, informações
create policy "leitura publica" on public.livros        for select using (true);
create policy "leitura publica" on public.cursos        for select using (true);
create policy "leitura publica" on public.turmas        for select using (true);
create policy "leitura publica" on public.computadores  for select using (true);
create policy "leitura publica" on public.configuracoes for select using (true);

-- Administrador (balcão)
create policy "admin escreve" on public.livros          for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.emprestimos     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.computadores    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.usos_computador for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.configuracoes   for all using (public.is_admin()) with check (public.is_admin());
create policy "admin le"      on public.fila_emails     for select using (public.is_admin());

-- Pessoas: admin vê todos; professor só alunos; cada leitor o próprio. Apagar: só admin.
create policy "ve pessoas"      on public.membros for select using (public.ve_membro(id) or id = public.meu_membro());
create policy "equipe cadastra" on public.membros for insert with check (public.is_equipe());
create policy "equipe edita"    on public.membros for update using (public.ve_membro(id)) with check (public.is_equipe());
create policy "admin apaga"     on public.membros for delete using (public.is_admin());

-- Cursos, turmas, matrículas, frequência, desempenho: equipe
create policy "equipe escreve" on public.cursos      for all using (public.is_equipe()) with check (public.is_equipe());
create policy "equipe escreve" on public.turmas      for all using (public.is_equipe()) with check (public.is_equipe());
create policy "equipe escreve" on public.matriculas  for all using (public.is_equipe()) with check (public.is_equipe());
create policy "equipe escreve" on public.frequencias for all using (public.is_equipe()) with check (public.is_equipe());
create policy "equipe escreve" on public.avaliacoes  for all using (public.is_equipe()) with check (public.is_equipe());

-- Inscrições: leitor envia e acompanha as suas; equipe analisa
create policy "leitor envia"     on public.inscricoes for insert with check (membro_id = public.meu_membro() or public.is_equipe());
create policy "ve inscricoes"    on public.inscricoes for select using (membro_id = public.meu_membro() or public.is_equipe());
create policy "equipe atualiza"  on public.inscricoes for update using (public.is_equipe()) with check (public.is_equipe());
create policy "admin apaga"      on public.inscricoes for delete using (public.is_admin());

-- Mensagens: leitor lê as suas; admin vê todas; professor vê as que enviou. Criação só por função.
create policy "ve mensagens" on public.mensagens for select
  using (membro_id = public.meu_membro() or public.is_admin() or (public.is_professor() and remetente_id = auth.uid()));

-- Leitor vê apenas os próprios dados
create policy "leitor ve o seu" on public.emprestimos for select using (membro_id = public.meu_membro());
create policy "leitor ve o seu" on public.matriculas  for select using (membro_id = public.meu_membro());
create policy "leitor ve o seu" on public.frequencias for select using (membro_id = public.meu_membro());

-- Perfis: cada um vê o seu; admin vê todos; só admin altera papéis/vínculos
create policy "ve o proprio perfil" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admin altera perfis" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- ---------- PERMISSÕES DA API (defesa em profundidade) ----------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.livros, public.cursos, public.turmas, public.computadores, public.configuracoes to anon, authenticated;
grant select, insert, update, delete on
  public.membros, public.livros, public.emprestimos, public.cursos, public.turmas, public.matriculas,
  public.frequencias, public.avaliacoes, public.inscricoes, public.computadores, public.usos_computador, public.configuracoes
  to authenticated;
grant select on public.mensagens, public.fila_emails to authenticated;
grant select, update on public.profiles to authenticated;
grant usage on sequence public.carteirinha_seq to authenticated;

-- Funções: por padrão ninguém executa; liberamos só as que o site usa.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.meu_papel(), public.is_balcao(), public.is_admin(), public.is_professor(), public.is_equipe(),
  public.meu_membro(), public.e_aluno(uuid), public.ve_membro(uuid), public.html_seguro(text) to anon, authenticated;
grant execute on function public.aprovar_inscricao(uuid), public.recusar_inscricao(uuid, text), public.cancelar_minha_inscricao(uuid),
  public.atualizar_meu_contato(text, boolean), public.marcar_mensagem_lida(uuid), public.enviar_mensagem(uuid[], text, text, boolean),
  public.email_configurado(), public.enviar_email_teste() to authenticated;

-- ---------- ROTINAS AUTOMÁTICAS ----------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('biblioteca-atrasos', 'biblioteca-emails');
    perform cron.schedule('biblioteca-atrasos', '0 12 * * *', 'select public.notificar_atrasos()');      -- 9h de Brasília
    perform cron.schedule('biblioteca-emails', '*/5 * * * *', 'select public.processar_fila_emails()');
  end if;
end $$;

-- =====================================================================
--  PRIMEIRO ADMINISTRADOR
--  1) Crie sua conta pelo site (Entrar → Criar conta) e confirme o e-mail
--  2) Rode trocando pelo seu e-mail:
--     update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
--
--  E-MAILS AUTOMÁTICOS (Brevo, gratuito) — veja o README:
--     select vault.create_secret('SUA-CHAVE-API-DO-BREVO', 'brevo_api_key');
--  e preencha o e-mail da biblioteca em Configurações (deve ser o remetente validado no Brevo).
-- =====================================================================
