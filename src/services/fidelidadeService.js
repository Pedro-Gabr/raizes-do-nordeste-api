const PONTOS_POR_REAL = 10;
const LIMITE_DESCONTO = 0.5;

// valida o pedido de resgate e calcula o desconto (RN09)
function calcularResgate({ pontosResgatar, subtotal, usuario }) {
    if (pontosResgatar === undefined || pontosResgatar === null || pontosResgatar === 0) {
        return { pontosUsados: 0, desconto: 0 };
    }

    if (!Number.isInteger(pontosResgatar) || pontosResgatar < 0 || pontosResgatar % PONTOS_POR_REAL !== 0) {
        throw {
            status: 422,
            error: 'PONTOS_INVALIDOS',
            message: 'Quantidade de pontos inválida para resgate.',
            details: [{ field: 'pontosResgatar', issue: `Informe um número inteiro múltiplo de ${PONTOS_POR_REAL}` }]
        };
    }

    if (!usuario.consentimentoLGPD) {
        throw {
            status: 403,
            error: 'CONSENTIMENTO_NECESSARIO',
            message: 'O resgate de pontos exige consentimento para o programa de fidelidade.'
        };
    }

    if (pontosResgatar > usuario.pontos) {
        throw {
            status: 422,
            error: 'PONTOS_INSUFICIENTES',
            message: 'Saldo de pontos insuficiente.',
            details: [{ field: 'pontosResgatar', issue: `Saldo atual: ${usuario.pontos}` }]
        };
    }

    const desconto = pontosResgatar / PONTOS_POR_REAL;
    const descontoMaximo = subtotal * LIMITE_DESCONTO;

    if (desconto > descontoMaximo) {
        const pontosMaximos = Math.floor(descontoMaximo) * PONTOS_POR_REAL;
        throw {
            status: 422,
            error: 'DESCONTO_ACIMA_DO_LIMITE',
            message: 'O desconto por pontos não pode passar de 50% do valor do pedido.',
            details: [{ field: 'pontosResgatar', issue: `Máximo para este pedido: ${pontosMaximos} pontos` }]
        };
    }

    return { pontosUsados: pontosResgatar, desconto };
}

// grava o movimento no histórico e ajusta o saldo do cliente
async function registrarMovimento(tx, { usuarioId, pedidoId, tipo, pontos }) {
    await tx.movimentoPontos.create({
        data: { usuarioId, pedidoId, tipo, pontos }
    });

    await tx.usuario.update({
        where: { id: usuarioId },
        data: { pontos: { increment: pontos } }
    });
}

// pedido cancelado ou pagamento recusado: devolve os pontos usados e retira os que foram ganhos (RN08 e RN09)
async function estornarPontosDoPedido(tx, { pedidoId, usuarioId }) {
    const movimentos = await tx.movimentoPontos.findMany({ where: { pedidoId } });

    const acumulado = movimentos
        .filter((m) => m.tipo === 'ACUMULO')
        .reduce((soma, m) => soma + m.pontos, 0);
    const resgatado = movimentos
        .filter((m) => m.tipo === 'RESGATE')
        .reduce((soma, m) => soma - m.pontos, 0);

    if (resgatado > 0) {
        await registrarMovimento(tx, { usuarioId, pedidoId, tipo: 'ESTORNO', pontos: resgatado });
    }

    if (acumulado > 0) {
        const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
        // se o cliente já gastou parte dos pontos, o estorno retira só o que ainda existe no saldo
        const retirar = Math.min(acumulado, usuario.pontos);
        if (retirar > 0) {
            await registrarMovimento(tx, { usuarioId, pedidoId, tipo: 'ESTORNO', pontos: -retirar });
        }
    }
}

module.exports = { calcularResgate, registrarMovimento, estornarPontosDoPedido };
