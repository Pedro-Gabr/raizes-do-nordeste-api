const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const { verificarToken, permitirPerfis } = require('../middlewares/auth');

const router = express.Router();

router.post('/', verificarToken, pedidoController.criar);
router.get('/', verificarToken, pedidoController.listar);
router.patch('/:id/cancelar', verificarToken, pedidoController.cancelar);
router.patch(
    '/:id/status',
    verificarToken,
    permitirPerfis('ATENDENTE', 'COZINHA', 'GERENTE'),
    pedidoController.atualizarStatus
);

module.exports = router;