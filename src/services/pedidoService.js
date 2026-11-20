const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');

const canaisPermitidos = ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'];
const statusPermitidos = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

async function criarPedido({ clienteId, unidadeId, canalPedido, itens, formaPagamento }) {
    if (!canalPedido || !canaisPermitidos.includes(canalPedido)) {
        throw {
            status: 422,
            error: 'CANAL_INVALIDO',
            message: 'Informe um canalPedido válido.',
            details: [{ field: 'canalPedido', issue: `Aceitos: ${canaisPermitidos.join(', ')}` }]
        };
    }

    if (!unidadeId || !Array.isArray(itens) || itens.length === 0) {
        throw {
            status: 422,
            error: 'DADOS_INVALIDOS',
            message: 'Unidade e lista de itens são obrigatórios.',
            details: [{ field: 'itens', issue: 'Envie pelo menos 1 item no pedido' }]
        };
    }

        const repetidos = itens
        .map((item) => item.produtoId)
        .filter((id, i, lista) => lista.indexOf(id) !== i);

    if (repetidos.length > 0) {
        throw {
            status: 422,
            error: 'ITEM_DUPLICADO',
            message: 'O mesmo produto aparece mais de uma vez no pedido.',
            details: [{ field: 'itens', issue: 'Envie um único item por produto, somando as quantidades' }]
        };
    }

    const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
    if (!unidade) {
        throw {
            status: 404,
            error: 'UNIDADE_NAO_ENCONTRADA',
            message: 'Unidade informada não existe.'
        };
    }

    return prisma.$transaction(async (tx) => {
        let total = 0;
        const itensMontados = [];

        for (let i = 0; i < itens.length; i++) {
            const item = itens[i];

            if (!item.produtoId || !item.quantidade || item.quantidade <= 0) {
                throw {
                    status: 422,
                    error: 'ITEM_INVALIDO',
                    message: 'Produto e quantidade maior que zero são obrigatórios.',
                    details: [{ field: `itens[${i}]`, issue: 'Verifique produtoId e quantidade' }]
                };
            }

            const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
            if (!produto || !produto.disponivel) {
                throw {
                    status: 404,
                    error: 'PRODUTO_NAO_ENCONTRADO',
                    message: 'Produto não encontrado ou indisponível no momento.',
                    details: [{ field: `itens[${i}].produtoId`, issue: 'Produto inválido' }]
                };
            }

            const estoqueAtual = await tx.estoque.findUnique({
                where: {
                    unidadeId_produtoId: {
                        unidadeId,
                        produtoId: item.produtoId
                    }
                }
            });

            if (!estoqueAtual || estoqueAtual.quantidade < item.quantidade) {
                throw {
                    status: 409,
                    error: 'ESTOQUE_INSUFICIENTE',
                    message: 'Não há quantidade suficiente para um ou mais itens.',
                    details: [
                        {
                            field: `itens[${i}].quantidade`,
                            issue: `Disponível: ${estoqueAtual ? estoqueAtual.quantidade : 0}`
                        }
                    ]
                };
            }

            total += produto.preco * item.quantidade;
            itensMontados.push({
                estoqueId: estoqueAtual.id,
                produtoId: produto.id,
                quantidade: item.quantidade,
                precoUnitario: produto.preco
            });
        }

        const pedido = await tx.pedido.create({
            data: {
                clienteId,
                unidadeId,
                canalPedido,
                formaPagamento: formaPagamento || 'MOCK',
                status: 'AGUARDANDO_PAGAMENTO',
                total: Number(total.toFixed(2)),
                itens: {
                    create: itensMontados.map((item) => ({
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        precoUnitario: item.precoUnitario
                    }))
                }
            },
            include: { itens: true }
        });

        for (const item of itensMontados) {
            await tx.estoque.update({
                where: { id: item.estoqueId },
                data: { quantidade: { decrement: item.quantidade } }
            });
        }

        await tx.logAuditoria.create({
            data: {
                usuarioId: clienteId,
                acao: 'CRIAR_PEDIDO',
                entidade: 'Pedido',
                entidadeId: pedido.id,
                detalhes: `Canal: ${canalPedido} | Total: ${pedido.total}`
            }
        });

        return pedido;
    });
}

async function listarPedidos({ canalPedido, status, usuario }) {
    if (canalPedido && !canaisPermitidos.includes(canalPedido)) {
        throw {
            status: 422,
            error: 'CANAL_INVALIDO',
            message: 'Filtro canalPedido inválido.',
            details: [{ field: 'canalPedido', issue: `Aceitos: ${canaisPermitidos.join(', ')}` }]
        };
    }

    const filtro = {};
    if (canalPedido) filtro.canalPedido = canalPedido;
    if (status) filtro.status = status;

    if (usuario.role === 'CLIENTE') {
        filtro.clienteId = usuario.id;
    }

    return prisma.pedido.findMany({
        where: filtro,
        include: {
            itens: true,
            pagamento: true
        },
        orderBy: { criadoEm: 'desc' }
    });
}

async function atualizarStatusPedido(id, status, usuarioId) {
    if (!statusPermitidos.includes(status)) {
        throw {
            status: 422,
            error: 'STATUS_INVALIDO',
            message: 'Status informado não é permitido.',
            details: [{ field: 'status', issue: `Aceitos: ${statusPermitidos.join(', ')}` }]
        };
    }

    const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: { itens: true }
    });

    if (!pedido) {
        throw {
            status: 404,
            error: 'PEDIDO_NAO_ENCONTRADO',
            message: 'Pedido não encontrado.'
        };
    }

    const atualizado = await prisma.$transaction(async (tx) => {
        if (status === 'CANCELADO' && pedido.status !== 'CANCELADO') {
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

        return tx.pedido.update({
            where: { id },
            data: { status }
        });
    });

    await registrarLog({
        usuarioId,
        acao: 'ATUALIZAR_STATUS_PEDIDO',
        entidade: 'Pedido',
        entidadeId: id,
        detalhes: `De ${pedido.status} para ${status}`
    });

    return atualizado;
}

module.exports = { criarPedido, listarPedidos, atualizarStatusPedido };