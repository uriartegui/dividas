const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { runWhatsAppCampaign, replyWhatsApp } = require('./whatsapp.service')
const supabase = require('../../config/db')

// ─── WEBHOOK (sem auth — Z-API chama direto) ────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body
    // Z-API envia diferentes formatos dependendo do tipo de mensagem
    const phone = (body.phone || '').replace(/\D/g, '')
    const text = body.text?.message || body.image?.caption || body.audio?.caption || ''
    const fromMe = body.fromMe === true

    if (!phone || !text) return res.sendStatus(200)

    // Normaliza: tenta com e sem prefixo 55
    const phoneVariants = [
      phone,                                          // ex: 554888282153
      phone.startsWith('55') ? phone.slice(2) : phone, // ex: 4888282153
      `55${phone}`,                                   // ex: 554888282153
    ]
    const orFilter = phoneVariants.map(p => `phone.eq.${p}`).join(',')

    // Busca devedor pelo telefone (em qualquer tenant)
    const { data: debtor } = await supabase
      .from('debtors')
      .select('id, tenant_id')
      .or(orFilter)
      .limit(1)
      .single()

    if (!debtor) return res.sendStatus(200)

    await supabase.from('messages').insert({
      tenant_id: debtor.tenant_id,
      debtor_id: debtor.id,
      direction: fromMe ? 'outbound' : 'inbound',
      channel: 'whatsapp',
      content: text,
      status: 'received',
      sent_at: new Date().toISOString(),
    })

    res.sendStatus(200)
  } catch (err) {
    console.error('Webhook error:', err)
    res.sendStatus(200)
  }
})

// ─── Rotas autenticadas ──────────────────────────────────────────────────────
router.use(auth)

// Listar conversas (último msg por devedor)
router.get('/conversations', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, debtors(id, name, phone)')
      .eq('tenant_id', req.tenantId)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    // Deduplica por devedor_id mantendo a msg mais recente
    const seen = new Set()
    const conversations = []
    for (const msg of data) {
      if (!msg.debtor_id || seen.has(msg.debtor_id)) continue
      seen.add(msg.debtor_id)
      conversations.push(msg)
    }

    res.json(conversations)
  } catch (err) { next(err) }
})

// Mensagens de um devedor específico
router.get('/conversations/:debtorId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .eq('debtor_id', req.params.debtorId)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

// Responder para um devedor
router.post('/reply', async (req, res, next) => {
  try {
    const { debtorId, message } = req.body
    if (!debtorId || !message) return res.status(400).json({ error: 'debtorId e message obrigatórios' })

    const { data: debtor, error } = await supabase
      .from('debtors')
      .select('id, name, phone')
      .eq('id', debtorId)
      .eq('tenant_id', req.tenantId)
      .single()

    if (error || !debtor) return res.status(404).json({ error: 'Devedor não encontrado' })
    if (!debtor.phone) return res.status(400).json({ error: 'Devedor sem telefone cadastrado' })

    const result = await replyWhatsApp(req.tenantId, debtor.id, debtor.phone, message)
    res.json(result)
  } catch (err) { next(err) }
})

// Disparar campanha
router.post('/send', async (req, res, next) => {
  try {
    const result = await runWhatsAppCampaign(req.tenantId)
    res.json(result)
  } catch (err) { next(err) }
})

// Listar mensagens (legado)
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
