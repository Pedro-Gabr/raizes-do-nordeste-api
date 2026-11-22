const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./config/swagger.json');

const authRoutes = require('./routes/authRoutes');
const lojaRoutes = require('./routes/lojaRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const pagamentoRoutes = require('./routes/pagamentoRoutes');
const { enviarErro } = require('./utils/erroPadrao');

const app = express();

app.use(cors());
app.use(express.json());

// No Express 5, req.body fica undefined quando a requisição vem sem corpo
app.use((req, res, next) => {
    if (req.body === undefined) {
        req.body = {};
    }
    next();
});

app.get('/', (req, res) => {
    res.json({ status: 'API Raízes do Nordeste rodando', docs: '/api-docs' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use('/auth', authRoutes);
app.use('/', lojaRoutes);
app.use('/pedidos', pedidoRoutes);
app.use('/pagamentos', pagamentoRoutes);

app.use((req, res) => {
    return enviarErro(res, req, 404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.');
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return enviarErro(res, req, 400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
    }
    if (err.type === 'entity.too.large') {
        return enviarErro(res, req, 413, 'CORPO_MUITO_GRANDE', 'O corpo da requisição é grande demais.');
    }
    console.error('Erro não tratado:', err);
    return enviarErro(res, req, 500, 'ERRO_INTERNO', 'Erro interno do servidor.');
});

module.exports = app;