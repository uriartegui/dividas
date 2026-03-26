const router = require("express").Router();
const auth = require("../../middlewares/auth.middleware");
const { runWhatsAppCampaign, replyWhatsApp } = require("./whatsapp.service");
const supabase = require("../../config/db");
const {
  notifyAgreementCreated,
} = require("../notifications/notifications.service");
const { negotiate } = require("../ai-negotiator/negotiator.service");

// ─── WEBHOOK (sem auth — Z-API chama direto) ────────────────────────────────
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Webhook recebido:", JSON.stringify(body).slice(0, 500));
    const phone = (body.phone || "").replace(/\D/g, "");
    const text =
      body.text?.message || body.image?.caption || body.audio?.caption || "";
    const fromMe = body.fromMe === true;

    console.log(`📞 phone=${phone} fromMe=${fromMe} text="${text}"`);

    if (!phone || !text) {
      console.log("⚠️ Ignorado: sem phone ou text");
      return res.sendStatus(200);
    }

    const phoneVariants = [
      phone,
      phone.startsWith("55") ? phone.slice(2) : phone,
      `55${phone}`,
    ];
    const orFilter = phoneVariants.map((p) => `phone.eq.${p}`).join(",");

    const { data: debtor, error: debtorError } = await supabase
      .from("debtors")
      .select("id, tenant_id, name, phone")
      .or(orFilter)
      .limit(1)
      .single();

    console.log(
      "👤 Devedor encontrado:",
      debtor,
      "Erro:",
      debtorError?.message,
    );
    if (!debtor) return res.sendStatus(200);

    // Salva mensagem inbound
    await supabase.from("messages").insert({
      tenant_id: debtor.tenant_id,
      debtor_id: debtor.id,
      direction: fromMe ? "outbound" : "inbound",
      channel: "whatsapp",
      content: text,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Detecção de intenção (apenas mensagens do devedor)
    if (!fromMe && debtor) {
      const { data: debt } = await supabase
        .from("debts")
        .select("id, current_amount, due_date, tenant_id")
        .eq("tenant_id", debtor.tenant_id)
        .eq("debtor_id", debtor.id)
        .in("status", ["pending", "negotiating"])
        .order("due_date", { ascending: true })
        .limit(1)
        .single();

      if (!debt) {
        const { replyWhatsApp } = require("./whatsapp.service");
        await replyWhatsApp(
          debtor.tenant_id,
          debtor.id,
          debtor.phone,
          `Olá, *${debtor.name}*! 😊 Não encontramos pendências em aberto no seu cadastro. Se precisar de mais informações, fale com nossa equipe. Obrigado!`,
        );
      } else if (process.env.ANTHROPIC_API_KEY) {
        try {
          const result = await negotiate({
            tenantId: debtor.tenant_id,
            debtorId: debtor.id,
            debtorName: debtor.name,
            debt,
            inboundMessage: text,
          });

          const { replyWhatsApp } = require("./whatsapp.service");
          const {
            notifyAgreementCreated,
          } = require("../notifications/notifications.service");

          const isAgreement = [
            "pay_full",
            "pay_installment_3x",
            "pay_installment_6x",
          ].includes(result.intent);

          if (isAgreement) {
            const installments =
              result.intent === "pay_installment_6x"
                ? 6
                : result.intent === "pay_installment_3x"
                  ? 3
                  : 1;
            const discount =
              result.intent === "pay_full" ? result.discount_pct || 0 : 0;
            const totalAmount =
              Number(debt.current_amount) * (1 - discount / 100);
            const installmentAmount = totalAmount / installments;
            const firstDue = new Date();
            firstDue.setDate(firstDue.getDate() + 3);

            const { data: agreement } = await supabase
              .from("agreements")
              .insert({
                tenant_id: debtor.tenant_id,
                debt_id: debt.id,
                debtor_id: debtor.id,
                total_amount: totalAmount,
                discount_pct: discount,
                installments,
                first_due_date: firstDue.toISOString().split("T")[0],
                status: "active",
                channel: "whatsapp",
                notes: `Acordo fechado pela IA negociadora (D+${result.daysOverdue})`,
              })
              .select()
              .single();

            if (agreement) {
              const parcelas = [];
              for (let i = 0; i < installments; i++) {
                const due = new Date(firstDue);
                due.setMonth(due.getMonth() + i);
                parcelas.push({
                  tenant_id: debtor.tenant_id,
                  agreement_id: agreement.id,
                  installment_num: i + 1,
                  amount: installmentAmount,
                  due_date: due.toISOString().split("T")[0],
                });
              }
              await supabase.from("agreement_installments").insert(parcelas);
              await supabase
                .from("debts")
                .update({ status: "agreed" })
                .eq("id", debt.id);

              await notifyAgreementCreated({
                tenantId: debtor.tenant_id,
                debtorName: debtor.name,
                totalAmount,
                installments,
                channel: "whatsapp",
              });

              console.log(
                `🤝 IA fechou acordo com ${debtor.name} (${installments}x, ${discount}% desconto)`,
              );
            }
          }

          // Envia resposta da IA para o paciente
          await replyWhatsApp(
            debtor.tenant_id,
            debtor.id,
            debtor.phone,
            result.message,
          );
          console.log(
            `🤖 IA respondeu para ${debtor.name}: intent=${result.intent}`,
          );
        } catch (err) {
          console.error("AI negotiator error:", err.message);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

// ─── Rotas autenticadas ──────────────────────────────────────────────────────
router.use(auth);

// Listar conversas (último msg por devedor)
router.get("/conversations", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*, debtors(id, name, phone)")
      .eq("tenant_id", req.tenantId)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    // Deduplica por devedor_id mantendo a msg mais recente
    const seen = new Set();
    const conversations = [];
    for (const msg of data) {
      if (!msg.debtor_id || seen.has(msg.debtor_id)) continue;
      seen.add(msg.debtor_id);
      conversations.push(msg);
    }

    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Mensagens de um devedor específico
router.get("/conversations/:debtorId", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("tenant_id", req.tenantId)
      .eq("debtor_id", req.params.debtorId)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Responder para um devedor
router.post("/reply", async (req, res, next) => {
  try {
    const { debtorId, message } = req.body;
    if (!debtorId || !message)
      return res.status(400).json({ error: "debtorId e message obrigatórios" });

    const { data: debtor, error } = await supabase
      .from("debtors")
      .select("id, name, phone")
      .eq("id", debtorId)
      .eq("tenant_id", req.tenantId)
      .single();

    if (error || !debtor)
      return res.status(404).json({ error: "Devedor não encontrado" });
    if (!debtor.phone)
      return res.status(400).json({ error: "Devedor sem telefone cadastrado" });

    const result = await replyWhatsApp(
      req.tenantId,
      debtor.id,
      debtor.phone,
      message,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Disparar campanha
router.post("/send", async (req, res, next) => {
  try {
    const result = await runWhatsAppCampaign(req.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Listar mensagens (legado)
router.get("/messages", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*, debtors(name, phone)")
      .eq("tenant_id", req.tenantId)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
