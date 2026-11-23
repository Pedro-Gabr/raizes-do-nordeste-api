# API REST - Raízes do Nordeste

Esse projeto foi desenvolvido para a disciplina de Projeto Multidisciplinar, da trilha de Back-End da UNINTER.

A ideia é centralizar os pedidos de uma rede de lanchonetes que vende por vários canais: aplicativo, totem, balcão, retirada e site. Na API, tudo fica num lugar só: pagamentos, estoque, pontos de fidelidade e o andamento do preparo. Também me preocupei em tratar os dados dos clientes de acordo com a LGPD.

Para construir o back-end, usei Node.js com Express, Prisma e SQLite. Também implementei autenticação com JWT, controle de acesso por perfil, simulação de pagamento, logs de auditoria e as rotas de privacidade do titular.

**Links úteis:**

- **Repositório:** https://github.com/Pedro-Gabr/raizes-do-nordeste-api
- **Swagger (com o servidor rodando):** http://localhost:3000/api-docs
- **Coleção Postman:** [raizes-do-nordeste.postman_collection.json](docs/raizes-do-nordeste.postman_collection.json)
- **Requisitos (RF e RNF, com prioridades):** [requisitos.md](docs/requisitos.md)
- **Plano de testes (48 cenários):** [plano-de-testes.md](docs/plano-de-testes.md)
- **LGPD (dados, finalidade, base legal, direitos do titular):** [lgpd.md](docs/lgpd.md)
- **DER (modelo do banco):** [DER em PDF](docs/DER-raizes-do-nordeste.pdf)
- **Arquitetura e diagramas (casos de uso, camadas, classes, sequência):** [arquitetura.md](docs/arquitetura.md)

## Tecnologias usadas

- **Node.js e Express:** desenvolvimento da API.
- **Prisma ORM:** acesso ao banco de dados.
- **SQLite:** armazenamento dos dados.
- **JWT:** autenticação.
- **bcryptjs:** proteção das senhas por hash.
- **express-rate-limit:** bloqueio temporário depois de várias tentativas de login com senha errada.
- **Swagger:** documentação das rotas.
- **Postman:** coleção de testes das requisições.

## Como rodar o projeto

Você vai precisar do Node.js 18 (ou superior) e do NPM instalados na máquina.

### 1. Baixando o projeto

```bash
git clone https://github.com/Pedro-Gabr/raizes-do-nordeste-api.git
cd raizes-do-nordeste-api
npm install
```

### 2. Configurando o `.env`

As variáveis de ambiente ficam em um arquivo `.env` na raiz. No PowerShell, dá para copiar o modelo que já está no repositório:

```powershell
Copy-Item .env.example .env
```

O arquivo tem essa cara:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="gere_uma_chave_aleatoria_e_cole_aqui"
PORT=3000
```

O servidor não sobe se o `JWT_SECRET` estiver vazio, tiver menos de 32 caracteres ou continuar com o texto de exemplo. Para gerar uma chave válida direto pelo terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cole o resultado no `.env` e não suba esse arquivo para o GitHub. Se quiser alterar o limite de tentativas de login com senha errada (o padrão são 10 a cada 15 minutos), basta configurar a variável opcional `AUTH_RATE_LIMIT_MAX`. Só a senha errada entra nessa conta: login correto e erros de validação não contam.

### 3. Preparando o banco

```bash
npx prisma migrate deploy
npx prisma generate
```

O primeiro comando aplica as migrations já existentes. O segundo gera o Prisma Client utilizado pelo código.

Para colocar os dados iniciais no banco:

```bash
node seed.js
```

O seed cria dois usuários de teste, uma unidade, dois produtos e o estoque deles. Rode esse script **apenas uma vez** em um banco limpo; se rodar de novo, ele duplica a unidade e os produtos. Caso precise resetar tudo, apague o arquivo `prisma/dev.db`, rode `npx prisma migrate deploy` e execute o seed outra vez.

### 4. Iniciando a API

```bash
npm start
```

Se estiver mexendo no código, `npm run dev` sobe o servidor com Nodemon para reiniciar sozinho a cada arquivo salvo. Com tudo no ar, a API responde em `http://localhost:3000` e a documentação do Swagger abre em `http://localhost:3000/api-docs`.

## Usuários de teste

O `seed.js` já deixa dois cadastros prontos para uso local:

| Perfil | E-mail | Senha |
|---|---|---|
| CLIENTE | `pedro@teste.com` | `123456` |
| GERENTE | `gerente@raizes.com` | `123456` |

