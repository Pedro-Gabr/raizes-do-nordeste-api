function enviarErro(res, req, status, error, message, details = []) {
    return res.status(status).json({
        error,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
}

module.exports = { enviarErro };    