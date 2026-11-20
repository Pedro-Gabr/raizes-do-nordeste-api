const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { enviarErro } = require('../utils/erroPadrao');

async function cadastro(req, res) {
    const { nome, email, senha, consentimentoLGPD } = req.body;

    if (!nome || !email || !senha) {
        return enviarErro(res, req, 422, 'CAMPOS_OBRIGATORIOS', 'Nome, e-mail e senha são obrigatórios.');
    }

    try {
        const jaExiste = await prisma.usuario.findUnique({ where: { email } });
        if (jaExiste) {
            return enviarErro(res, req, 409, 'EMAIL_DUPLICADO', 'Este e-mail já está cadastrado.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                role: role || 'CLIENTE',
                consentimentoLGPD: Boolean(consentimentoLGPD)
            }
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

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
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