const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');

async function processarPagamentoMock({ pedidoId, resultado, usuarioId }) {
    if (!pedidoId || !['APROVADO', 'RECUSADO'].includes(resultado)) {
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

    if (pedido.pagamento) {
        throw {
            status: 409,
            error: 'PAGAMENTO_JA_PROCESSADO',
            message: 'Este pedido já possui um pagamento registrado.'
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
                await tx.usuario.update({
                    where: { id: pedido.clienteId },
                    data: { pontos: { increment: pontosGanhos } }
                });
            }
        } else {
            await tx.pedido.update({
                where: { id: pedido.id },
                data: { status: 'CANCELADO' }
            });

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