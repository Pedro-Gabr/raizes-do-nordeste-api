# API REST - Raízes do Nordeste

Esse projeto foi feito para a disciplina de Projeto Multidisciplinar, da trilha de Back-End da UNINTER.

A ideia é ter uma API para uma rede de lanchonetes que recebe pedidos por vários canais: aplicativo, totem, balcão e site. Ela reúne esses pedidos em um só lugar e ajuda a acompanhar pagamentos, estoque e o andamento do preparo.

Para desenvolver a API, usei Node.js com Express, Prisma e SQLite. O projeto também tem autenticação com JWT, controle de acesso por perfil e uma simulação de pagamento.

**Links do projeto:**

- **Repositório:** https://github.com/Pedro-Gabr/raizes-do-nordeste-api
- **Swagger (com o servidor rodando):** http://localhost:3000/api-docs
- **Coleção Postman:** [raizes-do-nordeste.postman_collection.json](docs/raizes-do-nordeste.postman_collection.json)
- **Documento de requisitos:** [requisitos.md](docs/requisitos.md)

## Tecnologias usadas

- **Node.js e Express:** desenvolvimento da API.
- **Prisma ORM:** acesso ao banco de dados.
- **SQLite:** armazenamento dos dados.
- **JWT:** autenticação.
- **bcryptjs:** proteção das senhas por hash.
- **Swagger:** documentação das rotas.
- **Postman:** testes manuais das requisições.

## Como rodar o projeto

Antes de começar, é necessario ter o Node.js 18 ou superior e o NPM instalados.

### 1. Baixando o projeto

Abra o terminal e rode:

```bash
git clone https://github.com/Pedro-Gabr/raizes-do-nordeste-api.git
cd raizes-do-nordeste-api
npm install
```

### 2. Configurando o `.env`

O projeto usa um arquivo `.env` para guardar as configurações. No PowerShell, dá para criá-lo a partir do exemplo que já está no repositório:

```powershell
Copy-Item .env.example .env
```

O conteúdo deve seguir este formato:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="substitua_por_uma_chave_secreta_forte"
PORT=3000
```

`DATABASE_URL` indica onde fica o banco SQLite. `JWT_SECRET` é usada para gerar e validar os tokens, e `PORT` define a porta em que a API será iniciada.

Troque o valor de `JWT_SECRET` por uma chave forte e mantenha essa informação em segredo. Não envie o `.env` para o GitHub.

### 3. Preparando o banco

Com as dependências instaladas e o `.env` configurado, execute:

```bash
npx prisma migrate deploy
npx prisma generate
```

O primeiro comando aplica as migrations já existentes. O segundo gera o Prisma Client utilizado pelo código.

Para colocar os dados iniciais no banco:

```bash
node seed.js
```

O seed cria usuários de teste, uma unidade, dois produtos e os respectivos estoques. Ele foi pensado para um banco novo: se for executado novamente, pode duplicar a unidade e os produtos.

### 4. Iniciando a API

Para iniciar normalmente:

```bash
npm start
```

Durante o desenvolvimento, também dá para usar:

```bash
npm run dev
```

Esse segundo comando usa o Nodemon, que reinicia o servidor quando você altera algum arquivo.

Com a API rodando, acesse:

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/api-docs

## Usuários de teste

O `seed.js` cria dois usuários para facilitar os testes:

| Perfil | E-mail | Senha |
|---|---|---|
| CLIENTE | `pedro@teste.com` | `123456` |
| GERENTE | `gerente@raizes.com` | `123456` |

Essas credenciais são apenas para testes locais. Não devem ser usadas em produção.

Depois do login, a API devolve um token JWT. Nas rotas protegidas, envie-o no cabeçalho:

```http
Authorization: Bearer SEU_TOKEN
```

## O que a API já faz

Hoje o projeto permite:

- Cadastrar clientes e fazer login.
- Controlar o acesso às rotas de acordo com o perfil.
- Consultar unidades e produtos disponíveis.
- Cadastrar produtos com perfil de gerente.
- Consultar o estoque de uma unidade.
- Criar pedidos com produtos, quantidades, unidade e canal de origem.
- Consultar pedidos e filtrar por canal ou status.
- Atualizar o andamento dos pedidos.
- Simular pagamentos aprovados e recusados.
- Consultar o saldo de pontos de um cliente.

A estrutura do banco também já tem campos para consentimento LGPD, anonimização e histórico de pontos. Algumas dessas funcionalidades ainda estão em desenvolvimento na API.

## Como testar

Os testes manuais estão organizados na [coleção do Postman](docs/raizes-do-nordeste.postman_collection.json).

Para rodar os cenários:

1. Inicie a API e prepare o banco com o seed.
2. Abra o Postman e importe o arquivo JSON da coleção.
3. Configure a URL base como `http://localhost:3000`.
4. Faça os logins para obter os tokens de cliente e gerente.
5. Coloque os tokens nas requisições protegidas.
6. Use os IDs da unidade e dos produtos criados pelo seed.
7. Siga a ordem da coleção, começando pela autenticação.

A coleção tem 15 cenários, incluindo casos de sucesso e situações de erro, como acesso sem token, falta de permissão, canal obrigatório ausente e estoque insuficiente.

O resultado de alguns testes depende do estado do banco. Por exemplo, criar ou cancelar pedidos altera o estoque disponível. Por isso, alguns cenários podem precisar de novos pedidos ou de um banco preparado novamente.

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

## Modelo do banco de dados

O projeto usa SQLite com Prisma ORM. O diagrama entidade-relacionamento (DER) mostra as tabelas, chaves e relacionamentos usados pela API.

O modelo inclui usuários, unidades, produtos, estoque, pedidos, itens dos pedidos, pagamentos, movimentações de pontos e registros de auditoria.

- [Visualizar DER em PDF](docs/DER-raizes-do-nordeste.pdf)
- [Abrir arquivo editável do DER](docs/DER-raizes-do-nordeste.drawio)

As definições do banco ficam em `prisma/schema.prisma`, e as migrations estão em `prisma/migrations`.

## Organização do projeto

```text
raizes-do-nordeste-api/
├── docs/
│   ├── requisitos.md
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

As rotas recebem as requisições, os controllers encaminham as operações e os services concentram as regras de negócio mais específicas, como criação de pedidos e processamento de pagamentos.

Essa separação ajuda na manutenção e evita colocar toda a lógica em um único arquivo.
