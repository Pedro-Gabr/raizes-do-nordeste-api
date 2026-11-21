# Requisitos da API

**Projeto:** API REST da rede **Raízes do Nordeste** (Projeto Multidisciplinar — Trilha Back-End, UNINTER).

A rede Raízes do Nordeste está crescendo e os pedidos podem chegar por diferentes canais: aplicativo, totem, balcão, retirada ou site. Mesmo vindo de lugares diferentes, todos precisam seguir as mesmas regras. A API será responsável por organizar os pedidos, controlar o estoque de cada unidade, registrar os pagamentos e cuidar do programa de fidelidade.

Este documento reúne os requisitos e as regras que o back-end precisa seguir. O foco está no funcionamento do sistema, nos dados, nas integrações e na segurança. A construção das telas do aplicativo, do totem e do site não faz parte desta etapa.

## 1. Perfis de usuário

Cada tipo de usuário terá acesso apenas às funções necessárias para realizar suas atividades.

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| CLIENTE | Pessoa que faz pedidos na rede | Criar uma conta, consultar o cardápio, fazer e cancelar os próprios pedidos, realizar pagamentos, consultar o saldo e resgatar pontos |
| ATENDENTE | Funcionário que trabalha no balcão ou acompanha os pedidos do totem | Consultar pedidos e atualizar seus status durante a operação |
| COZINHA | Funcionário responsável pela produção dos pedidos | Atualizar o andamento dos pedidos, indicando quando estão em preparo ou prontos |
| GERENTE | Responsável por uma unidade da rede | Acessar as funções da equipe, cadastrar produtos, registrar entradas de estoque e consultar os registros de auditoria |

## 2. Requisitos funcionais (RF)

Os requisitos funcionais descrevem o que a API precisa fazer. Para organizar o desenvolvimento, cada um recebeu uma prioridade:

- **Essencial:** necessário para que o fluxo principal do sistema funcione, desde a criação do pedido até o pagamento e a atualização do status.
- **Importante:** faz parte do funcionamento esperado da rede e do estudo de caso, mas não impede que o fluxo principal seja executado.
- **Desejável:** acrescenta recursos ao sistema e pode ser implementado depois das funcionalidades mais importantes.

| ID | Requisito | Prioridade | Motivo |
|---|---|---|---|
| RF01 | Permitir o cadastro de usuários como CLIENTE, registrando o consentimento relacionado à LGPD | Essencial | O cliente precisa ter uma conta para fazer pedidos e participar do programa de fidelidade |
| RF02 | Permitir o login com e-mail e senha e retornar um token JWT | Essencial | O token será usado para identificar o usuário nas rotas protegidas |
| RF03 | Controlar o acesso de acordo com o perfil do usuário (CLIENTE, ATENDENTE, COZINHA ou GERENTE) | Essencial | Cada perfil deve ter acesso somente às operações que fazem parte de suas responsabilidades |
| RF04 | Listar as unidades da rede | Importante | Todo pedido precisa estar associado a uma unidade |
| RF05 | Consultar o cardápio de uma unidade, com paginação | Importante | Os produtos disponíveis podem variar de acordo com o estoque de cada unidade |
| RF06 | Permitir que o gerente cadastre, consulte e desative produtos | Importante | O cardápio precisa ser atualizado sem que seja necessário alterar os dados diretamente no banco |
| RF07 | Criar pedidos com seus itens, canal de origem (`canalPedido`) e unidade responsável | Essencial | Essa é uma das operações centrais da API |
| RF08 | Conferir os produtos, as quantidades e a disponibilidade em estoque ao receber um pedido | Essencial | A validação evita que a unidade aceite pedidos que não consegue atender |
| RF09 | Consultar pedidos com paginação e filtros por canal e status | Essencial | A equipe precisa acompanhar os pedidos e identificar por onde cada um foi feito |
| RF10 | Atualizar o status dos pedidos (pago, em preparo, pronto e entregue) | Essencial | A cozinha e o atendimento precisam acompanhar cada etapa do pedido |
| RF11 | Permitir o cancelamento de pedidos: o cliente cancela os próprios pedidos e a equipe pode cancelar qualquer pedido | Importante | O cancelamento faz parte do estudo de caso e exige que o estoque seja ajustado novamente |
| RF12 | Controlar o estoque por unidade, com baixa na venda, devolução em caso de cancelamento e entrada registrada pelo gerente | Essencial | O controle precisa refletir o estoque real para evitar a venda de produtos indisponíveis |
| RF13 | Simular o pagamento por meio de um serviço externo (mock) e registrar o resultado da tentativa | Essencial | Assim é possível testar o fluxo de pedido e pagamento sem depender de um provedor real |
| RF14 | Oferecer um programa de fidelidade com acúmulo de pontos por compras pagas, consulta de saldo e histórico, desde que o cliente tenha dado consentimento | Importante | A fidelidade é uma das partes principais do estudo de caso |
| RF15 | Permitir o resgate de pontos como desconto em um pedido | Importante | O estudo de caso prevê uma forma simples de utilizar os pontos acumulados |
| RF16 | Permitir que o gerente consulte os registros de auditoria | Importante | A consulta permite verificar se as ações importantes do sistema estão sendo registradas |
| RF17 | Disponibilizar ao titular os recursos relacionados à LGPD: consultar e revogar o consentimento, exportar os dados e anonimizar a conta | Importante | O back-end precisa demonstrar como o sistema atende aos direitos do titular previstos no estudo de caso |
| RF18 | Documentar a regra de funcionamento de promoções e campanhas (ver seção 4) | Desejável | O estudo de caso permite que essa regra seja descrita na documentação |

