const LIMITE_PADRAO = 10;
const LIMITE_MAXIMO = 50;

function lerPaginacao(query) {
    // aceita pagina/limite e também page/limit, que é o nome usado no roteiro do projeto
    const paginaInformada = query.pagina !== undefined ? query.pagina : query.page;
    const limiteInformado = query.limite !== undefined ? query.limite : query.limit;
    const pagina = paginaInformada === undefined ? 1 : Number(paginaInformada);
    const limite = limiteInformado === undefined ? LIMITE_PADRAO : Number(limiteInformado);
    const details = [];

    if (!Number.isInteger(pagina) || pagina < 1) {
        details.push({ field: 'pagina', issue: 'Deve ser um número inteiro maior ou igual a 1.' });
    }

    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
        details.push({ field: 'limite', issue: `Deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO}.` });
    }

    if (details.length > 0) {
        throw {
            status: 422,
            error: 'PAGINACAO_INVALIDA',
            message: 'Parâmetros de paginação inválidos.',
            details
        };
    }

    return { pagina, limite, skip: (pagina - 1) * limite };
}

function montarPagina(dados, total, { pagina, limite }) {
    return {
        dados,
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite)
    };
}

module.exports = { lerPaginacao, montarPagina };
