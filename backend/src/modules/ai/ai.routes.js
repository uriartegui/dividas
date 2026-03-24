const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { getStep, nextStep } = require('./ai.engine')
const supabase = require('../../config/db')

router.use(auth)

// Inicia conversa
router.post('/start', async (req, res, next) => {
  try {
    const { debtId } = req.body
    if (!debtId) return res.status(400).json({ error: 'debtId é obrigatório' })

    const { data: debt } = await supabase
      .from('debts')
      .select('*, debtors(id, name, phone)')
      .eq('id', debtId)
      .eq('tenant_id', req.tenantId)
      .single()

    if (!debt) return res.status(404).json({ error: 'Dívida não encontrada' })

    const debtor = debt.debtors
    const step = getStep('greeting', debtor.name, debt.current_amount)

    // Cria sessão de conversa
    const { data: call } = await supabase.from('calls').insert({
      tenant_id: req.tenantId,
      debt_id: debt.id,
      debtor_id: debtor.id,
      channel: 'whatsapp',
      ai_used: true,
      metadata: {
        currentStep: 'greeting',
        debtorName: debtor.name,
        amount: debt.current_amount,
        history: [{ role: 'agent', message: step.message }],
      },
    }).select().single()

    res.json({
      callId: call.id,
      debtorName: debtor.name,
      amount: debt.current_amount,
      ...step,
    })
  } catch (err) { next(err) }
})

// Responde conversa
router.post('/reply', async (req, res, next) => {
  try {
    const { callId, userInput } = req.body
    if (!callId || !userInput) return res.status(400).json({ error: 'callId e userInput são obrigatórios' })

    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('tenant_id', req.tenantId)
      .single()

    if (!call) return res.status(404).json({ error: 'Conversa não encontrada' })

    const meta = call.metadata
    const currentStep = meta.currentStep

    const nextStepKey = nextStep(currentStep, userInput)
    if (!nextStepKey) {
      return res.status(400).json({ error: 'Opção inválida', validOptions: Object.keys(require('./ai.engine').flows[currentStep]?.next || {}) })
    }

    const step = getStep(nextStepKey, meta.debtorName, meta.amount)
    const history = [...meta.history, { role: 'user', message: userInput }, { role: 'agent', message: step.message }]

    // Atualiza metadata
    await supabase.from('calls').update({
      metadata: { ...meta, currentStep: nextStepKey, history },
      outcome: step.terminal ? step.outcome : null,
      ended_at: step.terminal ? new Date().toISOString() : null,
    }).eq('id', callId)

    // Se terminal, atualiza status da dívida
    if (step.terminal && step.outcome === 'accepted') {
      await supabase.from('debts').update({ status: 'agreed' }).eq('id', call.debt_id)
    }
    if (step.terminal && step.outcome === 'already_paid') {
      await supabase.from('debts').update({ status: 'paid' }).eq('id', call.debt_id)
    }
    if (step.terminal && step.outcome === 'wants_installment') {
      await supabase.from('debts').update({ status: 'negotiating' }).eq('id', call.debt_id)
    }

    res.json({ callId, ...step, history })
  } catch (err) { next(err) }
})

// Histórico de uma conversa
router.get('/history/:callId', async (req, res, next) => {
  try {
    const { data: call } = await supabase
      .from('calls')
      .select('*, debtors(name), debts(description, current_amount)')
      .eq('id', req.params.callId)
      .eq('tenant_id', req.tenantId)
      .single()

    if (!call) return res.status(404).json({ error: 'Conversa não encontrada' })
    res.json(call)
  } catch (err) { next(err) }
})

module.exports = router
