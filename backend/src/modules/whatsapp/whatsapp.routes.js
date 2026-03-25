const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { runWhatsAppCampaign, replyWhatsApp } = require('./whatsapp.service')
const supabase = require('../../config/db')

// ─── WEBHOOK (sem auth — Z-API chama direto) ────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body
    console.log('📩 Webhook recebido:', JSON.stringify(body).slice(0, 500))
    // Z-API envia diferentes formatos dependendo do tipo de mensagem
    const phone = (body.phone || '').replace(/\D/g, '')
    const text = body.text?.message || body.image?.caption || body.audio?.caption || ''
    const fromMe = body.fromMe === true

    console.log(`📞 phone=${phone} fromMe=${fromMe} text="${text}"`)

    if (!phone || !text) {
      console.log('⚠️ Ignorado: sem phone ou text')
      return res.sendStatus(200)
    }

    // Normaliza: tenta com e sem prefixo 55
    const phoneVariants = [
      phone,
      phone.startsWith('55') ? phone.slice(2) : phone,
      `55${phone}`,
    ]
    const orFilter = phoneVariants.map(p => `phone.eq.${p}`).join(',')
    console.log('🔍 Buscando devedor com:', orFilter)

    // Busca devedor pelo telefone (em qualquer tenant)
    const { data: debtor, error: debtorError } = await supabase
      .from('debtors')
      .select('id, tenant_id, name')
      .or(orFilter)
      .limit(1)
      .single()

    console.log('👤 Devedor encontrado:', debtor, 'Erro:', debtorError?.message)

    if (!debtor) return res.sendStatus(200)

    const { data: insertData, error: insertError } = await supabase.from('messages').insert({
      tenant_id: debtor.tenant_id,
      debtor_id: debtor.id,
      direction: fromMe ? 'outbound' : 'inbound',
      channel: 'whatsapp',
      content: text,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).select()
    console.log('💾 Insert resultado:', insertData, 'Erro:', insertError?.message)

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
