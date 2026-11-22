const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');

async function registrarEntrada({ unidadeId, produtoId, quantidade, usuarioId }) {
    const faltando = [];
    if (typeof unidadeId !== 'string' || !unidadeId) {
        faltando.push({ field: 'unidadeId', issue: 'Campo obrigatório' });
    }
    if (typeof produtoId !== 'string' || !produtoId) {
        faltando.push({ field: 'produtoId', issue: 'Campo obrigatório' });
    }

    if (faltando.length > 0) {
        throw {
            status: 422,
            error: 'CAMPOS_OBRIGATORIOS',
            message: 'Informe a unidade e o produto da entrada de estoque.',
            details: faltando
        };
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        throw {
            status: 422,
            error: 'QUANTIDADE_INVALIDA',
            message: 'A quantidade da entrada precisa ser um número inteiro maior que zero.',
            details: [{ field: 'quantidade', issue: 'Use um número inteiro maior que zero' }]
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

    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) {
        throw {
            status: 404,
            error: 'PRODUTO_NAO_ENCONTRADO',
            message: 'Produto não encontrado.'
        };
    }

    // se a unidade ainda não tinha esse produto, o estoque é criado já com a quantidade da entrada
    const estoque = await prisma.estoque.upsert({
        where: { unidadeId_produtoId: { unidadeId, produtoId } },
        update: { quantidade: { increment: quantidade } },
        create: { unidadeId, produtoId, quantidade }
    });

    await registrarLog({
        usuarioId,
        acao: 'ENTRADA_ESTOQUE',
        entidade: 'Estoque',
        entidadeId: estoque.id,
        detalhes: `Entrada de ${quantidade} un. de ${produto.nome}. Saldo atual: ${estoque.quantidade}`
    });

    return estoque;
}

module.exports = { registrarEntrada };
