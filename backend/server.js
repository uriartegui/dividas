require('dotenv').config()
const app = require('./src/app')
const env = require('./src/config/env')

app.listen(env.port, () => {
  console.log(`Servidor rodando na porta ${env.port} [${env.nodeEnv}]`)
})
