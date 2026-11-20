const jwt = require('jsonwebtoken');
const { enviarErro } = require('../utils/erroPadrao');

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return enviarErro(res, req, 401, 'NAO_AUTENTICADO', 'Token não informado.');
    }

    const token = authHeader.split(' ')[1];

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = dados;
        return next();
    } catch (err) {
        return enviarErro(res, req, 401, 'TOKEN_INVALIDO', 'Token inválido ou expirado.');
    }
}

function permitirPerfis(...perfisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario || !perfisPermitidos.includes(req.usuario.role)) {
            return enviarErro(
                res,
                req,
                403,
                'SEM_PERMISSAO',
                'Seu perfil não tem acesso a este recurso.'
            );
        }
        return next();
    };
}

module.exports = { verificarToken, permitirPerfis };