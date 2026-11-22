const pedidoService = require('../services/pedidoService');
const { enviarErro } = require('../utils/erroPadrao');
const { lerPaginacao } = require('../utils/paginacao');

async function criar(req, res) {
    try {
        const pedido = await pedidoService.criarPedido({
            clienteId: req.usuario.id,
            unidadeId: req.body.unidadeId,
            canalPedido: req.body.canalPedido,
            itens: req.body.itens,
            formaPagamento: req.body.formaPagamento,
            pontosResgatar: req.body.pontosResgatar
        });

        return res.status(201).json({
            msg: 'Pedido feito com sucesso!',
            pedido
        });
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        console.error('Erro ao criar pedido:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao criar pedido.');
    }
}

async function listar(req, res) {
    try {
        const { canalPedido, status } = req.query;
        const pedidos = await pedidoService.listarPedidos({
            canalPedido,
            status,
            usuario: req.usuario,
            paginacao: lerPaginacao(req.query)
        });
        return res.json(pedidos);
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao listar pedidos.');
    }
}

async function atualizarStatus(req, res) {
    try {
        const pedido = await pedidoService.atualizarStatusPedido(
            req.params.id,
            req.body.status,
            req.usuario.id
        );
        return res.json(pedido);
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao atualizar status.');
    }
}

async function cancelar(req, res) {
    try {
        const pedido = await pedidoService.cancelarPedido(
            req.params.id,
            req.usuario.id,
            req.usuario.role
        );
        return res.json({ msg: 'Pedido cancelado.', pedido });
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao cancelar pedido.');
    }
}

module.exports = { criar, listar, atualizarStatus, cancelar };