const pagamentoService = require('../services/pagamentoService');
const { enviarErro } = require('../utils/erroPadrao');

async function processar(req, res) {
    try {
        const pagamento = await pagamentoService.processarPagamentoMock({
            pedidoId: req.body.pedidoId,
            resultado: req.body.resultado,
            usuarioId: req.usuario.id
        });

        return res.status(pagamento.status === 'APROVADO' ? 200 : 422).json({
            msg: pagamento.status === 'APROVADO'
                ? 'Pagamento aprovado e pedido atualizado.'
                : 'Pagamento recusado pelo provedor externo.',
            pagamento
        });
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        console.error('Erro no pagamento:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao processar pagamento.');
    }
}

module.exports = { processar };