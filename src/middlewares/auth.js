const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { enviarErro } = require('../utils/erroPadrao');

async function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return enviarErro(res, req, 401, 'NAO_AUTENTICADO', 'Token não informado.');
    }

    const token = authHeader.split(' ')[1];

    let dados;
    try {
        dados = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return enviarErro(res, req, 401, 'TOKEN_INVALIDO', 'Token inválido ou expirado.');
    }

    try {
        // token emitido antes da anonimização continua assinado, então a conta é conferida no banco
        const conta = await prisma.usuario.findUnique({
            where: { id: dados.id },
            select: { anonimizadoEm: true }
        });
        if (conta && conta.anonimizadoEm) {
            return enviarErro(res, req, 401, 'CONTA_ANONIMIZADA', 'Esta conta foi anonimizada e não pode mais ser usada.');
        }
    } catch (err) {
        console.error('Erro ao conferir a conta do token:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao validar o acesso.');
    }

    req.usuario = dados;
    return next();
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