## 3. Regras de negócio (RN)

As regras de negócio definem como a API deve se comportar em situações específicas. Elas precisam ser respeitadas independentemente do canal usado para fazer o pedido.

- **RN01 — Canal obrigatório.** Todo pedido precisa informar o campo `canalPedido`, que aceita os valores APP, TOTEM, BALCAO, PICKUP ou WEB. Se o campo não for enviado ou tiver um valor diferente desses, a API deve responder com o código 422. No banco de dados, o canal será armazenado como texto, e a validação ficará por conta da aplicação.
- **RN02 — Estoque por unidade.** A quantidade de cada produto é controlada separadamente em cada unidade. Um pedido só pode ser aceito quando todos os produtos solicitados tiverem estoque disponível na unidade escolhida. Caso algum item não tenha saldo suficiente, a API deve responder com o código 409.
- **RN03 — Baixa e devolução de estoque.** Quando um pedido é criado, as quantidades solicitadas são retiradas do estoque. Se o pedido for cancelado ou o pagamento for recusado, essas quantidades devem voltar ao estoque. A devolução só pode acontecer uma vez para cada pedido.
- **RN04 — Um item por produto.** Um mesmo produto não pode aparecer em mais de uma linha na lista de itens do pedido. A quantidade informada também precisa ser um número inteiro maior que zero.
- **RN05 — Preço registrado no momento da compra.** Ao criar o pedido, a API deve copiar o preço atual do produto para o item. Dessa forma, uma alteração futura no preço do cadastro não modifica o valor de pedidos que já foram feitos.
- **RN06 — Status do pedido.** Os status permitidos seguem esta ordem: AGUARDANDO_PAGAMENTO, PAGO, EM_PREPARO, PRONTO e ENTREGUE. O pedido pode ser cancelado até chegar ao status PRONTO. Depois de ENTREGUE ou CANCELADO, não pode mais ter seu status alterado. O status PAGO só pode ser definido após a confirmação do pagamento.
- **RN07 — Pagamento.** Apenas pedidos com status AGUARDANDO_PAGAMENTO podem ser pagos, e cada pedido pode receber somente um pagamento. O cliente só pode pagar os próprios pedidos. Quando o pagamento for recusado, o pedido deve ser cancelado e o estoque devolvido.
- **RN08 — Acúmulo de pontos.** A cada R$ 1,00 pago, o cliente recebe 1 ponto, desde que tenha dado consentimento para participar do programa de fidelidade. Se um pedido pago for cancelado, os pontos que ele gerou devem ser estornados.
- **RN09 — Resgate de pontos.** Cada 10 pontos dão direito a R$ 1,00 de desconto. O desconto obtido com pontos não pode ultrapassar 50% do valor total do pedido, e o resgate também depende do consentimento do cliente. Caso o pedido seja cancelado, os pontos utilizados devem voltar para o saldo.
- **RN10 — Dados do titular.** Quando o cliente solicitar a exclusão da conta, os pedidos já realizados não serão apagados. Em vez disso, a conta será anonimizada: nome e e-mail serão substituídos, e o acesso será bloqueado. Os pedidos serão mantidos para que a operação da rede continue tendo os registros necessários.

