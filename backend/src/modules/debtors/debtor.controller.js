const supabase = require('../../config/db')

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('debtors').select('*')
      .eq('tenant_id', req.tenantId).eq('active', true).order('name')
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('debtors').select('*')
      .eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
    if (error) return res.status(404).json({ error: 'Devedor não encontrado' })
    res.json(data)
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { name, cpf, email, phone, phone2, address, notes } = req.body
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
    const { data, error } = await supabase.from('debtors')
      .insert({ tenant_id: req.tenantId, name, cpf, email, phone, phone2, address, notes })
      .select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { name, cpf, email, phone, phone2, address, notes } = req.body
    const { data, error } = await supabase.from('debtors')
      .update({ name, cpf, email, phone, phone2, address, notes })
      .eq('id', req.params.id).eq('tenant_id', req.tenantId).select().single()
    if (error) return res.status(404).json({ error: 'Devedor não encontrado' })
    res.json(data)
  } catch (err) { next(err) }
}

exports.remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('debtors').update({ active: false })
      .eq('id', req.params.id).eq('tenant_id', req.tenantId)
    if (error) return res.status(404).json({ error: 'Devedor não encontrado' })
    res.json({ message: 'Devedor removido' })
  } catch (err) { next(err) }
}
