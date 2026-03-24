const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./modules/auth/auth.routes')
const debtorRoutes = require('./modules/debtors/debtor.routes')
const debtRoutes = require('./modules/debts/debt.routes')
const collectionRoutes = require('./modules/collections/collection.routes')
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes')
const dashboardRoutes = require('./modules/dashboard/dashboard.routes')
const aiRoutes = require('./modules/ai/ai.routes')

const app = express()

app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://dividas-frontend.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}))
app.use(express.json())

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições, tente novamente em 15 minutos' }
}))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRoutes)
app.use('/api/debtors', debtorRoutes)
app.use('/api/debts', debtRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/ai', aiRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno' })
})

module.exports = app
