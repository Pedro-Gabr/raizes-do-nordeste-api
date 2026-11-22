const express = require('express');
const auditoriaController = require('../controllers/auditoriaController');
const { verificarToken, permitirPerfis } = require('../middlewares/auth');

const router = express.Router();

router.get('/', verificarToken, permitirPerfis('GERENTE'), auditoriaController.listarLogs);

module.exports = router;
