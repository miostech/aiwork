-- ═══════════════════════════════════════════════════════════════
--  IA ACADEMY — estrutura do banco no Supabase
-- ═══════════════════════════════════════════════════════════════
-- Roda uma vez no Supabase: SQL Editor → New query → cole este arquivo → Run.
-- Pode rodar de novo sem problema: só cria o que ainda não existe.
--
-- Quem lê e grava estas tabelas são as funções do site (pasta api/), com a chave
-- secreta do Supabase. Pelo navegador, cada aluno só consegue ler os próprios dados.

-- ── Leads: todo mundo que preenche o formulário da página inicial ──
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  nome          text not null,
  email         text not null,
  whatsapp      text,
  -- até onde a pessoa chegou no funil
  etapa         text not null default 'formulario'
                check (etapa in ('formulario', 'abriu_plataforma', 'print_enviado', 'aprovado', 'recusado')),
  -- de onde veio (parâmetros do link do anúncio)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  origem        jsonb not null default '{}'::jsonb,  -- outros parâmetros do link
  aluno_id      uuid references auth.users (id) on delete set null
);
-- Etapa final: e-mail que a pessoa usou para criar a conta na plataforma (Hub) e o resultado da sua conferência.
-- Confira na lista de indicados da plataforma e mude "conferencia" para 'confirmado' ou 'nao_encontrado'.
alter table public.leads add column if not exists email_plataforma text;
alter table public.leads add column if not exists conferencia text
  check (conferencia in ('pendente', 'confirmado', 'nao_encontrado'));
create index if not exists leads_email_idx on public.leads (lower(email));
create index if not exists leads_criado_em_idx on public.leads (criado_em desc);

-- País de onde a pessoa preencheu o formulário (a Vercel descobre pelo IP; o IP não é guardado)
alter table public.leads add column if not exists pais text;

-- ── Visitas: quem abriu as páginas do site (uma linha por visitante, página e dia) ──
create table if not exists public.visitas (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  dia        date not null,   -- dia da visita (horário de Brasília)
  pagina     text not null,   -- inicio, cadastro, aiwork, aiwork-obrigado, curso e as da MIAI (miai-inicio, miai-ia-work...)
  visitante  text not null,   -- número anônimo guardado no navegador da pessoa
  pais       text,            -- código do país (BR, PT, US...), pelo IP; o IP não é guardado
  utm_source text,
  referencia text,            -- site de onde a pessoa veio (instagram.com, google.com...)
  unique (pagina, visitante, dia)
);
create index if not exists visitas_dia_idx on public.visitas (dia);

-- ── Interessados: quem pediu para ser avisado dos próximos cursos na página da MIAI (api/avise.js) ──
create table if not exists public.interessados (
  id         uuid primary key default gen_random_uuid(),
  criado_em  timestamptz not null default now(),
  email      text not null unique,
  origem     text not null default 'miai'   -- página onde a pessoa pediu o aviso
);

-- ── Validações: cada print enviado e o resultado da conferência da IA ──
create table if not exists public.validacoes (
  id           uuid primary key default gen_random_uuid(),
  criado_em    timestamptz not null default now(),
  lead_id      uuid references public.leads (id) on delete cascade,
  arquivo      text,  -- caminho do print na pasta privada "prints"
  resultado    text not null check (resultado in ('aprovado', 'recusado', 'erro')),
  indicado_por text,
  motivo       text
);
create index if not exists validacoes_lead_idx on public.validacoes (lead_id);

