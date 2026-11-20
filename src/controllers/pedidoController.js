const pedidoService = require('../services/pedidoService');
const { enviarErro } = require('../utils/erroPadrao');

async function criar(req, res) {
    try {
        const pedido = await pedidoService.criarPedido({
            clienteId: req.usuario.id,
            unidadeId: req.body.unidadeId,
            canalPedido: req.body.canalPedido,
            itens: req.body.itens,
            formaPagamento: req.body.formaPagamento
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
            usuario: req.usuario
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

module.exports = { criar, listar, atualizarStatus };