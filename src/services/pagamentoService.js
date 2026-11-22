const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');
const { registrarMovimento, estornarPontosDoPedido } = require('./fidelidadeService');

async function processarPagamentoMock({ pedidoId, resultado, usuarioId, perfil }) {
    if (!pedidoId || typeof pedidoId !== 'string' || !['APROVADO', 'RECUSADO'].includes(resultado)) {
        throw {
            status: 422,
            error: 'DADOS_PAGAMENTO_INVALIDOS',
            message: 'Informe pedidoId e resultado (APROVADO ou RECUSADO).',
            details: [{ field: 'resultado', issue: 'Use APROVADO ou RECUSADO' }]
        };
    }

    const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: true, cliente: true, pagamento: true }
    });

    if (!pedido) {
        throw {
            status: 404,
            error: 'PEDIDO_NAO_ENCONTRADO',
            message: 'Pedido não encontrado.'
        };
    }

    if (perfil === 'CLIENTE' && pedido.clienteId !== usuarioId) {
        throw {
            status: 403,
            error: 'SEM_PERMISSAO',
            message: 'Você só pode pagar os seus próprios pedidos.'
        };
    }

    if (pedido.pagamento) {
        throw {
            status: 409,
            error: 'PAGAMENTO_JA_PROCESSADO',
            message: 'Este pedido já possui um pagamento registrado.'
        };
    }

    if (pedido.status !== 'AGUARDANDO_PAGAMENTO') {
        throw {
            status: 409,
            error: 'PEDIDO_NAO_PAGAVEL',
            message: 'Este pedido não está aguardando pagamento.',
            details: [{ field: 'pedidoId', issue: `Status atual: ${pedido.status}` }]
        };
    }

    const pagamentoSalvo = await prisma.$transaction(async (tx) => {
        const transacaoId = `MOCK-${Date.now()}`;

        const pagamento = await tx.pagamento.create({
            data: {
                pedidoId: pedido.id,
                status: resultado,
                transacaoId,
                valor: pedido.total
            }
        });

        if (resultado === 'APROVADO') {
            await tx.pedido.update({
                where: { id: pedido.id },
                data: { status: 'PAGO' }
            });

            if (pedido.cliente.consentimentoLGPD) {
                const pontosGanhos = Math.floor(pedido.total);
                if (pontosGanhos > 0) {
                    await registrarMovimento(tx, {
                        usuarioId: pedido.clienteId,
                        pedidoId: pedido.id,
                        tipo: 'ACUMULO',
                        pontos: pontosGanhos
                    });
                }
            }
        } else {
            await tx.pedido.update({
                where: { id: pedido.id },
                data: { status: 'CANCELADO' }
            });

            await estornarPontosDoPedido(tx, { pedidoId: pedido.id, usuarioId: pedido.clienteId });

            for (const item of pedido.itens) {
                await tx.estoque.update({
                    where: {
                        unidadeId_produtoId: {
                            unidadeId: pedido.unidadeId,
                            produtoId: item.produtoId
                        }
                    },
                    data: { quantidade: { increment: item.quantidade } }
                });
            }
        }

        return pagamento;
    });

    await registrarLog({
        usuarioId,
        acao: `PAGAMENTO_${resultado}`,
        entidade: 'Pagamento',
        entidadeId: pagamentoSalvo.id,
        detalhes: `Pedido: ${pedido.id} | Valor: ${pedido.total}`
    });

    return pagamentoSalvo;
}

module.exports = { processarPagamentoMock };