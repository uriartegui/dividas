const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const controller = require('./debtor.controller')
const { upload, importCSV } = require('./debtor.import')

router.use(auth)

/**
 * @swagger
 * /debtors:
 *   get:
 *     tags: [Devedores]
 *     summary: Listar devedores da clínica
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Buscar por nome, CPF ou email
 *     responses:
 *       200:
 *         description: Lista de devedores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Debtor'
 */
router.get('/', controller.list)

/**
 * @swagger
 * /debtors/{id}:
 *   get:
 *     tags: [Devedores]
 *     summary: Buscar devedor por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados do devedor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Debtor'
 *       404:
 *         description: Devedor não encontrado
 */
router.get('/:id', controller.getOne)

/**
 * @swagger
 * /debtors:
 *   post:
 *     tags: [Devedores]
 *     summary: Criar novo devedor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: João Silva }
 *               cpf: { type: string, example: "123.456.789-00" }
 *               email: { type: string, example: joao@email.com }
 *               phone: { type: string, example: "11999999999" }
 *     responses:
 *       201:
 *         description: Devedor criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Debtor'
 */
router.post('/', controller.create)

/**
 * @swagger
 * /debtors/{id}:
 *   put:
 *     tags: [Devedores]
 *     summary: Atualizar devedor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Debtor'
 *     responses:
 *       200:
 *         description: Devedor atualizado
 */
router.put('/:id', controller.update)

/**
 * @swagger
 * /debtors/{id}:
 *   delete:
 *     tags: [Devedores]
 *     summary: Remover devedor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Devedor removido
 */
router.delete('/:id', controller.remove)

/**
 * @swagger
 * /debtors/import:
 *   post:
 *     tags: [Devedores]
 *     summary: Importar devedores via CSV
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resultado da importação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inserted: { type: integer }
 *                 skipped: { type: integer }
 *                 errors: { type: array, items: { type: string } }
 */
router.post('/import', upload.single('file'), importCSV)

module.exports = router
