require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API rodando...');
});

// --- Auth ---

app.post('/cadastro', async (req, res) => {
    const { nome, email, senha, consentimentoLGPD } = req.body;

    try {
        const jaExiste = await prisma.usuario.findFirst({ where: { email } });
        if (jaExiste) {
            return res.status(400).json({ msg: 'Email já cadastrado!' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                consentimentoLGPD: consentimentoLGPD || false
            }
        });

        delete usuario.senha;

        return res.status(201).json({
            msg: 'Usuário criado com sucesso',
            dados: usuario
        });
    } catch (err) {
        console.error('Erro no cadastro:', err);
        return res.status(500).json({ msg: 'Erro interno no servidor.' });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const usuario = await prisma.usuario.findFirst({ where: { email } });
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }

        const bateu = await bcrypt.compare(senha, usuario.senha);
        if (!bateu) {
            return res.status(401).json({ msg: 'Senha errada' });
        }

        const token = jwt.sign(
            { id: usuario.id, role: usuario.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.json({ token });
    } catch (err) {
        console.error('Erro no login:', err);
        return res.status(500).json({ msg: 'Erro no login' });
    }
});

// --- Produtos e Pedidos ---

app.get('/produtos', async (req, res) => {
    try {
        const produtos = await prisma.produto.findMany({
            where: { disponivel: true }
        });
        return res.json(produtos);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Erro ao listar produtos' });
    }
});

app.post('/pedido', async (req, res) => {
    const { clienteId, unidadeId, produtoId, quantidade } = req.body;

    try {
        const estoque = await prisma.estoque.findFirst({
            where: { unidadeId, produtoId }
        });

        if (!estoque || estoque.quantidade < quantidade) {
            return res.status(400).json({ msg: 'Não tem estoque suficiente nessa loja!' });
        }

        const produto = await prisma.produto.findUnique({
            where: { id: produtoId }
        });

        const total = produto.preco * quantidade;

        const pedido = await prisma.pedido.create({
            data: {
                clienteId,
                unidadeId,
                total,
                status: 'PENDENTE'
            }
        });

        await prisma.itemPedido.create({
            data: {
                pedidoId: pedido.id,
                produtoId,
                quantidade,
                precoUnitario: produto.preco
            }
        });

        await prisma.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: estoque.quantidade - quantidade }
        });

        // TODO: integrar gateway real depois
        await prisma.pagamento.create({
            data: {
                pedidoId: pedido.id,
                status: 'APROVADO',
                valor: total,
                transacaoId: 'MOCK-12345'
            }
        });

        return res.status(201).json({
            msg: 'Pedido feito com sucesso!',
            pedido
        });
    } catch (err) {
        console.error('Erro ao fechar pedido:', err);
        return res.status(500).json({ msg: 'Erro ao criar pedido.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ON na porta ${PORT}`);
});