const cron = require('node-cron')
const supabase = require('../../config/db')
const { runCollection } = require('../collections/collection.service')

async function runDailyCollection() {
  console.log(`[Scheduler] Iniciando cobrança automática — ${new Date().toISOString()}`)
  try {
    const { data: tenants, error } = await supabase
      .from('tenants').select('id, name').eq('active', true)
    if (error) throw error
    if (!tenants || tenants.length === 0) {
      console.log('[Scheduler] Nenhum tenant ativo.')
      return
    }
    let totalProcessed = 0
    for (const tenant of tenants) {
      try {
        const result = await runCollection(tenant.id)
        totalProcessed += result.processed
        if (result.processed > 0)
          console.log(`[Scheduler] "${tenant.name}": ${result.processed} dívida(s)`)
      } catch (err) {
        console.error(`[Scheduler] Erro tenant "${tenant.name}":`, err.message)
      }
    }
    console.log(`[Scheduler] Concluído. Total: ${totalProcessed} dívida(s)`)
  } catch (err) {
    console.error('[Scheduler] Erro geral:', err.message)
  }
}

function initScheduler() {
  cron.schedule('0 8 * * *', runDailyCollection, { timezone: 'America/Sao_Paulo' })
  console.log('[Scheduler] Configurado: todo dia às 08:00 BRT')
}

module.exports = { initScheduler, runDailyCollection }
