const express = require('express');
const lojaController = require('../controllers/lojaController');
const { verificarToken, permitirPerfis } = require('../middlewares/auth');

const router = express.Router();

router.get('/unidades', lojaController.listarUnidades);
router.get('/produtos', lojaController.listarProdutos);
router.post('/produtos', verificarToken, permitirPerfis('GERENTE'), lojaController.criarProduto);
router.get('/estoque/:unidadeId', verificarToken, lojaController.consultarEstoque);
router.get('/fidelidade/saldo', verificarToken, lojaController.saldoFidelidade);

module.exports = router;