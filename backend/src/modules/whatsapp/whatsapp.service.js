const supabase = require('../../config/db')

function buildMessage(debtorName, amount, dueDate) {
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const date = new Date(dueDate).toLocaleDateString('pt-BR')
  return `Olá, *${debtorName}*! 👋

Identificamos uma pendência em seu cadastro:

💰 *Valor:* ${fmt(amount)}
📅 *Vencimento:* ${date}

Para regularizar sua situação e evitar negativação, acesse o link abaixo:

🔗 *Link de pagamento:* https://pagar.clinica.com.br/${Math.random().toString(36).slice(2, 10)}

Qualquer dúvida, responda esta mensagem.
_Clínica — Departamento Financeiro_`
}

async function sendWhatsApp(tenantId, debtId, debtorId, phone, message) {
  // Mock: simula envio e retorna status
  await new Promise(r => setTimeout(r, 300)) // simula latência

  const success = Math.random() > 0.1 // 90% de sucesso
  const status = success ? 'sent' : 'failed'
  const externalId = success ? `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` : null

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

module.exports = { runWhatsAppCampaign, buildMessage }
