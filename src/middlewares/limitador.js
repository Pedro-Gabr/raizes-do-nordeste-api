const rateLimit = require('express-rate-limit');
const { enviarErro } = require('../utils/erroPadrao');

// só as tentativas que falham entram na conta, então quem acerta o login não é barrado
const limitadorAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    skipSuccessfulRequests: true,
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
