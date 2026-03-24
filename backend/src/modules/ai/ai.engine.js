const flows = {
  greeting: {
    message: (name, amount) =>
      `Olá ${name}, identificamos uma pendência de ${formatCurrency(amount)}. Podemos resolver hoje?`,
    options: ['sim', 'nao', 'ja_paguei', 'parcelar'],
    next: {
      sim: 'accepted',
      nao: 'cannot_pay',
      ja_paguei: 'already_paid',
      parcelar: 'installment_offer',
    },
  },

  cannot_pay: {
    message: () => `Entendemos! Podemos facilitar com parcelamento. Quer ver as opções?`,
    options: ['sim', 'nao'],
    next: {
      sim: 'installment_offer',
      nao: 'callback_requested',
    },
  },

  installment_offer: {
    message: (name, amount) => {
      const installment3 = formatCurrency(amount / 3)
      const installment6 = formatCurrency(amount / 6)
      return `Temos duas opções:\n1️⃣ 3x de ${installment3}\n2️⃣ 6x de ${installment6}\nQual prefere?`
    },
    options: ['3x', '6x', 'nenhuma'],
    next: {
      '3x': 'agreed_3x',
      '6x': 'agreed_6x',
      nenhuma: 'callback_requested',
    },
  },

  accepted: {
    message: (name, amount) =>
      `Ótimo! Aqui está seu link de pagamento: https://pagar.clinica.com.br/${randomCode()}\nValor: ${formatCurrency(amount)}`,
    options: [],
    next: {},
    terminal: true,
    outcome: 'accepted',
  },

  agreed_3x: {
    message: (name, amount) =>
      `Perfeito! Parcelamento em 3x de ${formatCurrency(amount / 3)} aprovado!\nLink: https://pagar.clinica.com.br/${randomCode()}`,
    options: [],
    next: {},
    terminal: true,
    outcome: 'wants_installment',
  },

  agreed_6x: {
    message: (name, amount) =>
      `Perfeito! Parcelamento em 6x de ${formatCurrency(amount / 6)} aprovado!\nLink: https://pagar.clinica.com.br/${randomCode()}`,
    options: [],
    next: {},
    terminal: true,
    outcome: 'wants_installment',
  },

  already_paid: {
    message: () =>
      `Obrigado pela informação! Vamos verificar o pagamento e atualizar seu cadastro em até 24h.`,
    options: [],
    next: {},
    terminal: true,
    outcome: 'already_paid',
  },

  callback_requested: {
    message: () =>
      `Sem problema! Entraremos em contato novamente em breve. Tenha um bom dia!`,
    options: [],
    next: {},
    terminal: true,
    outcome: 'callback_requested',
  },
}

function formatCurrency(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function randomCode() {
  return Math.random().toString(36).slice(2, 10)
}

function getStep(stepKey, debtorName, amount) {
  const step = flows[stepKey]
  if (!step) return null
  return {
    stepKey,
    message: step.message(debtorName, amount),
    options: step.options,
    terminal: step.terminal || false,
    outcome: step.outcome || null,
  }
}

function nextStep(currentStep, userInput) {
  const step = flows[currentStep]
  if (!step) return null
  return step.next[userInput] || null
}

module.exports = { getStep, nextStep, flows }
