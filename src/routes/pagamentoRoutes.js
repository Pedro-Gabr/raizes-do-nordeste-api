const express = require('express');
const pagamentoController = require('../controllers/pagamentoController');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.post('/processar', verificarToken, pagamentoController.processar);

module.exports = router;    