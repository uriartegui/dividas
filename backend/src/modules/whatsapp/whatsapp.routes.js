const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { runWhatsAppCampaign } = require('./whatsapp.service')
const supabase = require('../../config/db')

router.use(auth)

/**
 * @swagger
 * /whatsapp/send:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Disparar campanha de cobrança via WhatsApp
 *     description: Envia mensagens para todos os devedores com dívidas vencidas
 *     responses:
 *       200:
 *         description: Resultado da campanha
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent: { type: integer, example: 10 }
 *                 failed: { type: integer, example: 2 }
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       debtorName: { type: string }
 *                       phone: { type: string }
 *                       status: { type: string, enum: [sent, failed] }
 */
router.post('/send', async (req, res, next) => {
  try {
    const result = await runWhatsAppCampaign(req.tenantId)
    res.json(result)
  } catch (err) { next(err) }
})

/**
 * @swagger
 * /whatsapp/messages:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Listar mensagens enviadas
 *     responses:
 *       200:
 *         description: Lista de mensagens
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   content: { type: string }
 *                   status: { type: string }
 *                   sent_at: { type: string, format: date-time }
 *                   debtors: { type: object }
 */
router.get('/messages', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, debtors(name, phone)')
      .eq('tenant_id', req.tenantId)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