-- ── Alunos: quem tem login. E-mail e senha ficam no Supabase Auth (senha criptografada) ──
create table if not exists public.alunos (
  id         uuid primary key references auth.users (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  nome       text,
  email      text not null,
  whatsapp   text,
  bloqueado  boolean not null default false,  -- marque true para tirar o acesso a tudo
  senha_enviada_em timestamptz                -- última vez que uma senha foi mandada por e-mail
);
alter table public.alunos add column if not exists senha_enviada_em timestamptz;

-- ── Acessos: quais cursos cada aluno pode assistir ──
create table if not exists public.acessos (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  aluno_id    uuid not null references public.alunos (id) on delete cascade,
  curso       text not null,  -- 'gratuito' ou 'pago'
  origem      text not null,  -- 'confirmacao', 'validacao', 'stripe' ou 'manual'
  referencia  text,           -- id do lead, da validação ou da compra
  revogado_em timestamptz,    -- preenchido = acesso tirado (ex.: reembolso)
  unique (aluno_id, curso)
);

-- Uso do curso, gravado pela área do aluno (api/aulas.js): quando entrou, quais aulas concluiu e quando terminou
alter table public.acessos add column if not exists primeiro_acesso_em timestamptz;
alter table public.acessos add column if not exists ultimo_acesso_em   timestamptz;
alter table public.acessos add column if not exists aulas_concluidas   integer[];   -- posição das aulas (0 = primeira)
alter table public.acessos add column if not exists concluido_em       timestamptz; -- quando concluiu todas as aulas

-- ── Compras do curso pago (IA Work), registradas pelo aviso (webhook) do Stripe ──
create table if not exists public.compras (
  id               uuid primary key default gen_random_uuid(),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  stripe_sessao    text not null unique,   -- id da sessão de pagamento (cs_...)
  stripe_pagamento text,                   -- id do pagamento (pi_...), usado para achar a compra no reembolso
  status           text not null check (status in ('aguardando', 'pago', 'falhou', 'reembolsado')),
  email            text not null,
  nome             text,
  curso            text not null default 'pago',
  valor            integer,                -- em centavos (49700 = R$ 497,00)
  moeda            text,
  desconto         integer,                -- desconto do cupom, em centavos
  referencia       text,                   -- client_reference_id (id do lead que veio do curso gratuito)
  aluno_id         uuid references public.alunos (id) on delete set null,
  liberado_em      timestamptz             -- quando o acesso foi liberado e o e-mail com a senha enviado
);
create index if not exists compras_pagamento_idx on public.compras (stripe_pagamento);
create index if not exists compras_email_idx on public.compras (lower(email));

-- ── Atualiza "atualizado_em" dos leads sozinho ──
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists leads_atualizado_em on public.leads;
create trigger leads_atualizado_em
  before update on public.leads
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists compras_atualizado_em on public.compras;
create trigger compras_atualizado_em
  before update on public.compras
  for each row execute function public.tocar_atualizado_em();

-- ── Conferência do cadastro na plataforma: 'nao_encontrado' tira o acesso ao curso gratuito, 'confirmado' devolve ──
create or replace function public.aplicar_conferencia()
returns trigger language plpgsql as $$
begin
  if new.aluno_id is not null and new.conferencia is distinct from old.conferencia then
    if new.conferencia = 'nao_encontrado' then
      update public.acessos set revogado_em = now()
       where aluno_id = new.aluno_id and curso = 'gratuito' and revogado_em is null;
    elsif new.conferencia = 'confirmado' then
      update public.acessos set revogado_em = null
       where aluno_id = new.aluno_id and curso = 'gratuito';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists leads_conferencia on public.leads;
create trigger leads_conferencia
  after update of conferencia on public.leads
  for each row execute function public.aplicar_conferencia();

-- ── Números do painel (/painel). "desde" vazio = desde o começo.
-- O funil acompanha as pessoas que preencheram o formulário no período, até onde cada uma chegou.
-- As vendas contam todas as compras do período (inclusive de quem não veio pelo curso gratuito).
create or replace function public.painel_funil(desde timestamptz default null)
returns jsonb
language sql stable
set search_path = public
as $$
  with
  l as (select * from leads where desde is null or criado_em >= desde),
  v as (select * from visitas where desde is null or criado_em >= desde),
  ag as (select * from acessos where curso = 'gratuito' and revogado_em is null),
  c as (select * from compras where desde is null or criado_em >= desde),
  dias as (
    select generate_series(
      coalesce(date_trunc('day', desde at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date - 29),
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as dia
  )
  select jsonb_build_object(
    'funil', jsonb_build_object(
      'visitaram',   (select count(distinct visitante) from v where pagina = 'inicio'),
      'leads',       (select count(*) from l),
      'abriram_hub', (select count(*) from l where etapa <> 'formulario'),
      'liberados',   (select count(*) from l where etapa = 'aprovado'),
      'entraram',    (select count(distinct l.id) from l join ag on ag.aluno_id = l.aluno_id where ag.primeiro_acesso_em is not null),
      'concluiram',  (select count(distinct l.id) from l join ag on ag.aluno_id = l.aluno_id where ag.concluido_em is not null),
      'compraram',   (select count(distinct l.id) from l join compras cp on cp.aluno_id = l.aluno_id and cp.status = 'pago')
    ),
    'vendas', jsonb_build_object(
      'pagas',      (select count(*) from c where status = 'pago'),
      'receita',    (select coalesce(sum(valor), 0) from c where status = 'pago'),
      'com_cupom',  (select count(*) from c where status = 'pago' and coalesce(desconto, 0) > 0),
      'aguardando', (select count(*) from c where status = 'aguardando'),
      'reembolsos', (select count(*) from c where status = 'reembolsado')
    ),
    'visitas', jsonb_build_object(
      'inicio',   (select count(distinct visitante) from v where pagina = 'inicio'),
      'cadastro', (select count(distinct visitante) from v where pagina = 'cadastro'),
      'aiwork',   (select count(distinct visitante) from v where pagina = 'aiwork')
    ),
    'conferencia_pendente', (select count(*) from leads where conferencia = 'pendente'),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'visitas', (select count(distinct x.visitante) from visitas x where x.pagina = 'inicio' and x.dia = d.dia),
        'leads', (select count(*) from leads x where (x.criado_em at time zone 'America/Sao_Paulo')::date = d.dia),
        'liberados', (select count(*) from acessos x where x.curso = 'gratuito' and (x.criado_em at time zone 'America/Sao_Paulo')::date = d.dia),
        'vendas', (select count(*) from compras x where x.status = 'pago' and (x.criado_em at time zone 'America/Sao_Paulo')::date = d.dia)
      ) order by d.dia), '[]'::jsonb)
      from dias d
    ),
    'paises', (
      select coalesce(jsonb_agg(p order by (p->>'visitantes')::int desc, (p->>'leads')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'pais', k.pais,
          'visitantes', (select count(distinct v.visitante) from v where v.pagina = 'inicio' and coalesce(v.pais, '') = k.pais),
          'leads',      (select count(*) from l where coalesce(l.pais, '') = k.pais),
          'liberados',  (select count(*) from l where coalesce(l.pais, '') = k.pais and l.etapa = 'aprovado'),
          'compraram',  (select count(distinct l.id) from l join compras cp on cp.aluno_id = l.aluno_id and cp.status = 'pago' where coalesce(l.pais, '') = k.pais)
        ) as p
        from (
          select distinct coalesce(pais, '') as pais from v where pagina = 'inicio'
          union
          select distinct coalesce(pais, '') from l
        ) k
      ) t
    ),
    'origens', (
      select coalesce(jsonb_agg(o order by (o->>'leads')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'origem', coalesce(nullif(l.utm_source, ''), '(direto)'),
          'leads', count(*),
          'liberados', count(*) filter (where l.etapa = 'aprovado'),
          'compraram', count(distinct l.id) filter (where exists (select 1 from compras cp where cp.aluno_id = l.aluno_id and cp.status = 'pago'))
        ) as o
        from l group by coalesce(nullif(l.utm_source, ''), '(direto)')
      ) t
    )
  );
