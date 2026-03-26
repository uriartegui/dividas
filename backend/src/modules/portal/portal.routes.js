const router = require('express').Router()
const crypto = require('crypto')
const supabase = require('../../config/db')
const { replyWhatsApp } = require('../whatsapp/whatsapp.service')

const PORTAL_SECRET = process.env.PORTAL_SECRET || 'portal_secret_default'

function generateToken(debtorId) {
  return crypto.createHmac('sha256', PORTAL_SECRET).update(debtorId).digest('hex').slice(0, 32)
}

function validateToken(debtorId, token) {
  return generateToken(debtorId) === token
}

// Gerar link do portal para um devedor (autenticado, uso interno)
const auth = require('../../middlewares/auth.middleware')
router.get('/link/:debtorId', auth, async (req, res, next) => {
  try {
    const { debtorId } = req.params
    const { data: debtor } = await supabase
      .from('debtors')
      .select('id')
      .eq('id', debtorId)
      .eq('tenant_id', req.tenantId)
      .single()
    if (!debtor) return res.status(404).json({ error: 'Devedor não encontrado' })
    const token = generateToken(debtorId)
    const url = `${process.env.FRONTEND_URL}/portal?token=${token}&id=${debtorId}`
    res.json({ url })
  } catch (err) { next(err) }
})

// Acesso público ao portal do devedor
router.get('/access', async (req, res, next) => {
  try {
    const { token, id } = req.query
    if (!token || !id) return res.status(400).json({ error: 'Token inválido' })
    if (!validateToken(id, token)) return res.status(401).json({ error: 'Token inválido' })

    const { data: debtor } = await supabase
      .from('debtors')
      .select('id, name, cpf, phone')
      .eq('id', id)
      .single()
    if (!debtor) return res.status(404).json({ error: 'Devedor não encontrado' })

    const { data: debts } = await supabase
      .from('debts')
      .select('id, description, current_amount, due_date, status')
      .eq('debtor_id', id)
      .in('status', ['pending', 'negotiating'])
      .order('due_date', { ascending: true })

    res.json({ debtor, debts: debts || [] })
  } catch (err) { next(err) }
})

// Devedor aceita acordo pelo portal
router.post('/agree', async (req, res, next) => {
  try {
    const { token, id, debtId, installments } = req.body
    if (!token || !id || !debtId) return res.status(400).json({ error: 'Dados inválidos' })
    if (!validateToken(id, token)) return res.status(401).json({ error: 'Token inválido' })

    const { data: debt } = await supabase
      .from('debts')
      .select('id, current_amount, tenant_id')
      .eq('id', debtId)
      .eq('debtor_id', id)
      .in('status', ['pending', 'negotiating'])
      .single()
    if (!debt) return res.status(404).json({ error: 'Dívida não encontrada' })

    const { data: debtor } = await supabase
      .from('debtors')
      .select('id, name, phone')
      .eq('id', id)
      .single()

    const numInstallments = installments === 3 ? 3 : 1
    const totalAmount = Number(debt.current_amount)
    const installmentAmount = totalAmount / numInstallments
    const firstDue = new Date()
    firstDue.setDate(firstDue.getDate() + 3)

    const { data: agreement } = await supabase
      .from('agreements')
      .insert({
        tenant_id: debt.tenant_id,
        debt_id: debt.id,
        debtor_id: id,
        total_amount: totalAmount,
        discount_pct: 0,
        installments: numInstallments,
        first_due_date: firstDue.toISOString().split('T')[0],
        status: 'active',
        channel: 'whatsapp',
        notes: 'Acordo aceito pelo portal do paciente',
      })
      .select()
      .single()

    if (agreement) {
      const parcelas = []
      for (let i = 0; i < numInstallments; i++) {
        const due = new Date(firstDue)
        due.setMonth(due.getMonth() + i)
        parcelas.push({
          tenant_id: debt.tenant_id,
          agreement_id: agreement.id,
          installment_num: i + 1,
          amount: installmentAmount,
          due_date: due.toISOString().split('T')[0],
        })
      }
      await supabase.from('agreement_installments').insert(parcelas)
      await supabase.from('debts').update({ status: 'agreed' }).eq('id', debt.id)

      // Notifica pelo WhatsApp
      if (debtor?.phone) {
        const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const msg = numInstallments === 1
          ? `Olá, *${debtor.name}*! ✅\n\nSeu acordo foi confirmado pelo portal:\n\n💰 *Valor:* ${fmt(totalAmount)}\n📅 *Vencimento:* ${firstDue.toLocaleDateString('pt-BR')}\n\nEntraremos em contato com os dados de pagamento.\n\n_Departamento Financeiro_`
          : `Olá, *${debtor.name}*! ✅\n\nSeu parcelamento foi confirmado pelo portal:\n\n💰 *Total:* ${fmt(totalAmount)}\n📋 *Parcelas:* ${numInstallments}x de ${fmt(installmentAmount)}\n📅 *Primeira parcela:* ${firstDue.toLocaleDateString('pt-BR')}\n\nEntraremos em contato com os dados de pagamento.\n\n_Departamento Financeiro_`
        await replyWhatsApp(debt.tenant_id, debtor.id, debtor.phone, msg)
      }
    }

    res.json({ success: true, agreement })
  } catch (err) { next(err) }
})

module.exports = { router, generateToken }
