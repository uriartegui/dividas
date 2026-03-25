const supabase = require('../../config/db')
const axios = require('axios')

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID
const ZAPI_TOKEN = process.env.ZAPI_TOKEN
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN

function buildMessage(debtorName, amount, dueDate) {
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const date = new Date(dueDate).toLocaleDateString('pt-BR')
  return `Olá, *${debtorName}*! 👋

Identificamos uma pendência em seu cadastro:

💰 *Valor:* ${fmt(amount)}
📅 *Vencimento:* ${date}

Para regularizar sua situação e evitar negativação, entre em contato com nossa equipe financeira.

Qualquer dúvida, responda esta mensagem.
_Departamento Financeiro_`
}

function formatPhone(phone) {
  // Remove tudo que não é número
  const digits = phone.replace(/\D/g, '')
  // Se começa com 0, remove
  const clean = digits.startsWith('0') ? digits.slice(1) : digits
  // Se não tem código do país, adiciona 55 (Brasil)
  if (clean.length === 10 || clean.length === 11) return `55${clean}`
  return clean
}

async function sendWhatsApp(tenantId, debtId, debtorId, phone, message) {
  const formattedPhone = formatPhone(phone)
  let success = false
  let externalId = null
  let status = 'failed'

  if (ZAPI_INSTANCE && ZAPI_TOKEN) {
    try {
      const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`
      const headers = ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}
      const { data } = await axios.post(url, {
        phone: formattedPhone,
        message,
      }, { headers })

      success = true
      externalId = data.zaapId || data.messageId || `zapi_${Date.now()}`
      status = 'sent'
    } catch (err) {
      console.error('Z-API error:', err?.response?.data || err.message)
      status = 'failed'
    }
  } else {
    // Fallback mock quando Z-API não configurada
    await new Promise(r => setTimeout(r, 300))
    success = Math.random() > 0.1
    externalId = success ? `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` : null
    status = success ? 'sent' : 'failed'
  }

  const { data, error } = await supabase.from('messages').insert({
    tenant_id: tenantId,
    debtor_id: debtorId,
    direction: 'outbound',
    channel: 'whatsapp',
    content: message,
    status,
    external_id: externalId,
    sent_at: success ? new Date().toISOString() : null,
  }).select().single()

  if (error) throw error
  return { success, status, messageId: data.id, externalId }
}

async function runWhatsAppCampaign(tenantId) {
  const { data: debts, error } = await supabase
    .from('debts')
    .select('*, debtors(id, name, phone)')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'negotiating'])
    .lt('due_date', new Date().toISOString())

  if (error) throw error
  if (!debts || debts.length === 0) return { sent: 0, failed: 0, results: [] }

  const results = []
  let sent = 0
  let failed = 0

  for (const debt of debts) {
    const debtor = debt.debtors
    if (!debtor.phone) continue

    const message = buildMessage(debtor.name, debt.current_amount, debt.due_date)
    const result = await sendWhatsApp(tenantId, debt.id, debtor.id, debtor.phone, message)

    if (result.success) sent++
    else failed++

    results.push({
      debtorName: debtor.name,
      phone: debtor.phone,
      status: result.status,
      messageId: result.messageId,
    })
  }

  return { sent, failed, results }
}

async function replyWhatsApp(tenantId, debtorId, phone, message) {
  return sendWhatsApp(tenantId, null, debtorId, phone, message)
}

module.exports = { runWhatsAppCampaign, buildMessage, replyWhatsApp }
