const prisma = require('../config/prisma');

async function registrarLog({ usuarioId, acao, entidade, entidadeId, detalhes }) {
    await prisma.logAuditoria.create({
        data: {
            usuarioId: usuarioId || null,
            acao,
            entidade,
            entidadeId,
            detalhes: detalhes || null
        }
    });
}

module.exports = { registrarLog };