## 4. Promoções e campanhas

Nesta versão, as campanhas não terão uma tela ou uma tabela específica no sistema. Ainda assim, a regra de aplicação dos descontos fica definida para orientar o funcionamento da API.

1. Cada campanha terá um nome, os produtos ou as unidades participantes, o período de validade e o percentual de desconto.
2. Durante a criação do pedido, a API verifica se existe uma campanha válida para o produto e a unidade. Se houver, aplica o desconto ao preço unitário do item.
3. O preço com desconto fica gravado no item do pedido. Como previsto na RN05, esse valor não muda caso a campanha termine ou o preço do produto seja alterado depois.
4. O desconto da campanha pode ser combinado com o desconto obtido pelo resgate de pontos (RN09). Mesmo assim, a soma dos descontos não pode ultrapassar 50% do valor original do pedido.
5. Exemplo: a campanha **“Quarta do Cuscuz”** oferece 20% de desconto no Cuscuz Recheado, todas as quartas-feiras, em todas as unidades.

## 5. Requisitos não funcionais (RNF)

Os requisitos não funcionais tratam de características que a API precisa manter, como segurança, desempenho, disponibilidade e padronização das respostas.

| ID | Requisito | Prioridade | Como será atendido |
|---|---|---|---|
| RNF01 | Armazenar senhas usando hash | Essencial | Utilizar bcrypt. A senha original nunca deve ser retornada nas respostas da API |
| RNF02 | Autenticar usuários por token e controlar o acesso às rotas | Essencial | Utilizar JWT com validade de 1 dia e verificar o perfil necessário em cada rota protegida |
| RNF03 | Atender aos princípios da LGPD, informando a finalidade e a base legal da coleta, coletando apenas os dados necessários e registrando o consentimento com a data | Essencial | Documentar essas práticas em `docs/lgpd.md` e manter os campos de consentimento no cadastro do usuário |
| RNF04 | Registrar ações importantes para auditoria | Importante | Usar a tabela `LogAuditoria` para registrar eventos relacionados a pedidos, mudanças de status e pagamentos. O gerente poderá consultar esses registros |
| RNF05 | Manter um desempenho adequado nos horários de maior movimento | Importante | Utilizar paginação nas listagens e índices nas consultas de pedidos |
| RNF06 | Permitir que a API continue disponível mesmo com mais de uma instância em execução | Desejável | Manter a API sem estado próprio de sessão. A identidade do usuário fica no token, permitindo executar mais de uma instância |
| RNF07 | Lidar com falhas na integração de pagamento | Desejável | Se o serviço de pagamento falhar, o pedido continua aguardando pagamento e o cliente pode tentar novamente |
| RNF08 | Retornar erros em um formato padronizado | Essencial | Todas as respostas de erro devem usar o mesmo JSON, com os campos `error`, `message`, `details`, `timestamp` e `path` |
| RNF09 | Disponibilizar a documentação da API | Essencial | Publicar a documentação Swagger/OpenAPI no endereço `/api-docs` |
| RNF10 | Permitir identificar a origem de cada pedido | Essencial | Salvar o canal de origem no pedido e disponibilizar esse campo como filtro nas consultas |

## 6. Justificativa da priorização

A prioridade foi definida pensando primeiro no fluxo que precisa funcionar de ponta a ponta: criar um pedido, verificar se há estoque, registrar o pagamento e acompanhar a mudança de status. Por isso, essas operações (RF07, RF08, RF10, RF12 e RF13) foram classificadas como essenciais. O mesmo vale para o cadastro, o login e o controle de acesso (RF01 a RF03), além dos requisitos de segurança e padronização ligados a esse fluxo (RNF01, RNF02 e RNF08).

As funções de fidelidade, cancelamento, auditoria e atendimento aos direitos do titular também fazem parte do estudo de caso, mas o fluxo básico de pedido e pagamento consegue funcionar sem elas. Por esse motivo, ficaram como importantes. Já as promoções foram mantidas como uma regra documentada nesta versão, sem a implementação de telas ou estruturas próprias.

## 7. Fora do escopo

Os itens abaixo não serão implementados nesta etapa do projeto:

- Integração com um serviço de pagamento real. O pagamento será simulado (mock).
- Desenvolvimento das telas do aplicativo, do totem e do site. O trabalho está concentrado no back-end.
- Renovação de token (refresh token) e funcionalidade de logout.
- Controle de entrega dos pedidos e cálculo de frete.
