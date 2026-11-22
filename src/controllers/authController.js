const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { enviarErro } = require('../utils/erroPadrao');
const { registrarLog } = require('../services/auditoriaService');

async function cadastro(req, res) {
    const { nome, email, senha, consentimentoLGPD } = req.body;

    if (!nome || !email || !senha) {
        return enviarErro(res, req, 422, 'CAMPOS_OBRIGATORIOS', 'Nome, e-mail e senha são obrigatórios.');
    }

    if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string') {
        return enviarErro(res, req, 422, 'DADOS_INVALIDOS', 'Nome, e-mail e senha precisam ser enviados como texto.');
    }

    const emailLimpo = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
        return enviarErro(res, req, 422, 'EMAIL_INVALIDO', 'Informe um e-mail válido.');
    }

    if (String(senha).length < 6) {
        return enviarErro(res, req, 422, 'SENHA_FRACA', 'A senha precisa ter pelo menos 6 caracteres.');
    }

    try {
        const jaExiste = await prisma.usuario.findUnique({ where: { email: emailLimpo } });
        if (jaExiste) {
            return enviarErro(res, req, 409, 'EMAIL_DUPLICADO', 'Este e-mail já está cadastrado.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const aceitouTermos = consentimentoLGPD === true;

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email: emailLimpo,
                senha: senhaHash,
                role: 'CLIENTE',
                consentimentoLGPD: aceitouTermos,
                consentimentoEm: aceitouTermos ? new Date() : null
            }
        });

        await registrarLog({
            usuarioId: usuario.id,
            acao: 'CADASTRO_USUARIO',
            entidade: 'Usuario',
            entidadeId: usuario.id,
            detalhes: `Consentimento LGPD: ${aceitouTermos ? 'aceito' : 'não aceito'}`
        });

        delete usuario.senha;

        return res.status(201).json({
            msg: 'Usuário criado com sucesso',
            dados: usuario
        });
    } catch (err) {
        console.error('Erro no cadastro:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro interno no servidor.');
    }
}

async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return enviarErro(res, req, 422, 'CAMPOS_OBRIGATORIOS', 'Informe e-mail e senha.');
    }

    if (typeof email !== 'string' || typeof senha !== 'string') {
        return enviarErro(res, req, 422, 'DADOS_INVALIDOS', 'E-mail e senha precisam ser enviados como texto.');
    }

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { email: String(email).trim().toLowerCase() }
        });
        if (!usuario) {
            return enviarErro(res, req, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
        }

        const bateu = await bcrypt.compare(senha, usuario.senha);
        if (!bateu) {
            return enviarErro(res, req, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
        }

        const accessToken = jwt.sign(
            { id: usuario.id, role: usuario.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.json({
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 86400,
            user: {
                id: usuario.id,
                nome: usuario.nome,
                perfil: usuario.role
            }
        });
    } catch (err) {
        console.error('Erro no login:', err);
        return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro ao realizar login.');
    }
}

module.exports = { cadastro, login };