$$;
-- Só o servidor (chave secreta) pode chamar
revoke execute on function public.painel_funil(timestamptz) from public, anon, authenticated;
grant execute on function public.painel_funil(timestamptz) to service_role;

-- ── Lista de leads do painel, com o uso do curso e as compras de cada um ──
-- filtro: 'pendente' (conferência da Hub por fazer), 'confirmado', 'nao_encontrado' ou 'todos'.
-- busca: parte do nome, e-mail, e-mail da Hub ou WhatsApp.
create or replace function public.painel_leads(filtro text default 'pendente', busca text default null, limite int default 50, deslocamento int default 0)
returns jsonb
language sql stable
set search_path = public
as $$
  with base as (
    select l.*,
           ag.primeiro_acesso_em, ag.concluido_em, ag.revogado_em,
           coalesce(array_length(ag.aulas_concluidas, 1), 0) as aulas,
           exists (select 1 from compras c where c.aluno_id = l.aluno_id and c.status = 'pago') as comprou
    from leads l
    left join acessos ag on ag.aluno_id = l.aluno_id and ag.curso = 'gratuito'
    where (filtro = 'todos' or l.conferencia = filtro)
      and (coalesce(busca, '') = ''
           or l.nome ilike '%' || busca || '%' or l.email ilike '%' || busca || '%'
           or l.email_plataforma ilike '%' || busca || '%' or l.whatsapp ilike '%' || busca || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'contagens', jsonb_build_object(
      'pendente',       (select count(*) from leads where conferencia = 'pendente'),
      'confirmado',     (select count(*) from leads where conferencia = 'confirmado'),
      'nao_encontrado', (select count(*) from leads where conferencia = 'nao_encontrado'),
      'todos',          (select count(*) from leads)
    ),
    'leads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'criado_em', p.criado_em, 'nome', p.nome, 'email', p.email, 'whatsapp', p.whatsapp,
        'pais', p.pais, 'etapa', p.etapa, 'email_plataforma', p.email_plataforma, 'conferencia', p.conferencia,
        'utm_source', p.utm_source, 'entrou_em', p.primeiro_acesso_em, 'concluiu_em', p.concluido_em,
        'aulas', p.aulas, 'acesso_retirado', p.revogado_em is not null, 'comprou', p.comprou
      ) order by p.criado_em desc)
      from (select * from base order by criado_em desc limit greatest(1, least(limite, 200)) offset greatest(0, deslocamento)) p
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.painel_leads(text, text, int, int) from public, anon, authenticated;
grant execute on function public.painel_leads(text, text, int, int) to service_role;

