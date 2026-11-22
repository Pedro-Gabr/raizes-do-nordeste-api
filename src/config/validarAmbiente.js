const TAMANHO_MINIMO = 32;
const VALORES_DE_EXEMPLO = /sua_chave|substitua|gere_uma_chave|troque|changeme|secret/i;

function problemaNoJwtSecret(segredo) {
    if (!segredo) {
        return 'JWT_SECRET não foi definido no arquivo .env.';
    }
    if (segredo.length < TAMANHO_MINIMO) {
        return `JWT_SECRET precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`;
    }
    if (VALORES_DE_EXEMPLO.test(segredo)) {
        return 'JWT_SECRET ainda está com o valor de exemplo.';
    }
    return null;
}

// o servidor não sobe com um segredo fraco, para nunca assinar tokens com uma chave previsível
function exigirJwtSecret() {
    const problema = problemaNoJwtSecret(process.env.JWT_SECRET);
    if (problema) {
        console.error(`Configuração inválida: ${problema}`);
        console.error('Gere uma chave com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
        process.exit(1);
    }
}

module.exports = { problemaNoJwtSecret, exigirJwtSecret };