Ao fazer login, a API devolve um `accessToken`. Nas rotas fechadas, mande esse token no header:

```http
Authorization: Bearer SEU_TOKEN
```

## O que a API faz

| Área | Rotas | Quem acessa |
|---|---|---|
| Autenticação | `POST /auth/cadastro`, `POST /auth/login` | Público |
| Loja | `GET /unidades`, `GET /unidades/:id/cardapio`, `GET /produtos` | Público |
| Loja | `POST /produtos`, `POST /estoque` | GERENTE |
| Loja | `GET /estoque/:unidadeId` | Usuário logado |
| Pedidos | `POST /pedidos`, `GET /pedidos`, `PATCH /pedidos/:id/cancelar` | Usuário logado |
| Pedidos | `PATCH /pedidos/:id/status` | GERENTE, ATENDENTE e COZINHA |
| Pagamento | `POST /pagamentos/processar` | Usuário logado |
| Fidelidade | `GET /fidelidade/saldo`, `GET /fidelidade/historico` | Usuário logado |
| Auditoria | `GET /auditoria` | GERENTE |
| LGPD | `GET` e `PATCH /lgpd/consentimento`, `GET /lgpd/meus-dados`, `POST /lgpd/anonimizar` | Usuário logado (anonimizar: CLIENTE) |

### Regras de negócio principais

- **Canais e paginação:** O campo `canalPedido` aceita `APP`, `TOTEM`, `BALCAO`, `PICKUP` e `WEB`, e dá para filtrar a listagem de pedidos por ele. As rotas paginadas recebem `pagina` (padrão 1) e `limite` (padrão 10, teto de 50), e também aceitam `page` e `limit`, devolvendo `dados`, `pagina`, `limite`, `total` e `totalPaginas`.
- **Controle de estoque:** Cada unidade gerencia o próprio estoque. O gerente registra as entradas, a baixa ocorre assim que o pedido é criado e os itens voltam para o saldo se o pedido for cancelado ou o pagamento recusado.
- **Ciclo do pedido:** O fluxo segue a ordem `AGUARDANDO_PAGAMENTO` → `PAGO` → `EM_PREPARO` → `PRONTO` → `ENTREGUE`. O cliente consegue cancelar o pedido enquanto ele não passar de `EM_PREPARO`; depois disso, só a equipe da loja pode cancelar.
- **Pagamento (simulado):** Como não há gateway externo, o resultado (`APROVADO` ou `RECUSADO`) vai direto no corpo da requisição. Se aprovar, o status muda para `PAGO`; se recusar, o pedido é cancelado automaticamente.
- **Programa de fidelidade:** O cliente ganha 1 ponto a cada R$ 1,00 pago, mas só se tiver dado consentimento para isso. Na hora de usar, 10 pontos dão R$ 1,00 de desconto (até 50% do subtotal), também exigindo consentimento ativo. Caso o pedido seja cancelado ou o pagamento recusado, os pontos resgatados voltam para a conta e os pontos gerados naquela compra são estornados.

## LGPD e segurança

O detalhamento completo está em [docs/lgpd.md](docs/lgpd.md). Aqui vai o resumo. A API só guarda o que precisa para funcionar: nome, e-mail, o hash da senha, perfil, pedidos, pagamentos simulados e saldo de pontos. Ela não pede CPF, endereço residencial nem dados de cartão.

Cadastro, pedidos e pagamentos têm como base legal a execução de contrato. Os registros da tabela `LogAuditoria`, que o gerente consulta em `GET /auditoria`, se apoiam no legítimo interesse. Já os pontos de fidelidade dependem de consentimento (`consentimentoLGPD`), que é gravado com a data (`consentimentoEm`) e pode ser revogado quando o cliente quiser, em `/lgpd/consentimento`.

Sobre os direitos do titular: o cliente pode exportar os próprios dados (sem a senha) em `/lgpd/meus-dados` e pedir a anonimização da conta em `/lgpd/anonimizar`. Para anonimizar, é preciso informar a senha atual, e não tem como desfazer. Nome e e-mail são trocados, o token antigo deixa de valer na hora e os pedidos continuam no banco, só que sem ligação com a pessoa.

## Como testar

A [coleção do Postman](docs/raizes-do-nordeste.postman_collection.json) tem 52 requisições em 9 pastas. Cada uma já confere o status HTTP e, nos erros, o formato padronizado da resposta.

