const jwt = require('jsonwebtoken')
const env = require('../config/env')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, env.jwt.secret)
    req.user = payload
    req.tenantId = payload.tenantId
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

module.exports = authMiddleware
