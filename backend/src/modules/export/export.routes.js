const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')
const ExcelJS = require('exceljs')

router.use(auth)

// GET /api/export/debts — exporta dívidas em Excel
router.get('/debts', async (req, res, next) => {
  try {
    const { data: debts, error } = await supabase
      .from('debts')
      .select('*, debtors(name, cpf, phone, email)')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const wb = new ExcelJS.Workbook()
    wb.creator = 'SaaS Cobranças'
    const ws = wb.addWorksheet('Dívidas')

    ws.columns = [
      { header: 'Devedor',      key: 'devedor',    width: 28 },
      { header: 'CPF',          key: 'cpf',        width: 18 },
      { header: 'Telefone',     key: 'telefone',   width: 18 },
      { header: 'Descrição',    key: 'descricao',  width: 30 },
      { header: 'Valor (R$)',   key: 'valor',      width: 14 },
      { header: 'Vencimento',   key: 'vencimento', width: 14 },
      { header: 'Status',       key: 'status',     width: 14 },
    ]

    // Estilo do cabeçalho
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    const statusMap = {
      pending: 'Pendente', negotiating: 'Negociando',
      agreed: 'Acordado', paid: 'Pago', cancelled: 'Cancelado',
    }

    debts.forEach(d => {
      ws.addRow({
        devedor:    d.debtors?.name    || '—',
        cpf:        d.debtors?.cpf     || '—',
        telefone:   d.debtors?.phone   || '—',
        descricao:  d.description,
        valor:      Number(d.current_amount),
        vencimento: d.due_date ? new Date(d.due_date).toLocaleDateString('pt-BR') : '—',
        status:     statusMap[d.status] || d.status,
      })
    })

    // Formata coluna de valor como moeda
    ws.getColumn('valor').numFmt = 'R$ #,##0.00'

    // Zebra nas linhas
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' },
        }
      })
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="dividas.xlsx"')
    await wb.xlsx.write(res)
    res.end()
  } catch (err) { next(err) }
})

// GET /api/export/debtors — exporta devedores em Excel
router.get('/debtors', async (req, res, next) => {
  try {
    const { data: debtors, error } = await supabase
      .from('debtors')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .eq('active', true)
      .order('name')
    if (error) throw error

    const wb = new ExcelJS.Workbook()
    wb.creator = 'SaaS Cobranças'
    const ws = wb.addWorksheet('Devedores')

    ws.columns = [
      { header: 'Nome',     key: 'nome',     width: 28 },
      { header: 'CPF',      key: 'cpf',      width: 18 },
      { header: 'Email',    key: 'email',    width: 28 },
      { header: 'Telefone', key: 'telefone', width: 18 },
    ]

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    debtors.forEach(d => {
      ws.addRow({ nome: d.name, cpf: d.cpf || '—', email: d.email || '—', telefone: d.phone || '—' })
    })

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' },
        }
      })
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="devedores.xlsx"')
    await wb.xlsx.write(res)
    res.end()
  } catch (err) { next(err) }
})

module.exports = router
