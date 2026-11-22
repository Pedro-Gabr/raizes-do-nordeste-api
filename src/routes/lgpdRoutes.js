const express = require('express');
const lgpdController = require('../controllers/lgpdController');
const { verificarToken, permitirPerfis } = require('../middlewares/auth');

const router = express.Router();

router.get('/consentimento', verificarToken, lgpdController.consultarConsentimento);
router.patch('/consentimento', verificarToken, lgpdController.alterarConsentimento);
router.get('/meus-dados', verificarToken, lgpdController.exportarDados);
router.post('/anonimizar', verificarToken, permitirPerfis('CLIENTE'), lgpdController.anonimizarConta);

module.exports = router;
