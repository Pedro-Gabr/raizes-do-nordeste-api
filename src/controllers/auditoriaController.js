const prisma = require('../config/prisma');
const { enviarErro } = require('../utils/erroPadrao');
const { lerPaginacao, montarPagina } = require('../utils/paginacao');

const filtrosPermitidos = ['acao', 'entidade', 'usuarioId'];

async function listarLogs(req, res) {
    try {
        const paginacao = lerPaginacao(req.query);
        const where = {};

        for (const campo of filtrosPermitidos) {
            const valor = req.query[campo];
            if (valor === undefined) continue;

            if (typeof valor !== 'string' || valor.trim() === '') {
                return enviarErro(res, req, 422, 'FILTRO_INVALIDO', 'Filtro de auditoria inválido.', [
                    { field: campo, issue: 'Informe um único valor de texto' }
                ]);
            }
            where[campo] = valor.trim();
        }

        const [total, logs] = await Promise.all([
            prisma.logAuditoria.count({ where }),
            prisma.logAuditoria.findMany({
                where,
                orderBy: { criadoEm: 'desc' },
                skip: paginacao.skip,
                take: paginacao.limite
            })
        ]);

        return res.json(montarPagina(logs, total, paginacao));
    } catch (err) {
        if (err.status) {
            return enviarErro(res, req, err.status, err.error, err.message, err.details);
        }
        console.error('Erro ao listar auditoria:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao consultar auditoria.');
    }
}

module.exports = { listarLogs };
