const express = require('express');
const authController = require('../controllers/authController');
const { limitadorAuth } = require('../middlewares/limitador');

const router = express.Router();

router.post('/cadastro', limitadorAuth, authController.cadastro);
router.post('/login', limitadorAuth, authController.login);

module.exports = router;
