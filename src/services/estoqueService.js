const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');
const { montarPagina } = require('../utils/paginacao');

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

async function listarCardapio(unidadeId, paginacao) {
    const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
    if (!unidade) {
        throw {
            status: 404,
            error: 'UNIDADE_NAO_ENCONTRADA',
            message: 'Unidade informada não existe.'
        };
    }

    // só entra no cardápio o que está ativo e tem saldo nessa unidade
    const where = {
        unidadeId,
        quantidade: { gt: 0 },
        produto: { disponivel: true }
    };

    const [total, estoques] = await Promise.all([
        prisma.estoque.count({ where }),
        prisma.estoque.findMany({
            where,
            include: { produto: true },
            orderBy: { produto: { nome: 'asc' } },
            skip: paginacao.skip,
            take: paginacao.limite
        })
    ]);

    const itens = estoques.map((item) => ({
        id: item.produto.id,
        nome: item.produto.nome,
        preco: item.produto.preco,
        descricao: item.produto.descricao
    }));

    return montarPagina(itens, total, paginacao);
}

module.exports = { registrarEntrada, listarCardapio };
