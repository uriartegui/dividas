const { Resend } = require("resend");
const supabase = require("../../config/db");

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyAgreementCreated({
  tenantId,
  debtorName,
  totalAmount,
  installments,
  channel,
}) {
  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email")
      .eq("id", tenantId)
      .single();

    if (!tenant?.email) return;

    const fmt = (v) =>
      Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const channelLabel =
      channel === "whatsapp" ? "WhatsApp" : "Portal do Paciente";
    const installmentText =
      installments === 1
        ? `À vista — ${fmt(totalAmount)}`
        : `${installments}x de ${fmt(totalAmount / installments)} (total: ${fmt(totalAmount)})`;

    await resend.emails.send({
      from: "Cobranças SaaS <onboarding@resend.dev>",
      to: tenant.email,
      subject: `✅ Novo acordo fechado — ${debtorName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#16A34A">✅ Acordo fechado automaticamente</h2>
          <p>Olá, <strong>${tenant.name}</strong>!</p>
          <p>Um novo acordo foi fechado via <strong>${channelLabel}</strong>:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#F3F4F6">
              <td style="padding:10px;font-weight:bold">Paciente</td>
              <td style="padding:10px">${debtorName}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:bold">Acordo</td>
              <td style="padding:10px">${installmentText}</td>
            </tr>
            <tr style="background:#F3F4F6">
              <td style="padding:10px;font-weight:bold">Canal</td>
              <td style="padding:10px">${channelLabel}</td>
            </tr>
          </table>
          <p style="color:#6B7280;font-size:12px">Acesse o painel para acompanhar o acordo.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Notifications] Erro ao enviar email:", err.message);
  }
}

module.exports = { notifyAgreementCreated };
