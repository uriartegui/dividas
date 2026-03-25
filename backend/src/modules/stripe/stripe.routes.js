const router = require('express').Router()
const Stripe = require('stripe')
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')
const env = require('../../config/env')

const stripe = new Stripe(env.stripeSecretKey)

const PLANS = {
  basic:      { priceId: 'price_1TEfnfHxMycOnn9Nshy3v0mM', name: 'Basic',      amount: 97  },
  pro:        { priceId: 'price_1TEfnuHxMycOnn9NMQGUgxz5', name: 'Pro',        amount: 197 },
  enterprise: { priceId: 'price_1TEfo5HxMycOnn9NwXxDbx3G', name: 'Enterprise', amount: 497 },
}

// GET /api/stripe/plans — retorna os planos disponíveis
router.get('/plans', auth, async (req, res) => {
  const { data: tenant } = await supabase
    .from('tenants').select('plan, plan_expires_at, stripe_subscription_id')
    .eq('id', req.tenantId).single()
  res.json({ plans: PLANS, current: tenant?.plan || 'trial', expiresAt: tenant?.plan_expires_at })
})

// POST /api/stripe/checkout — cria sessão de checkout
router.post('/checkout', auth, async (req, res, next) => {
  try {
    const { plan } = req.body
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plano inválido' })

    const { data: tenant } = await supabase
      .from('tenants').select('*').eq('id', req.tenantId).single()

    // Cria ou reutiliza customer no Stripe
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: req.tenantId }
      })
      customerId = customer.id
      await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', req.tenantId)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${env.frontendUrl}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${env.frontendUrl}/dashboard/billing?cancelled=true`,
      metadata: { tenantId: req.tenantId, plan },
    })

    res.json({ url: session.url })
  } catch (err) { next(err) }
})

// POST /api/stripe/portal — abre portal de gerenciamento da assinatura
router.post('/portal', auth, async (req, res, next) => {
  try {
    const { data: tenant } = await supabase
      .from('tenants').select('stripe_customer_id').eq('id', req.tenantId).single()

    if (!tenant?.stripe_customer_id)
      return res.status(400).json({ error: 'Nenhuma assinatura ativa' })

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${env.frontendUrl}/dashboard/billing`,
    })

    res.json({ url: session.url })
  } catch (err) { next(err) }
})

// POST /api/stripe/webhook — recebe eventos do Stripe
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret)
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { tenantId, plan } = session.metadata
    await supabase.from('tenants').update({
      plan,
      stripe_subscription_id: session.subscription,
      plan_expires_at: null,
    }).eq('id', tenantId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const { data: tenant } = await supabase
      .from('tenants').select('id').eq('stripe_subscription_id', sub.id).single()
    if (tenant) {
      await supabase.from('tenants').update({
        plan: 'trial',
        stripe_subscription_id: null,
        plan_expires_at: null,
      }).eq('id', tenant.id)
    }
  }

  res.json({ received: true })
})

module.exports = router
