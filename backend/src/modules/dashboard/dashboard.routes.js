const router = require("express").Router();
const auth = require("../../middlewares/auth.middleware");
const supabase = require("../../config/db");

router.use(auth);

router.get("/metrics", async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const { data: debts } = await supabase
      .from("debts")
      .select("current_amount, status")
      .eq("tenant_id", tenantId);

    const { data: calls } = await supabase
      .from("calls")
      .select("outcome")
      .eq("tenant_id", tenantId);

    const { count: messagesCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "sent");

    const totalOpen =
      debts
        ?.filter((d) => ["pending", "negotiating"].includes(d.status))
        .reduce((acc, d) => acc + Number(d.current_amount), 0) || 0;

    const totalRecovered =
      debts
        ?.filter((d) => ["agreed", "paid"].includes(d.status))
        .reduce((acc, d) => acc + Number(d.current_amount), 0) || 0;

    const totalDebts = debts?.length || 0;
    const recoveredCount =
      debts?.filter((d) => ["agreed", "paid"].includes(d.status)).length || 0;
    const recoveryRate =
      totalDebts > 0 ? ((recoveredCount / totalDebts) * 100).toFixed(1) : 0;

    const totalCalls = calls?.length || 0;
    const successfulCalls =
      calls?.filter((c) =>
        ["accepted", "already_paid", "wants_installment"].includes(c.outcome),
      ).length || 0;

    const outcomeBreakdown =
      calls?.reduce((acc, c) => {
        acc[c.outcome] = (acc[c.outcome] || 0) + 1;
        return acc;
      }, {}) || {};

    res.json({
      totalOpen,
      totalRecovered,
      recoveryRate: Number(recoveryRate),
      totalDebts,
      recoveredCount,
      totalCalls,
      successfulCalls,
      messagesSent: messagesCount || 0,
      outcomeBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/monthly", async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const { data: debts } = await supabase
      .from("debts")
      .select("current_amount, status, created_at")
      .eq("tenant_id", tenantId);

    // Agrupa por mês (últimos 6 meses)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        aberto: 0,
        recuperado: 0,
      });
    }

    debts?.forEach((debt) => {
      const date = new Date(debt.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find((m) => m.key === key);
      if (!month) return;
      if (["agreed", "paid"].includes(debt.status)) {
        month.recuperado += Number(debt.current_amount);
      } else {
        month.aberto += Number(debt.current_amount);
      }
    });

    res.json(
      months.map(({ label, aberto, recuperado }) => ({
        label,
        aberto,
        recuperado,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/scores", async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const { data: debts } = await supabase
      .from("debts")
      .select(
        "id, current_amount, due_date, debtor_id, debtors(id, name, phone)",
      )
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "negotiating"]);

    if (!debts || debts.length === 0) return res.json([]);

    const debtorIds = [...new Set(debts.map((d) => d.debtor_id))];

    const { data: paidDebts } = await supabase
      .from("debts")
      .select("debtor_id")
      .eq("tenant_id", tenantId)
      .in("status", ["paid"])
      .in("debtor_id", debtorIds);

    const { data: fulfilledAgreements } = await supabase
      .from("agreements")
      .select("debtor_id")
      .eq("tenant_id", tenantId)
      .eq("status", "fulfilled")
      .in("debtor_id", debtorIds);

    const { data: inboundMessages } = await supabase
      .from("messages")
      .select("debtor_id")
      .eq("tenant_id", tenantId)
      .eq("direction", "inbound")
      .in("debtor_id", debtorIds);

    const paidCount = {};
    const agreementCount = {};
    const responded = new Set();
    const activeDebtsCount = {};

    paidDebts?.forEach((d) => {
      paidCount[d.debtor_id] = (paidCount[d.debtor_id] || 0) + 1;
    });
    fulfilledAgreements?.forEach((a) => {
      agreementCount[a.debtor_id] = (agreementCount[a.debtor_id] || 0) + 1;
    });
    inboundMessages?.forEach((m) => responded.add(m.debtor_id));
    debts.forEach((d) => {
      activeDebtsCount[d.debtor_id] = (activeDebtsCount[d.debtor_id] || 0) + 1;
    });

    const today = new Date();

    const debtorMap = {};
    debts.forEach((debt) => {
      if (
        !debtorMap[debt.debtor_id] ||
        new Date(debt.due_date) < new Date(debtorMap[debt.debtor_id].due_date)
      ) {
        debtorMap[debt.debtor_id] = debt;
      }
    });

    const scored = Object.values(debtorMap).map((debt) => {
      const daysOverdue = Math.floor(
        (today - new Date(debt.due_date)) / (1000 * 60 * 60 * 24),
      );
      const id = debt.debtor_id;

      let score = 50;
      if (paidCount[id] > 0) score += 20;
      if (agreementCount[id] > 0) score += 10;
      if (responded.has(id)) score += 15;
      if (daysOverdue <= 30) score += 10;
      else if (daysOverdue <= 60) score -= 5;
      else if (daysOverdue <= 90) score -= 15;
      else score -= 25;
      if (activeDebtsCount[id] > 1) score -= 10;
      score = Math.max(0, Math.min(100, score));

      return {
        debtorId: id,
        debtorName: debt.debtors?.name || "—",
        phone: debt.debtors?.phone,
        score,
        daysOverdue: Math.max(0, daysOverdue),
        amount: debt.current_amount,
        activeDebts: activeDebtsCount[id] || 1,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json(scored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
