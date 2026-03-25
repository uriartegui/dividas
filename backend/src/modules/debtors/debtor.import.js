const multer = require('multer')
const { parse } = require('csv-parse')
const supabase = require('../../config/db')

// Multer: armazena em memória (sem salvar em disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos .csv são aceitos'))
    }
  }
})

const importCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const csvText = req.file.buffer.toString('utf-8')

    // Parse do CSV
    const rows = await new Promise((resolve, reject) => {
      parse(csvText, {
        columns: true,          // primeira linha = cabeçalho
        skip_empty_lines: true,
        trim: true,
        bom: true               // remove BOM do Excel
      }, (err, records) => {
        if (err) reject(err)
        else resolve(records)
      })
    })

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem dados' })
    }

    const results = { inserted: 0, skipped: 0, errors: [] }

    for (const [i, row] of rows.entries()) {
      // Aceita variações de cabeçalho (nome/Nome/NOME, cpf/CPF, etc.)
      const name  = row.nome  || row.Nome  || row.NOME  || row.name  || ''
      const cpf   = row.cpf   || row.CPF   || ''
      const email = row.email || row.Email || row.EMAIL || ''
      const phone = row.telefone || row.Telefone || row.TELEFONE || row.phone || row.celular || ''

      if (!name) {
        results.errors.push({ linha: i + 2, erro: 'Nome obrigatório' })
        continue
      }

      const { error } = await supabase.from('debtors').insert({
        tenant_id: req.tenantId,
        name,
        cpf:   cpf   || null,
        email: email || null,
        phone: phone || null
      })

      if (error) {
        results.errors.push({ linha: i + 2, erro: error.message })
      } else {
        results.inserted++
      }
    }

    results.skipped = rows.length - results.inserted - results.errors.length

    res.status(207).json({
      message: `Importação concluída: ${results.inserted} inseridos, ${results.errors.length} com erro`,
      ...results
    })

  } catch (err) {
    next(err)
  }
}

module.exports = { upload, importCSV }
