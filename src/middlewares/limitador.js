const rateLimit = require('express-rate-limit');
const { enviarErro } = require('../utils/erroPadrao');

// só entram na conta as tentativas com credencial errada (401). Acertar o login, ou errar
// um campo e receber 422/409, não conta, para não barrar quem só está testando a API
const limitadorAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return enviarErro(
            res,
            req,
            429,
            'MUITAS_TENTATIVAS',
            'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
        );
    }
});

module.exports = { limitadorAuth };
