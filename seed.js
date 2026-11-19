const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function popularBanco() {
    try {
        const loja = await prisma.unidade.create({
            data: {
                nome: 'Raízes - Shopping Recife',
                endereco: 'Rua Exemplo, 123'
            }
        });

        const tapioca = await prisma.produto.create({
            data: {
                nome: 'Tapioca de Carne de Sol',
                preco: 15.5,
                descricao: 'Muito boa',
                disponivel: true
            }
        });

        await prisma.estoque.create({
            data: {
                unidadeId: loja.id,
                produtoId: tapioca.id,
                quantidade: 50
            }
        });

        console.log('Banco populado!', {
            lojaId: loja.id,
            produtoId: tapioca.id
        });
    } catch (err) {
        console.error('Erro ao rodar seed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

popularBanco();