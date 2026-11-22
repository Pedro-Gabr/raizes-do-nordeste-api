const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { registrarLog } = require('./auditoriaService');

const statusEmAndamento = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'PRONTO'];

async function buscarUsuario(usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
        throw {
            status: 404,
            error: 'USUARIO_NAO_ENCONTRADO',
            message: 'Usuário não encontrado.'
        };
    }
    return usuario;
}

async function consultarConsentimento(usuarioId) {
    const usuario = await buscarUsuario(usuarioId);
    return {
        consentimentoLGPD: usuario.consentimentoLGPD,
        consentimentoEm: usuario.consentimentoEm
    };
}

async function alterarConsentimento({ usuarioId, consentimento }) {
    if (typeof consentimento !== 'boolean') {
        throw {
            status: 422,
            error: 'DADOS_INVALIDOS',
            message: 'Informe consentimentoLGPD como true ou false.',
            details: [{ field: 'consentimentoLGPD', issue: 'Deve ser um valor booleano' }]
        };
    }

    const usuario = await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
            consentimentoLGPD: consentimento,
            consentimentoEm: consentimento ? new Date() : null
        }
    });

    await registrarLog({
        usuarioId,
        acao: consentimento ? 'CONSENTIMENTO_CONCEDIDO' : 'CONSENTIMENTO_REVOGADO',
        entidade: 'Usuario',
        entidadeId: usuarioId,
        detalhes: consentimento
            ? 'Cliente concedeu consentimento para o programa de fidelidade'
            : 'Cliente revogou o consentimento; acúmulo e resgate de pontos bloqueados'
    });

    return {
        consentimentoLGPD: usuario.consentimentoLGPD,
        consentimentoEm: usuario.consentimentoEm
    };
}

// direito de acesso e portabilidade: tudo o que a API guarda sobre o titular, sem a senha
async function exportarDados(usuarioId) {
    const usuario = await buscarUsuario(usuarioId);

    const [pedidos, movimentosPontos, registros] = await Promise.all([
        prisma.pedido.findMany({
            where: { clienteId: usuarioId },
            include: { itens: true, pagamento: true },
            orderBy: { criadoEm: 'desc' }
        }),
        prisma.movimentoPontos.findMany({
            where: { usuarioId },
            orderBy: { criadoEm: 'desc' }
        }),
        prisma.logAuditoria.findMany({
            where: { usuarioId },
            orderBy: { criadoEm: 'desc' }
        })
    ]);

    await registrarLog({
        usuarioId,
        acao: 'EXPORTAR_DADOS',
        entidade: 'Usuario',
        entidadeId: usuarioId,
        detalhes: `Pedidos: ${pedidos.length} | Movimentos de pontos: ${movimentosPontos.length}`
    });

    return {
        geradoEm: new Date().toISOString(),
        titular: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.role,
            pontos: usuario.pontos,
            consentimentoLGPD: usuario.consentimentoLGPD,
            consentimentoEm: usuario.consentimentoEm,
            criadoEm: usuario.criadoEm
        },
        pedidos,
        movimentosPontos,
        registrosDeAcesso: registros.map((log) => ({
            acao: log.acao,
            entidade: log.entidade,
            entidadeId: log.entidadeId,
            detalhes: log.detalhes,
            criadoEm: log.criadoEm
        }))
    };
}

// RN10: os pedidos continuam no banco, mas a conta deixa de identificar a pessoa e de dar acesso
async function anonimizarConta({ usuarioId, senha }) {
    if (!senha) {
        throw {
            status: 422,
            error: 'CAMPOS_OBRIGATORIOS',
            message: 'Informe a senha para confirmar a anonimização.',
            details: [{ field: 'senha', issue: 'Campo obrigatório' }]
        };
    }

    const usuario = await buscarUsuario(usuarioId);

    const senhaConfere = await bcrypt.compare(String(senha), usuario.senha);
    if (!senhaConfere) {
        throw {
            status: 403,
            error: 'SENHA_INCORRETA',
            message: 'Senha incorreta. A conta não foi anonimizada.'
        };
    }

    const emAndamento = await prisma.pedido.count({
        where: { clienteId: usuarioId, status: { in: statusEmAndamento } }
    });
    if (emAndamento > 0) {
        throw {
            status: 409,
            error: 'PEDIDO_EM_ANDAMENTO',
            message: 'Existem pedidos em andamento. Aguarde a entrega ou cancele antes de anonimizar a conta.',
            details: [{ field: 'pedidos', issue: `${emAndamento} pedido(s) em andamento` }]
        };
    }

    // senha aleatória: ninguém consegue entrar de novo com essa conta
    const senhaBloqueada = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
            nome: 'Usuário anonimizado',
            email: `anonimizado-${usuarioId}@raizes.invalid`,
            senha: senhaBloqueada,
            consentimentoLGPD: false,
            consentimentoEm: null,
            anonimizadoEm: new Date()
        }
    });

    await registrarLog({
        usuarioId,
        acao: 'ANONIMIZAR_CONTA',
        entidade: 'Usuario',
        entidadeId: usuarioId,
        detalhes: 'Nome e e-mail substituídos, acesso bloqueado; pedidos mantidos'
    });

    return { anonimizadoEm: new Date().toISOString() };
}

module.exports = { consultarConsentimento, alterarConsentimento, exportarDados, anonimizarConta };
