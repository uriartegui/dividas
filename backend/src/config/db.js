const { createClient } = require('@supabase/supabase-js')
const env = require('./env')

const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
})

module.exports = supabase
