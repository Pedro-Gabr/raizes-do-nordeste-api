# LGPD na API Raízes do Nordeste

Este documento explica como a API trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018). Ele atende ao requisito RNF03 e aos direitos do titular descritos no RF17 (`docs/requisitos.md`).

> Observação: o projeto é acadêmico. A base legal e os prazos abaixo foram definidos para o estudo de caso, e em uma operação real deveriam ser revisados com um profissional jurídico.

## 1. Dados coletados

A API coleta apenas o que é necessário para o funcionamento do pedido e do programa de fidelidade.

| Dado | Onde fica | Finalidade |
|------|-----------|------------|
| Nome | `Usuario.nome` | Identificar o cliente no pedido e no atendimento |
| E-mail | `Usuario.email` | Login e identificação única da conta |
| Senha | `Usuario.senha` | Autenticação. Nunca é guardada em texto puro, só o hash bcrypt |
| Perfil (CLIENTE, GERENTE, etc.) | `Usuario.role` | Controle de acesso às rotas |
| Consentimento e data | `Usuario.consentimentoLGPD`, `Usuario.consentimentoEm` | Comprovar que o cliente aceitou participar da fidelidade |
| Pedidos, itens, canal, unidade | `Pedido`, `ItemPedido` | Executar o pedido e informar o status |
| Pagamento (valor, status, código da transação simulado) | `Pagamento` | Registrar o resultado do pagamento. Nenhum dado de cartão é recebido ou guardado |
| Pontos e histórico | `Usuario.pontos`, `MovimentoPontos` | Programa de fidelidade |
| Registros de auditoria | `LogAuditoria` | Segurança e rastreabilidade das ações |

Não são coletados CPF, telefone, endereço do cliente nem dados de cartão.

## 2. Finalidade e base legal

| Tratamento | Finalidade | Base legal (art. 7º) |
|------------|-----------|----------------------|
| Cadastro, login e perfil | Permitir acesso à conta | Execução de contrato (inciso V) |
| Pedido e pagamento | Preparar e entregar o pedido | Execução de contrato (inciso V) |
| Pontos de fidelidade | Acumular e resgatar pontos | Consentimento (inciso I) |
| Auditoria | Segurança e prevenção a fraudes | Legítimo interesse (inciso IX) |
| Guarda mínima de pedidos após anonimização | Controle financeiro e prestação de contas | Cumprimento de obrigação legal ou regulatória (inciso II) |

O consentimento é pedido no cadastro pelo campo `consentimentoLGPD`. Só o valor booleano `true` conta como aceite; qualquer outro valor (texto, número) é tratado como não consentido.

## 3. Registro do consentimento

- Ao cadastrar com `consentimentoLGPD: true`, a API salva o aceite e `consentimentoEm` com a data e a hora do aceite.
- O cliente pode consultar o estado atual com `GET /lgpd/consentimento` e alterá-lo com `PATCH /lgpd/consentimento` (`{ "consentimentoLGPD": true | false }`).
- Ao revogar, `consentimentoEm` volta a ficar vazio; ao conceder, recebe a nova data.
- Cada concessão ou revogação gera um registro de auditoria (`CONSENTIMENTO_CONCEDIDO` ou `CONSENTIMENTO_REVOGADO`).
- Sem consentimento, o cliente continua podendo fazer pedidos, mas não acumula nem resgata pontos (erro `CONSENTIMENTO_NECESSARIO`, 403, ao tentar resgatar).

## 4. Direitos do titular

| Direito (art. 18) | Como a API atende |
|-------------------|-------------------|
| Confirmação e acesso | `GET /lgpd/meus-dados` devolve dados da conta, pedidos e movimentos de pontos, sem a senha |
| Revogação do consentimento | `PATCH /lgpd/consentimento` com `consentimentoLGPD: false` |
| Eliminação / anonimização | `POST /lgpd/anonimizar` (veja a seção 6) |
| Informação sobre o tratamento | Este documento |

Todas as rotas `/lgpd` exigem token JWT.

## 5. Segurança

