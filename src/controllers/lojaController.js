const prisma = require('../config/prisma');
const estoqueService = require('../services/estoqueService');
const { enviarErro } = require('../utils/erroPadrao');
const { lerPaginacao, montarPagina } = require('../utils/paginacao');

async function listarUnidades(req, res) {
    try {
        const unidades = await prisma.unidade.findMany();
        return res.json(unidades);
    } catch (err) {
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao listar unidades.');
    }
}

async function listarProdutos(req, res) {
    try {
        const paginacao = lerPaginacao(req.query);
        const where = { disponivel: true };

        const [total, produtos] = await Promise.all([
            prisma.produto.count({ where }),
            prisma.produto.findMany({
                where,
                orderBy: { nome: 'asc' },
                skip: paginacao.skip,
                take: paginacao.limite
            })
        ]);

        return res.json(montarPagina(produtos, total, paginacao));
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao listar produtos.');
    }
}

async function criarProduto(req, res) {
    const { nome, preco, descricao } = req.body;

    if (!nome || typeof preco !== 'number' || preco <= 0) {
        return enviarErro(res, req, 422, 'DADOS_INVALIDOS', 'Nome e preço positivo são obrigatórios.');
    }

    try {
        const produto = await prisma.produto.create({
            data: { nome, preco, descricao: descricao || null, disponivel: true }
        });
        return res.status(201).json(produto);
    } catch (err) {
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao cadastrar produto.');
    }
}

async function consultarEstoque(req, res) {
    const { unidadeId } = req.params;

    try {
        const estoque = await prisma.estoque.findMany({
            where: { unidadeId },
            include: { produto: true }
        });
        return res.json(estoque);
    } catch (err) {
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao consultar estoque.');
    }
}

async function consultarCardapio(req, res) {
    try {
        const cardapio = await estoqueService.listarCardapio(req.params.id, lerPaginacao(req.query));
        return res.json(cardapio);
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        console.error('Erro ao consultar cardápio:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao consultar cardápio.');
    }
}

async function registrarEntradaEstoque(req, res) {
    const { unidadeId, produtoId, quantidade } = req.body || {};

    try {
        const estoque = await estoqueService.registrarEntrada({
            unidadeId,
            produtoId,
            quantidade,
            usuarioId: req.usuario.id
        });

        return res.status(201).json({
            msg: 'Entrada de estoque registrada.',
            estoque
        });
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        console.error('Erro na entrada de estoque:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao registrar entrada de estoque.');
    }
}

async function saldoFidelidade(req, res) {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario.id },
            select: { id: true, nome: true, pontos: true, consentimentoLGPD: true }
        });
        return res.json(usuario);
    } catch (err) {
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao consultar pontos.');
    }
}

module.exports = {
    listarUnidades,
    listarProdutos,
    criarProduto,
    consultarEstoque,
    consultarCardapio,
    registrarEntradaEstoque,
    saldoFidelidade
};