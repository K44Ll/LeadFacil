# LeadFácil

CRM de prospecção para profissionais de desenvolvimento web. Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui, Supabase Auth, PostgreSQL, Zod, Recharts e next-themes.

## Executar

Requer Node.js 22.12+ ou 24+.

```sh
npm install
# Se ainda não existir, copie .env.example para .env e configure as variáveis.
npm run dev
```

Abra http://localhost:3000. Visitantes são redirecionados ao login. Não existe acesso sem autenticação, seed automático nem armazenamento local de leads. Contas novas começam com um workspace vazio.

## Supabase Auth

Configure no **.env**:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICA
```

A chave pública pode ser enviada ao navegador; RLS restringe o acesso aos dados. A chave `service_role` nunca é utilizada pelo frontend ou pelas operações normais do CRM. `NEXT_PUBLIC_SUPABASE_ANON_KEY` é suportada como alternativa legada.

No painel do Supabase, habilite o provedor Email e configure **Authentication → URL Configuration**:

- Site URL: a URL do aplicativo.
- Redirect URLs: `http://localhost:3000/auth/callback` e a URL equivalente em produção. Inclua também o callback com `?next=/redefinir-senha` ou uma regra compatível.
- Mantenha confirmação de email habilitada e configure SMTP para entrega em produção.

Rotas: `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/auth/callback` (PKCE) e `/auth/confirm` (token hash). O proxy renova cookies e verifica o JWT. Server Actions verificam novamente o usuário; RLS continua sendo aplicada pelo banco.

O template de confirmação também pode usar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. Para recuperação, use `type=recovery`. A confirmação por token hash permite abrir o link em outro navegador.

## Banco e migrations

As nove tabelas estão em `supabase/migrations`: `profiles`, `leads`, `lists`, `lead_lists`, `tags`, `lead_tags`, `interactions`, `lead_score_factors`, `searches`.

```sh
npm run db:crm:migrate
npm run db:rls:test
```

O primeiro comando aplica apenas migrations pendentes, em uma transação. Usa `DIRECT_URL` e o certificado em `prisma/supabase-ca.crt`, com validação TLS. O segundo verifica isolamento entre usuários, bloqueio anônimo, relacionamentos e histórico, revertendo os dados temporários ao final.

As chaves estrangeiras compostas impedem vincular um lead às listas ou tags de outro usuário. As funções `crm_mutate` e `crm_save_search` são `SECURITY INVOKER`; respeitam RLS e mantêm as alterações atômicas. O histórico de status e notas é gerado por trigger.

A infraestrutura Prisma preexistente foi preservada para ferramentas administrativas e diagnóstico. As migrations do CRM têm como fonte de verdade os arquivos SQL do Supabase; não utilize Prisma Migrate em paralelo para gerenciar as mesmas tabelas.

## Funcionalidades

- Dashboard com métricas calculadas dos registros, comparação entre coortes de entrada e períodos de 7, 30 e 90 dias.
- Tabela com busca, filtros, ordenação, paginação, seleção, ações em massa e CSV protegido contra fórmulas.
- Detalhes, notas, histórico de interações, tags e múltiplas listas por lead.
- Kanban com arrastar e soltar e menu alternativo acessível por teclado.
- Busca global e comandos por Ctrl/Cmd + K.
- Temas Light, Dark, OLED, Neon, Tokyo Night e Miami Vibe. Preferências de tema, densidade e sidebar persistidas no navegador.
- Login, cadastro, confirmação de email, recuperação de senha e logout reais.

## OpenRouter

O assistente de abordagem nos detalhes do lead usa o OpenRouter pelo backend. Configure a chave e o slug completo do modelo exclusivamente no **.env**:

```dotenv
OPENROUTER_API_KEY=SUA_CHAVE
OPENROUTER_MODEL=provedor/modelo
```

A integração usa `POST https://openrouter.ai/api/v1/chat/completions`. A chave não possui prefixo `NEXT_PUBLIC_`, não entra no bundle do navegador e nunca é retornada pela API. O Route Handler exige uma sessão Supabase válida e consulta o lead com RLS antes de enviar os dados ao modelo. Sem as duas variáveis, o controle permanece desabilitado e a tela de Configurações mostra o OpenRouter como não configurado.

## Fontes de empresas e análise técnica

O provider gratuito usa Nominatim para localizar a região e Overpass API para buscar empresas no OpenStreetMap. Não exige chave nem cartão. Configure apenas um email técnico de contato no **.env**, usado para identificar corretamente o aplicativo perante os serviços públicos:

```dotenv
OSM_CONTACT_EMAIL=tecnico@suaempresa.com
```

A busca utiliza categorias conhecidas do OpenStreetMap e uma busca por nome para nichos livres. Os dados disponíveis são persistidos no CRM com a origem, link para o elemento e atribuição aos colaboradores do OpenStreetMap. A cobertura varia conforme as contribuições locais; telefone, website, email e redes sociais permanecem vazios quando não constam nos dados reais. Os endpoints públicos não oferecem SLA e devem ser substituídos por instâncias próprias se o volume crescer.

`WebsiteAnalyzer` define o contrato de análise. O analisador não configurado retorna **Não analisado**, sem inventar testes, datas ou falhas. Os critérios técnicos não somam pontos sem observações reais. Configure uma implementação real antes de habilitar a busca; só adicionar uma variável de ambiente não basta.

O score é determinístico, fica entre 0 e 100 e é explicado por fatores em `lib/scoring`. O peso de cada critério está centralizado em `SCORE_WEIGHTS`.

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Os testes de navegador usam o servidor local já iniciado. No Windows, usam Chrome instalado; em outros ambientes, instale Chromium com `npx playwright install chromium`. `PLAYWRIGHT_CHANNEL` e `TEST_BASE_URL` podem substituir esses padrões. O teste autenticado prepara uma conta temporária isolada no Supabase, utiliza o login real e remove a conta ao terminar; não envia emails. Os testes de RLS usam transações revertidas.

## Organização

`app/(workspace)` contém páginas e layout privados em Server Components; `app/(auth)` contém as páginas de acesso. `components` concentra as ilhas interativas e os componentes visuais reutilizáveis. `lib/data` acessa apenas Supabase. `types/crm.ts` descreve os contratos do domínio. `supabase/migrations` versiona o banco.
