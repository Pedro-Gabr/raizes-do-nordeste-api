const lgpdService = require('../services/lgpdService');
const { enviarErro } = require('../utils/erroPadrao');

function tratarErro(err, req, res, mensagemPadrao) {
    if (err.status) {
        return enviarErro(res, req, err.status, err.error, err.message, err.details);
    }
    console.error(mensagemPadrao, err);
    return enviarErro(res, req, 500, 'ERRO_INTERNO', mensagemPadrao);
}

async function consultarConsentimento(req, res) {
    try {
        const consentimento = await lgpdService.consultarConsentimento(req.usuario.id);
        return res.json(consentimento);
    } catch (err) {
        return tratarErro(err, req, res, 'Erro ao consultar consentimento.');
    }
}

async function alterarConsentimento(req, res) {
    try {
        const consentimento = await lgpdService.alterarConsentimento({
            usuarioId: req.usuario.id,
            consentimento: req.body.consentimentoLGPD
        });
        return res.json({ msg: 'Consentimento atualizado.', ...consentimento });
    } catch (err) {
        return tratarErro(err, req, res, 'Erro ao atualizar consentimento.');
    }
}

async function exportarDados(req, res) {
    try {
        const dados = await lgpdService.exportarDados(req.usuario.id);
        return res.json(dados);
    } catch (err) {
        return tratarErro(err, req, res, 'Erro ao exportar dados.');
    }
}

async function anonimizarConta(req, res) {
    try {
        const resultado = await lgpdService.anonimizarConta({
            usuarioId: req.usuario.id,
            senha: req.body.senha
        });
        return res.json({ msg: 'Conta anonimizada. O acesso foi bloqueado.', ...resultado });
    } catch (err) {
        return tratarErro(err, req, res, 'Erro ao anonimizar conta.');
    }
}

module.exports = { consultarConsentimento, alterarConsentimento, exportarDados, anonimizarConta };
