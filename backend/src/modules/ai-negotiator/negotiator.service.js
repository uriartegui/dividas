const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('../../config/db')

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })

function getMaxDiscount(daysOverdue) {
  if (daysOverdue > 90) return 15
  if (daysOverdue > 60) return 10
  if (daysOverdue > 30) return 5
  return 0
}

async function negotiate({ tenantId, debtorId, debtorName, debt, inboundMessage }) {
  const daysOverdue = Math.floor((Date.now() - new Date(debt.due_date)) / (1000 * 60 * 60 * 24))
  const maxDiscount = getMaxDiscount(daysOverdue)
  const amount = Number(debt.current_amount)
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Busca histórico recente da conversa (últimas 10 mensagens)
  const { data: history } = await supabase
    .from('messages')
    .select('direction, content, created_at')
    .eq('tenant_id', tenantId)
    .eq('debtor_id', debtorId)
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(10)

  const historyText = (history || [])
    .reverse()
    .map(m => `${m.direction === 'inbound' ? 'Paciente' : 'Clínica'}: ${m.content}`)
    .join('\n')

  const systemPrompt = `Você é um negociador de cobranças profissional e empático de uma clínica médica brasileira.
Seu objetivo é fechar um acordo de pagamento de forma respeitosa e eficiente.

DADOS DA DÍVIDA:
- Paciente: ${debtorName}
- Valor original: ${fmt(amount)}
- Dias em atraso: ${daysOverdue}
- Desconto máximo que você pode oferecer: ${maxDiscount}%

REGRAS DE NEGOCIAÇÃO:
- Seja sempre educado, empático e profissional
- Se o paciente quiser pagar à vista, pode oferecer desconto de até ${maxDiscount}%
- Se o paciente quiser parcelar, ofereça 3x ou 6x sem desconto
- Se recusar pagar, tente entender o motivo e ofereça uma alternativa
- Se já houver histórico de conversa, leve em consideração o contexto
- Responda SEMPRE em português brasileiro, de forma natural como WhatsApp
- Seja breve (máximo 3 parágrafos)

Responda SOMENTE com um JSON no formato:
{
  "intent": "pay_full" | "pay_installment_3x" | "pay_installment_6x" | "objection" | "unknown",
  "discount_pct": 0,
  "message": "sua resposta para o paciente aqui"
}

- intent "pay_full": paciente confirmou que quer pagar à vista
- intent "pay_installment_3x": paciente confirmou parcelamento em 3x
- intent "pay_installment_6x": paciente confirmou parcelamento em 6x
- intent "objection": paciente tem dúvida, objeção ou não quer pagar
- intent "unknown": mensagem não relacionada à cobrança`

  const userPrompt = historyText
    ? `Histórico da conversa:\n${historyText}\n\nNova mensagem do paciente: ${inboundMessage}`
    : `Mensagem do paciente: ${inboundMessage}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const raw = response.content[0].text.trim()
  const json = JSON.parse(raw.match(/\{[\s\S]*\}/)[0])
  return { ...json, daysOverdue, maxDiscount, amount }
}

module.exports = { negotiate }
