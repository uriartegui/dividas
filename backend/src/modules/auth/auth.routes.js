const router = require('express').Router()
const controller = require('./auth.controller')

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastrar nova clínica
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, email, password]
 *             properties:
 *               name: { type: string, example: Clínica São Lucas }
 *               slug: { type: string, example: clinica-sao-lucas }
 *               email: { type: string, example: admin@saolucas.com }
 *               password: { type: string, example: "senha123" }
 *     responses:
 *       201:
 *         description: Clínica cadastrada com sucesso
 *       400:
 *         description: Slug já em uso
 */
router.post('/register', controller.register)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login no sistema
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, tenantSlug]
 *             properties:
 *               email: { type: string, example: admin@saolucas.com }
 *               password: { type: string, example: "senha123" }
 *               tenantSlug: { type: string, example: clinica-sao-lucas }
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', controller.login)

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token renovado
 *       401:
 *         description: Refresh token inválido
 */
router.post('/refresh', controller.refresh)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout do sistema
 *     responses:
 *       200:
 *         description: Logout realizado
 */
router.post('/logout', controller.logout)

module.exports = router
