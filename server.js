require('dotenv').config();
const { exigirJwtSecret } = require('./src/config/validarAmbiente');

exigirJwtSecret();

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ON na porta ${PORT}`);
});