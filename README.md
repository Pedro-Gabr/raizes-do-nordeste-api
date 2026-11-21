# API REST - Raízes do Nordeste

Back-end desenvolvido para a disciplina de Projeto Multidisciplinar (Trilha Back-End - UNINTER). 

A API gerencia o fluxo de pedidos multicanal, controle de estoque por unidade, programa de fidelidade com LGPD, autenticação JWT, controle de acesso por perfil e simulação de pagamento (mock).

- **Repositório:** https://github.com/Pedro-Gabr/raizes-do-nordeste-api
- **Documentação Swagger (local):** http://localhost:3000/api-docs
- **Coleção de Testes:** `docs/raizes-do-nordeste.postman_collection.json`

## Requisitos

- Node.js 18 ou superior
- NPM
- SQLite (configurado via Prisma ORM)

## Configuração e Execução

1. **Clonar o repositório e instalar as dependências:**
   ```bash
   git clone https://github.com/Pedro-Gabr/raizes-do-nordeste-api.git
   cd raizes-do-nordeste-api
   npm install