- **Senhas** com hash bcrypt; a senha original nunca aparece em respostas.
- **JWT** com validade de 1 dia. O servidor só inicia se `JWT_SECRET` tiver pelo menos 32 caracteres e não for o texto de exemplo.
- **Controle de acesso por perfil**: o cliente só vê os próprios pedidos e dados; a consulta de auditoria é restrita ao GERENTE.
- **Limite de tentativas**: o login aceita 10 tentativas com senha errada a cada 15 minutos por origem; passando disso, a resposta é 429 `MUITAS_TENTATIVAS`.
- **Minimização**: a API não pede dados que não usa e não recebe dados de cartão.
- **Erros padronizados** que não expõem detalhes internos.

## 6. Anonimização da conta

`POST /lgpd/anonimizar` com `{ "senha": "..." }`, apenas para o perfil CLIENTE.

Regras:
- A senha atual é exigida, para evitar que alguém com um token roubado apague a conta (`SENHA_INCORRETA`, 403).
- Não é possível anonimizar com pedido em andamento (`PEDIDO_EM_ANDAMENTO`, 409).

O que acontece:
- Nome e e-mail são trocados por `anonimizado-<id>@raizes.invalid`.
- A senha é substituída por um hash aleatório, então ninguém consegue mais entrar na conta.
- O consentimento é removido e `anonimizadoEm` recebe a data.
- Tokens emitidos antes da anonimização deixam de valer (`CONTA_ANONIMIZADA`, 401).
- Os pedidos e pagamentos são mantidos, já desvinculados de uma pessoa identificável, para preservar o histórico financeiro da loja.
- A ação é registrada na auditoria (`ANONIMIZAR_CONTA`).

A operação **não pode ser desfeita**.

## 7. Registros de acesso e auditoria

A tabela `LogAuditoria` guarda quem fez o quê e quando. Eventos registrados:

| Ação | Quando |
|------|--------|
| `CADASTRO_USUARIO` | Criação de conta |
| `CONSENTIMENTO_CONCEDIDO` / `CONSENTIMENTO_REVOGADO` | Mudança de consentimento |
| `EXPORTAR_DADOS` | Cliente consultou seus dados |
| `ANONIMIZAR_CONTA` | Conta anonimizada |
| `CRIAR_PEDIDO` / `ATUALIZAR_STATUS_PEDIDO` | Ciclo do pedido, incluindo cancelamentos |
| `PAGAMENTO_APROVADO` / `PAGAMENTO_RECUSADO` | Resultado do pagamento |
| `ENTRADA_ESTOQUE` | Reposição de estoque |

O gerente consulta os registros em `GET /auditoria`, com paginação e filtros por `acao`, `entidade` e `usuarioId`. Os detalhes dos registros não guardam senha, token nem dados de cartão.

## 8. Retenção

| Dado | Prazo definido para o projeto |
|------|-------------------------------|
| Dados da conta | Enquanto a conta existir; removidos (anonimizados) a pedido do titular |
| Pedidos e pagamentos | Mantidos de forma anonimizada para controle financeiro |
| Consentimento | Enquanto for válido; a revogação é registrada na auditoria |
| Logs de auditoria | Mantidos para segurança. Após anonimização, só o identificador interno do usuário permanece, sem nome nem e-mail |

Neste projeto não há rotina automática de exclusão por prazo. A eliminação acontece sob demanda, pela anonimização. Uma rotina agendada seria uma melhoria futura.

## 9. Como demonstrar

Roteiro sugerido (todos os exemplos estão na coleção do Postman em `docs/`):

1. Cadastrar cliente com `consentimentoLGPD: true` e conferir `consentimentoEm` em `GET /lgpd/consentimento`.
2. Revogar o consentimento e tentar resgatar pontos (403 `CONSENTIMENTO_NECESSARIO`).
3. Consultar `GET /lgpd/meus-dados` e verificar que a senha não aparece.
4. Anonimizar a conta com a senha correta e conferir que o login antigo falha.
5. Logar como GERENTE e consultar `GET /auditoria?acao=ANONIMIZAR_CONTA`.