1. Suba a API e rode o seed uma única vez.
2. Importe o arquivo JSON da coleção no Postman e confira se a variável `baseUrl` aponta para `http://localhost:3000`.
3. Abra o **Collection Runner**, selecione a coleção e clique em **Run** mantendo a ordem original das pastas.

A pasta 0 faz o login e guarda os tokens e os IDs sozinha, então não precisa copiar nada na mão. Cada execução cadastra um cliente novo e anonimiza essa conta no final, por isso dá para rodar várias vezes seguidas sem limpar o banco. No fim, as 90 verificações devem passar.

### Plano de testes

O [plano de testes](docs/plano-de-testes.md) tem 48 cenários (30 positivos e 18 negativos). Cada um informa o endpoint, a pré-condição, a entrada, o resultado esperado e a requisição da coleção que serve de evidência. Os positivos usam o prefixo T e os negativos o prefixo N. A pasta 0 da coleção só prepara os tokens e os IDs.

Para testar o bloqueio por excesso de tentativas (`429 MUITAS_TENTATIVAS`), coloque `AUTH_RATE_LIMIT_MAX=3` no `.env`, reinicie a API e erre a senha no login 4 vezes seguidas (só tentativas com senha errada contam). Deixei esse teste fora da coleção porque ele bloquearia o login dos cenários seguintes. Depois de testar, lembre de tirar a variável do `.env`. Os prints dos testes no Thunder Client e no Postman estão no documento de evidências que entreguei junto com o trabalho.

## Padrão de erros

Quando algo dá errado, a API responde com um JSON padronizado. Exemplo de uma requisição sem token:

```json
{
  "error": "NAO_AUTENTICADO",
  "message": "Token não informado.",
  "details": [],
  "timestamp": "2026-11-21T12:00:00.000Z",
  "path": "/pedidos"
}
```

O campo `error` identifica o problema, `message` explica o que aconteceu, `details` traz informações adicionais quando necessário, `timestamp` mostra o momento da resposta e `path` indica a rota acessada. A data do exemplo é ilustrativa.

Os códigos HTTP retornados são `400` (JSON malformado), `401` (não autenticado ou token inválido), `403` (sem permissão ou senha errada na anonimização), `404` (recurso ou rota inexistente), `409` (conflito de regra, como e-mail já cadastrado ou falta de estoque), `422` (erro de validação), `429` (limite de tentativas excedido) e `500` (erro interno).

## Modelo do banco de dados

O esquema está em `prisma/schema.prisma` e as migrations ficam em `prisma/migrations`. O modelo cobre usuários, unidades, produtos, estoque, pedidos, itens do pedido, pagamentos, movimentações de pontos e logs de auditoria.

- [Visualizar DER em PDF](docs/DER-raizes-do-nordeste.pdf)
- [Abrir arquivo editável do DER](docs/DER-raizes-do-nordeste.drawio)

## Organização do projeto

```text
raizes-do-nordeste-api/
├── docs/
│   ├── requisitos.md
│   ├── arquitetura.md
│   ├── diagramas/
│   ├── plano-de-testes.md
│   ├── lgpd.md
│   ├── DER-raizes-do-nordeste.pdf
│   ├── DER-raizes-do-nordeste.drawio
│   └── raizes-do-nordeste.postman_collection.json
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── app.js
├── .env.example
├── package.json
├── seed.js
├── server.js
└── README.md
```

As rotas recebem as requisições, os controllers fazem a ponte de entrada e saída e os services concentram as regras de negócio (criação de pedidos, pagamento, fidelidade e LGPD).

## Limitações conhecidas

- O pagamento é simulado e não conversa com nenhum provedor real.
- Não escrevi testes automatizados em código (Jest/Vitest); toda a validação está na coleção do Postman e nos testes manuais.
- Não existe rotina agendada para expirar dados antigos automaticamente; a exclusão ocorre apenas sob demanda, quando o cliente aciona a anonimização.
- Não dá para desativar um produto pela API: só cadastrar e consultar.
- O gerente enxerga os pedidos e a auditoria de todas as unidades, porque o banco não liga o usuário a uma unidade específica.
- Os valores em dinheiro são guardados como decimal (`Float`) e arredondados em 2 casas. Num sistema real, o melhor seria guardar em centavos.
- Não há trava para duas requisições simultâneas sobre o mesmo pedido, como cancelar ou pagar duas vezes no mesmo instante. No uso normal isso não acontece.
- O limite de tentativas do login fica na memória do servidor: zera quando ele reinicia e não é compartilhado entre várias instâncias.
