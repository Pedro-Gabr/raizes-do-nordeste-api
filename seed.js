const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function popularBanco() {
    try {
        const senhaHash = await bcrypt.hash('123456', 10);

        const cliente = await prisma.usuario.upsert({
            where: { email: 'pedro@teste.com' },
            update: {},
            create: {
                nome: 'Pedro Cliente',
                email: 'pedro@teste.com',
                senha: senhaHash,
                role: 'CLIENTE',
                consentimentoLGPD: true,
                consentimentoEm: new Date()
            }
        });

        const gerente = await prisma.usuario.upsert({
            where: { email: 'gerente@raizes.com' },
            update: {},
            create: {
                nome: 'Dona Francisca',
                email: 'gerente@raizes.com',
                senha: senhaHash,
                role: 'GERENTE',
                consentimentoLGPD: true,
                consentimentoEm: new Date()
            }
        });

        const loja = await prisma.unidade.create({
            data: {
                nome: 'Raízes - Shopping Recife',
                endereco: 'Av. Padre Carapuceiro, 777 - Recife/PE'
            }
        });

        const tapioca = await prisma.produto.create({
            data: {
                nome: 'Tapioca de Carne de Sol',
                preco: 15.5,
                descricao: 'Tapioca artesanal com carne de sol na nata',
                disponivel: true
            }
        });

        const cuscuz = await prisma.produto.create({
            data: {
                nome: 'Cuscuz Recheado',
                preco: 12.0,
                descricao: 'Cuscuz nordestino com queijo coalho e manteiga de garrafa',
                disponivel: true
            }
        });

        await prisma.estoque.createMany({
            data: [
                { unidadeId: loja.id, produtoId: tapioca.id, quantidade: 50 },
                { unidadeId: loja.id, produtoId: cuscuz.id, quantidade: 30 }
            ]
        });

        console.log('Banco populado com sucesso!');
        console.log({
            clienteId: cliente.id,
            gerenteId: gerente.id,
            unidadeId: loja.id,
            tapiocaId: tapioca.id,
            cuscuzId: cuscuz.id
        });
    } catch (err) {
        console.error('Erro ao rodar seed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

popularBanco();