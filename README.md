# FlashClip

Plataforma web do evento FlashClip, voltada à divulgação da programação e dos cursos, apresentação de instrutores e parceiros, cadastro de participantes e gerenciamento de matrículas.

> **Estado documentado:** 17/10/2026. Este documento foi elaborado por inspeção dos arquivos presentes no pacote do projeto. As páginas e chamadas ao Supabase foram analisadas no código, mas não foi feita uma execução de ponta a ponta com o banco de dados real; portanto, a configuração e as permissões do Supabase precisam ser confirmadas no painel do projeto foi usado IA para fazer um resumo doque ja foi feito.

## Índice

- [Visão geral](#visão-geral)
- [Funcionalidades atuais](#funcionalidades-atuais)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como executar localmente](#como-executar-localmente)
- [Integração com o Supabase](#integração-com-o-supabase)
- [Modelo de dados esperado pelo código](#modelo-de-dados-esperado-pelo-código)
- [Fluxos principais](#fluxos-principais)
- [Configurações atuais do projeto](#configurações-atuais-do-projeto)
- [Publicação](#publicação)
- [Pontos de atenção identificados](#pontos-de-atenção-identificados)
- [Checklist antes de colocar em produção](#checklist-antes-de-colocar-em-produção)

## Visão geral

O FlashClip é uma aplicação web estática, construída com HTML, CSS e JavaScript no navegador. Não há servidor próprio, processo de compilação, `package.json` ou migrações SQL incluídos no pacote atual. Os recursos de autenticação e persistência de dados são fornecidos pelo **Supabase**, acessado diretamente pelo frontend por meio da biblioteca `supabase-js` carregada via CDN.

A interface possui páginas públicas do evento, páginas de autenticação, fluxo de matrícula e um painel administrativo separado. O conteúdo da programação e de alguns blocos institucionais está definido diretamente no HTML; os cards de cursos, a relação de instrutores e os dados de inscrições são consultados no Supabase.

## Funcionalidades atuais

### Páginas públicas

- **Início (`index.html`):** apresentação do evento, contador regressivo, seções institucionais, parceiros e cursos disponíveis.
- **Sobre (`html/sobre.html`):** apresentação institucional do FlashClip.
- **Cursos (`html/cursos.html`):** listagem de cursos alimentada pelo Supabase, com navegação para o fluxo de matrícula.
- **Programação (`html/programacao.html`):** agenda do evento definida no HTML.
- **Instrutores (`html/instrutores.html`):** lista de ministrantes agrupada por curso, consultada a partir dos dados do Supabase.
- **Patrocinadores (`html/patrocinadores.html`):** apresentação de parceiros com filtros de categoria no navegador.
- **FAQ (`html/faq.html`):** perguntas frequentes usando elementos expansíveis do HTML.
- **Contato (`html/contato.html`):** informações de contato, links de e-mail/telefone e mapa incorporado. O pacote não contém um formulário de contato com envio para um backend.

### Conta e inscrições

- **Cadastro (`html/cadastro.html`):** validação de campos, máscara/formatação de telefone, validação de idade, avaliação visual da força da senha e criação de conta pelo Supabase Auth. Após criar a conta, o código tenta inserir o perfil na tabela `usuarios`.
- **Login (`html/login.html`):** autenticação por e-mail e senha via Supabase Auth, mensagens de erro e bloqueio temporário no navegador após tentativas falhas.
- **Matrícula (`html/matricula.html`):** carrega o curso indicado pelo parâmetro `id` da URL, exibe os detalhes e permite solicitar a matrícula.
- **Minhas inscrições (`html/inscricoes.html`):** lista as matrículas da conta autenticada e os dados relacionados dos cursos.

O fluxo de matrícula verifica a sessão, procura o perfil do usuário pelo e-mail, verifica o período e as vagas informadas e procura matrícula anterior no mesmo período antes de tentar inserir uma nova matrícula. Essas validações no frontend melhoram a experiência, mas não substituem validações e restrições equivalentes no banco de dados.

### Painel administrativo

O painel está em `admin/admin.html` e utiliza `admin/admin.js` e `admin/admin.css`. O código prevê:

- Resumo do total de pessoas inscritas;
- Identificação do curso com mais matrículas;
- Cálculo da média de idade dos participantes;
- Contagem de matrículas pendentes;
- Consulta de participantes por curso;
- Alteração do status de uma matrícula de **Pendente** para **Atendido**.

**Importante:** a implementação do painel usa nomes de colunas diferentes dos usados pelo restante da aplicação. Consulte [Pontos de atenção identificados](#pontos-de-atenção-identificados) antes de considerar o painel operacional.

## Tecnologias

| Tecnologia | Uso atual |
|---|---|
| HTML5 | Estrutura das páginas e conteúdo do evento |
| CSS3 | Layout, cores, responsividade e estilos específicos por página |
| JavaScript moderno (ES Modules) | Interações, validações, renderização de cards e chamadas de dados |
| Supabase JS v2 via CDN | Autenticação e acesso ao banco Supabase |
| Supabase Auth | Cadastro, login e sessão do participante |
| Supabase Database / PostgREST | Cursos, perfis, ministrantes e matrículas |
| `localStorage` | Cache de dados de cursos/vagas e nome exibido do usuário |
| SVG, PNG e JPG | Logos, ilustrações, imagens de cursos e avatares |
| Three.js (local, em `vendor/three`, licença MIT) | Globo de neve, trenó e notebooks 3D dos cursos |
| Web Audio API | Música e efeitos de Natal sintetizados no navegador, sem arquivos de áudio |

Não foi encontrado no pacote um framework frontend, um gerenciador de pacotes, uma suíte de testes automatizados, um arquivo `.env`, nem scripts de migração/criação do banco.

## Estrutura de pastas

```text
FlashClip/
├── index.html                 # Página inicial
├── README.md                  # Esta documentação
├── models/                   # Modelos 3D (.glb) do globo de neve e do trenó
├── notebooks/                # Notebooks 3D dos cards de curso: modelo, logos (Devicon, MIT) e scripts
├── vendor/three/             # Three.js local (licença MIT)
├── admin/
│   ├── admin.html              # Dashboard administrativo
│   ├── admin.css               # Estilos do painel
│   └── admin.js                # Consultas e ações administrativas
├── css/                        # Folhas de estilo por página/componente
│   ├── natal.css               # Tema de Natal na paleta escura, usado em todas as páginas
│   ├── globo.css               # Globo de neve 3D da página inicial
│   ├── entrada.css             # Abertura interativa (toques no globo, Papai Noel)
│   ├── cabecalho.css
│   ├── rodape.css
│   ├── home.css
│   ├── cadastro.css
│   ├── login.css
│   ├── cursos.css
│   ├── matricula.css
│   ├── inscricoes.css
│   ├── instrutores.css
│   ├── programacao.css
│   ├── patrocinadores.css
│   ├── contato.css
│   ├── sobre.css
│   └── faq.css
├── html/                       # Páginas internas
│   ├── cadastro.html
│   ├── login.html
│   ├── cursos.html
│   ├── matricula.html
│   ├── inscricoes.html
│   ├── instrutores.html
│   ├── programacao.html
│   ├── patrocinadores.html
│   ├── contato.html
│   ├── sobre.html
│   └── faq.html
├── imagens/                    # Imagens, logos e ilustrações
└── js/                         # Lógica do frontend
    ├── carregamento.js         # Tela de carregamento e recuperação de falhas
    ├── globo.js                # Globo de neve 3D (mouse, toque, teclado, chacoalhar)
    ├── entrada.js              # Abertura com cinco toques e trenó
    ├── abertura-3d.js          # Animação 3D do trenó na abertura
    ├── audio-natal.js          # Música e efeitos sintetizados, liberados no toque
    ├── natal.js                # Barra de progresso, revelações e detalhes do tema
    ├── shake-gesture.js        # Detecta o gesto de chacoalhar
    ├── snow-physics.js         # Física da neve dentro do globo
    ├── supabase.js             # Cliente/configuração Supabase compartilhada
    ├── auth.js                 # Sessão e nome do usuário no cabeçalho
    ├── cabecalho.js            # Menu mobile e sincronização do usuário
    ├── cadastro.js             # Cadastro e validações
    ├── login.js                # Login e tratamento de tentativas
    ├── dados.js                # Consultas e cache de cursos/instrutores/vagas
    ├── carregarCardsCursos.js  # Renderização dos cards e navegação para matrícula
    ├── cursos.js               # Inicialização da listagem interna de cursos
    ├── script.js               # Contador da home e listagem de cursos da home
    ├── matricula.js             # Consulta e confirmação de matrícula
    ├── inscricoes.js            # Listagem das inscrições da conta
    ├── instrutores.js           # Renderização dos instrutores por curso
    └── patrocinadores.js        # Filtro dos cards de patrocinadores
```

## Como executar localmente

Como o projeto usa **módulos JavaScript** e chamadas HTTP ao Supabase, abra-o por um servidor local, e não diretamente por `file://`.

### Opção 1 — Visual Studio Code

1. Abra a pasta `FlashClip` no VS Code.
2. Instale/ative a extensão **Live Server**, caso ainda não esteja disponível.
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
4. Navegue pelas páginas usando os links do próprio site.

### Opção 2 — Python

Com Python instalado, abra o terminal dentro da pasta `FlashClip` e execute:

```bash
python -m http.server 5500
```

No Windows, também pode funcionar:

```powershell
py -m http.server 5500
```

Acesse `http://localhost:5500/` no navegador. Para encerrar o servidor, use `Ctrl+C` no terminal.

O servidor local só hospeda os arquivos. Ele não corrige configurações de autenticação, permissões ou estrutura do banco Supabase.

## Integração com o Supabase

A configuração compartilhada fica em `js/supabase.js`. O painel administrativo também cria seu cliente Supabase diretamente em `admin/admin.js`, duplicando a configuração.

Para conectar outra instância:

1. Abra o painel do Supabase do projeto correto.
2. Copie a URL do projeto e a chave pública apropriada para aplicações frontend.
3. Atualize os valores em `js/supabase.js` e `admin/admin.js`, mantendo-os consistentes.
4. No Supabase Auth, configure a URL do site e as URLs permitidas conforme o endereço de desenvolvimento/publicação.
5. Confirme as tabelas, colunas, relacionamentos e políticas de acesso descritos na próxima seção.

O frontend precisa de uma **chave publicável/anon**, adequada para uso no navegador. **Nunca coloque uma `service_role` key ou outra credencial secreta em arquivos HTML/JavaScript enviados ao navegador.** A chave publicável não substitui as políticas de segurança: a proteção dos registros precisa ser aplicada no banco, principalmente por meio de Row Level Security (RLS) e políticas adequadas.

### Cache no navegador

`js/dados.js` mantém dados gerais em `localStorage` por até **60 minutos** e dados de vagas por até **2 minutos**. `js/auth.js` também mantém localmente o nome/e-mail usado para exibição no cabeçalho. Os caches são locais a cada navegador/dispositivo, não são a fonte oficial dos dados e podem exibir informações antigas até a próxima atualização/expiração. A função `limparCacheCursos()` está disponível em `js/dados.js` para limpar os caches de cursos e vagas.

## Modelo de dados esperado pelo código

O arquivo ZIP não inclui o esquema SQL do banco nem migrações. A lista abaixo descreve os nomes que o **frontend espera consultar**; ela não comprova que todas as colunas estejam atualmente criadas no Supabase.

### `usuarios`

Campos usados em diferentes partes da aplicação:

- `idUsuario` — identificador de perfil usado por matrículas e ministrantes;
- `nome`, `email`, `telefone`, `idade`, `origem` — dados do participante;
- `permissao` — campo booleano consultado pelo painel administrativo para verificar se o usuário pode entrar no dashboard.

O Supabase Auth armazena credenciais e a sessão separadamente. No cadastro, o código cria a conta de Auth e depois insere o perfil em `usuarios`, enviando nome, telefone, origem, idade e e-mail. O código de cadastro não inclui explicitamente o UUID do usuário autenticado nessa inserção; é necessário verificar como o perfil público é associado à conta de Auth.

### `cursos`

Campos utilizados pelas páginas e pelo fluxo de matrícula:

- `idCurso`;
- `nome` e `descricao`;
- `imagem`;
- `status`;
- `sala`;
- `vagas`;
- `periodo`.

### `ministrantes`

O código espera consultar:

- `idMinistrante`;
- `idUsuario`;
- `idCurso`;
- `referenciaFoto`.

O relacionamento aninhado associa cada ministrante a um registro em `usuarios` e a um registro em `cursos`.

### `matriculas`

Campos usados no fluxo de inscrição e na tela “Minhas inscrições”:

- `idMatricula`;
- `idUsuario`;
- `idCurso`;
- `dataInscricao`;
- `status` — usado pelo dashboard, com os valores de interface `Pendente` e `Atendido`.

A inserção feita pelo fluxo de matrícula envia `idUsuario`, `idCurso` e `dataInscricao`; o código depende de qualquer valor inicial de `status` ser fornecido por um valor padrão ou outra regra do banco, caso esse campo seja obrigatório.

### Relacionamentos esperados

O frontend depende de relacionamentos equivalentes aos seguintes:

- `ministrantes.idUsuario` → `usuarios.idUsuario`;
- `ministrantes.idCurso` → `cursos.idCurso`;
- `matriculas.idUsuario` → `usuarios.idUsuario`;
- `matriculas.idCurso` → `cursos.idCurso`.

Os nomes/relacionamentos reais devem ser confirmados em **Database → Tables** no Supabase. Os nomes exatos usados em consultas, inclusive maiúsculas e minúsculas, precisam corresponder ao esquema publicado pela API.

### Segurança/RLS necessária

Antes de publicar ou usar com dados reais, revise as políticas de cada tabela. Como orientação de arquitetura:

- As páginas públicas precisam ler apenas os dados de cursos e instrutores que podem ser divulgados.
- Participantes devem conseguir consultar suas próprias informações e matrículas, não as de outras pessoas.
- A criação de uma matrícula precisa estar vinculada à conta autenticada correspondente.
- Alterações de status e dados administrativos devem ser permitidas apenas a administradores, com a restrição aplicada no banco/RLS e não apenas no JavaScript.
- Regras de lotação e de uma matrícula por período devem, idealmente, ser garantidas também pelo banco, para evitar conflitos de solicitações simultâneas.

## Fluxos principais

### Cadastro e login

1. A pessoa preenche o formulário de cadastro.
2. `js/cadastro.js` valida os campos e chama `supabase.auth.signUp()`.
3. Se a conta for criada, o script tenta inserir os dados pessoais em `usuarios`.
4. O login é realizado em `js/login.js` com `signInWithPassword()`.
5. `js/auth.js` consulta a sessão e tenta buscar o nome do perfil para atualizar o cabeçalho.

Como conta de Auth e perfil são criados em duas operações, pode ocorrer de a conta existir sem que o perfil tenha sido salvo. O código apresenta uma mensagem para esse caso; a recuperação/consistência desse estado precisa ser considerada.

### Inscrição em um curso

1. A listagem consulta cursos e vagas no Supabase.
2. O link de matrícula envia o identificador do curso pela query string, por exemplo `matricula.html?id=ID`.
3. A página consulta os dados do curso e exige uma sessão autenticada para confirmar a inscrição.
4. O script procura o perfil do participante, verifica se as vagas são conhecidas/disponíveis e procura matrícula existente no mesmo período.
5. Se as validações passarem, tenta inserir o registro em `matriculas`.
6. A página “Minhas inscrições” consulta as matrículas associadas ao perfil e apresenta os dados dos cursos.

### Operação administrativa

1. `admin/admin.js` verifica a sessão.
2. Busca o campo `permissao` na tabela `usuarios`.
3. Se autorizado, carrega métricas e disponibiliza a consulta de participantes por curso.
4. Uma matrícula pendente pode ser marcada como atendida.

Esse fluxo está presente no código, mas depende de alinhar as colunas consultadas pelo painel com as utilizadas no restante da aplicação e de configurar políticas RLS específicas para administradores.

## Configurações atuais do projeto

Os seguintes valores estão definidos diretamente no JavaScript e precisam ser atualizados quando o evento/ciclo mudar:

- **Data e hora do contador:** `05/12/2026 às 14h`, com fuso `-03:00`, no arquivo `js/script.js`.
- **Período considerado nas regras/listagem de cursos:** `2026/02`, em `js/carregarCardsCursos.js`.
- **Duração padrão exibida para cursos:** `3 horas`, em `js/carregarCardsCursos.js`.
- **Limite de instrutores exibidos no card:** `4`, em `js/carregarCardsCursos.js`.
- **Cliente Supabase:** definido em `js/supabase.js` e repetido em `admin/admin.js`.
- **Robots:** `robots.txt` contém `User-agent: *` e `Disallow: /`, instruindo robôs compatíveis a não rastrear nenhuma rota do site.

A agenda, os textos, parte dos patrocinadores e os dados de contato também possuem conteúdo direto nos arquivos HTML, portanto não são todos gerenciados pelo banco.

## Publicação

O projeto pode ser servido em hospedagem estática compatível com HTML/CSS/JavaScript, como GitHub Pages ou outro serviço de páginas estáticas. Não há etapa de build.

Antes de publicar:

1. Confirme que `index.html`, `html/`, `css/`, `js/`, `imagens/`, `models/`, `notebooks/` e `vendor/` estão no diretório publicado e que a estrutura relativa foi preservada. O 3D usa módulos JavaScript, então abra o site por um servidor (não por `file://`).
2. Ajuste a URL do site e as URLs permitidas do Supabase Auth para o domínio publicado.
3. Verifique os links relativos, pois alguns arquivos HTML apontam para caminhos que não existem na estrutura deste ZIP.
4. Teste as páginas em um navegador com sessão iniciada e encerrada.
5. Teste políticas RLS com usuários comuns e administradores.
6. Decida se o site realmente deve ficar fora de mecanismos de busca. O `robots.txt` atual pede que todo o site seja ignorado por robôs que respeitam essa diretiva; isso **não** bloqueia acesso, não autentica usuários e não protege dados.

## Pontos de atenção identificados

Estes itens foram observados na inspeção dos arquivos e devem ser tratados como pendências de revisão, não como resultado de testes executados contra o banco em produção.

1. **Colunas divergentes no painel administrativo.** O frontend principal usa `usuarios.idUsuario`, `cursos.idCurso`, `matriculas.idMatricula` e relaciona matrículas pelo `idUsuario`/`idCurso`. Já `admin/admin.js` procura `usuarios.id`, `cursos.id`, `matriculas.id` e usa essas colunas nos relacionamentos/atualizações. Também verifica a permissão por `usuarios.id = session.user.id`, enquanto o cadastro não grava explicitamente esse UUID no perfil. Esse conjunto precisa ser unificado conforme o esquema real; caso contrário, o painel poderá falhar ao carregar dados, autorizar o administrador ou atualizar matrículas.
2. **Redirecionamento para login no cabeçalho.** `js/auth.js` contém caminhos relativos que parecem pressupor páginas em pastas diferentes, mas as páginas reais estão em `html/`. Nas páginas internas, clicar em “Entrar” pode resolver para um caminho inexistente, como `html/html/login.html`. Ajuste o caminho com base na localização da página ou centralize a navegação.
3. **Links locais quebrados encontrados.** `html/sobre.html` aponta para `../inscricoes/inscricoes.html`, mas a página existente neste pacote é `html/inscricoes.html`. `html/patrocinadores.html` aponta para `../contato/contato.html`, mas a página existente é `html/contato.html`.
4. **E-mails de contato inconsistentes.** Há páginas que exibem `contato@flashclip.com` e a página de contato exibe `contato.flashclip@gmail.com`. Confirme qual endereço deve ser oficial e padronize os links/textos.
5. **Diretiva de rastreamento bloqueia todo o site.** `robots.txt` usa `Disallow: /`. Isso pode impedir a indexação por mecanismos que respeitam a diretiva, mas não é um mecanismo de segurança nem impede bots maliciosos de fazer requisições.
6. **Valores do evento fixos no código.** Data do evento, período do ciclo, duração padrão e limite de instrutores estão codificados como constantes. Eles precisam ser atualizados manualmente a cada novo ciclo; atualmente, o contador está definido para 5 de dezembro de 2026, às 14h.
7. **Dependência de configuração do banco fora do pacote.** Não há SQL, migrações ou documentação exportada das políticas RLS. Não é possível confirmar apenas pelo ZIP se as tabelas, chaves estrangeiras, valores padrão e políticas do Supabase estão adequados.
8. **Validações importantes somente no cliente.** O bloqueio de tentativas do login é implementado no navegador e pode ser reiniciado ao recarregar a página ou trocar de dispositivo. A checagem de vagas e de matrícula por período no JavaScript também não substitui regras no banco.
9. **Indicador de conexão no dashboard.** O texto “Sistema conectado” está no HTML como status visual fixo; ele não constitui, por si só, uma verificação dinâmica da disponibilidade do Supabase.

## Checklist antes de colocar em produção

- [ ] Corrigir os links internos quebrados e os caminhos de redirecionamento para login.
- [ ] Definir como `usuarios` será associado ao UUID de `auth.users` e garantir que o cadastro crie/recupere esse perfil de forma consistente.
- [ ] Definir o valor padrão e os estados válidos de `matriculas.status`.
- [ ] Revisar e testar RLS para visitante, participante e administrador.
- [ ] Aplicar no banco as regras de matrícula, lotação e permissão administrativa.
- [ ] Testar criação de conta, confirmação de e-mail (se habilitada), login, logout, matrícula, duplicidade, vagas esgotadas e consulta de inscrições.
- [ ] Testar o dashboard com uma conta comum e com uma conta administradora.
- [ ] Padronizar o e-mail de contato e confirmar os dados institucionais.
- [ ] Confirmar se a diretiva `robots.txt` deve continuar impedindo indexação.
- [ ] Atualizar os valores do ciclo/evento antes do próximo uso.
- [ ] Fazer uma revisão final de acessibilidade, responsividade, console do navegador e mensagens de erro.

---

**Resumo:** a base visual e os principais fluxos frontend estão presentes no pacote, incluindo autenticação, listagem dinâmica de cursos, matrícula, consulta de inscrições e uma interface administrativa. Os próximos passos mais importantes são alinhar o esquema de dados usado pelo painel com o restante do código, corrigir os caminhos locais identificados e validar a segurança e as regras de negócio diretamente no Supabase.