-- ── Segurança: tudo fechado para o navegador, menos os dados do próprio aluno ──
alter table public.leads      enable row level security;
alter table public.validacoes enable row level security;
alter table public.alunos     enable row level security;
alter table public.acessos    enable row level security;
alter table public.compras    enable row level security;
alter table public.visitas    enable row level security;
alter table public.interessados enable row level security;

drop policy if exists "aluno lê o próprio cadastro" on public.alunos;
create policy "aluno lê o próprio cadastro" on public.alunos
  for select using (auth.uid() = id);

drop policy if exists "aluno lê os próprios acessos" on public.acessos;
create policy "aluno lê os próprios acessos" on public.acessos
  for select using (auth.uid() = aluno_id);

-- ── Pasta privada para os prints da validação ──
insert into storage.buckets (id, name, public)
values ('prints', 'prints', false)
on conflict (id) do nothing;

-- ── Funil por dia, para acompanhar no painel (Table Editor → funil_por_dia) ──
create or replace view public.funil_por_dia
with (security_invoker = true) as
select
  date_trunc('day', criado_em at time zone 'America/Sao_Paulo')::date as dia,
  count(*)                                                              as preencheram,
  count(*) filter (where etapa in ('abriu_plataforma', 'print_enviado', 'aprovado', 'recusado')) as abriram_plataforma,
  count(*) filter (where etapa in ('print_enviado', 'aprovado', 'recusado'))                    as enviaram_print,
  count(*) filter (where etapa = 'aprovado')                                                    as aprovados
from public.leads
group by 1
order by 1 desc;
