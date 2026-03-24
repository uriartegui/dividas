const supabase = require('../../config/db')

const outcomes = ['accepted', 'refused', 'wants_installment', 'no_answer', 'already_paid']

function randomOutcome() {
  const weights = [30, 25, 20, 15, 10] // % de chance pra cada outcome
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return outcomes[i]
  }
  return outcomes[0]
}

function generateTranscript(debtorName, amount, outcome) {
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const base = `Agente: Olá, posso falar com ${debtorName}?\nDevedor: Sim, sou eu.\nAgente: Identificamos uma pendência de ${fmt(amount)} em aberto. Podemos regularizar hoje?`

  const responses = {
    accepted: `\nDevedor: Sim, pode me enviar o link de pagamento.\nAgente: Perfeito! Enviarei agora. Obrigado!`,
    refused: `\nDevedor: Não tenho condições no momento.\nAgente: Entendido. Entraremos em contato novamente em breve.`,
    wants_installment: `\nDevedor: Consegue parcelar?\nAgente: Sim! Podemos dividir em até 6x. Vou preparar uma proposta.`,
    no_answer: `\n[Chamada não atendida]`,
    already_paid: `\nDevedor: Já efetuei o pagamento essa semana.\nAgente: Vou verificar e retorno em breve. Obrigado!`,
  }

  return base + (responses[outcome] || '')
}

async function runCollection(tenantId) {
  // Busca dívidas pendentes
  const { data: debts, error } = await supabase
    .from('debts')
    .select('*, debtors(id, name, phone)')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .lt('due_date', new Date().toISOString())

  if (error) throw error
  if (!debts || debts.length === 0) return { processed: 0, results: [] }

  const results = []

  for (const debt of debts) {
    const outcome = randomOutcome()
    const debtor = debt.debtors
    const transcript = generateTranscript(debtor.name, debt.current_amount, outcome)
    const duration = outcome === 'no_answer' ? 0 : Math.floor(Math.random() * 120) + 30

    // Registra a chamada
    const { data: call } = await supabase.from('calls').insert({
      tenant_id: tenantId,
      debt_id: debt.id,
      debtor_id: debtor.id,
      channel: 'voice',
      outcome,
      duration_sec: duration,
      transcript,
      ai_used: true,
      ended_at: new Date().toISOString(),
    }).select().single()

    // Atualiza status da dívida conforme outcome
    let newStatus = debt.status
    if (outcome === 'accepted') newStatus = 'agreed'
    if (outcome === 'already_paid') newStatus = 'paid'
    if (outcome === 'wants_installment') newStatus = 'negotiating'

    if (newStatus !== debt.status) {
      await supabase.from('debts').update({ status: newStatus }).eq('id', debt.id)
    }

    results.push({
      debtorName: debtor.name,
      amount: debt.current_amount,
      outcome,
      newStatus,
      callId: call?.id,
    })
  }

  return { processed: debts.length, results }
}

module.exports = { runCollection }
