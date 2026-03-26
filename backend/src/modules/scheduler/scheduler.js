const cron = require("node-cron");
const supabase = require("../../config/db");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");
const { generateToken } = require("../portal/portal.routes");

async function runCollectionRules() {
  console.log(
    `[Scheduler] Iniciando régua de cobrança — ${new Date().toISOString()}`,
  );
  try {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("active", true);
    if (error) throw error;
    if (!tenants || tenants.length === 0) return;

    for (const tenant of tenants) {
      try {
        const { data: rules } = await supabase
          .from("collection_rules")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("active", true);

        if (!rules || rules.length === 0) continue;

        for (const rule of rules) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - rule.days_after_due);
          const dateStr = targetDate.toISOString().split("T")[0];

          const { data: debts } = await supabase
            .from("debts")
            .select("*, debtors(id, name, phone)")
            .eq("tenant_id", tenant.id)
            .in("status", ["pending", "negotiating"])
            .gte("due_date", `${dateStr}T00:00:00`)
            .lte("due_date", `${dateStr}T23:59:59`);

          if (!debts || debts.length === 0) continue;

          for (const debt of debts) {
            const debtor = debt.debtors;
            if (!debtor?.phone) continue;

            const today = new Date().toISOString().split("T")[0];
            const { data: existing } = await supabase
              .from("messages")
              .select("id")
              .eq("debtor_id", debtor.id)
              .eq("direction", "outbound")
              .gte("created_at", `${today}T00:00:00`)
              .limit(1);

            if (existing && existing.length > 0) continue;

            const fmt = (v) =>
              Number(v).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });
            const date = new Date(debt.due_date).toLocaleDateString("pt-BR");

            const portalToken = generateToken(debtor.id);
            const portalUrl = `${process.env.FRONTEND_URL}/portal?token=${portalToken}&id=${debtor.id}`;

            const message = rule.message_template
              .replace("{nome}", debtor.name)
              .replace("{valor}", fmt(debt.current_amount))
              .replace("{vencimento}", date)
              .replace("{dias}", rule.days_after_due)
              .replace("{portal}", portalUrl);

            await sendWhatsApp(
              tenant.id,
              debt.id,
              debtor.id,
              debtor.phone,
              message,
            );
            console.log(
              `[Scheduler] Enviado para ${debtor.name} (D+${rule.days_after_due})`,
            );
          }
        }
      } catch (err) {
        console.error(`[Scheduler] Erro tenant "${tenant.name}":`, err.message);
      }
    }
    console.log("[Scheduler] Régua concluída.");
  } catch (err) {
    console.error("[Scheduler] Erro geral:", err.message);
  }
}

function initScheduler() {
  cron.schedule("0 8 * * *", runCollectionRules, {
    timezone: "America/Sao_Paulo",
  });
  console.log("[Scheduler] Configurado: todo dia às 08:00 BRT");
}

module.exports = { initScheduler, runCollectionRules };
