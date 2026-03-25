const router = require("express").Router();
const auth = require("../../middlewares/auth.middleware");
const supabase = require("../../config/db");
const ExcelJS = require("exceljs");

router.use(auth);

// GET /api/export/debts — exporta dívidas em Excel
router.get("/debts", async (req, res, next) => {
  try {
    const { data: debts, error } = await supabase
      .from("debts")
      .select("*, debtors(name, cpf, phone, email)")
      .eq("tenant_id", req.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const wb = new ExcelJS.Workbook();
    wb.creator = "SaaS Cobranças";
    const ws = wb.addWorksheet("Dívidas");

    ws.columns = [
      { header: "Devedor", key: "devedor", width: 28 },
      { header: "CPF", key: "cpf", width: 18 },
      { header: "Telefone", key: "telefone", width: 18 },
      { header: "Descrição", key: "descricao", width: 30 },
      { header: "Valor (R$)", key: "valor", width: 14 },
      { header: "Vencimento", key: "vencimento", width: 14 },
      { header: "Status", key: "status", width: 14 },
    ];

    // Estilo do cabeçalho
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const statusMap = {
      pending: "Pendente",
      negotiating: "Negociando",
      agreed: "Acordado",
      paid: "Pago",
      cancelled: "Cancelado",
    };

    debts.forEach((d) => {
      ws.addRow({
        devedor: d.debtors?.name || "—",
        cpf: d.debtors?.cpf || "—",
        telefone: d.debtors?.phone || "—",
        descricao: d.description,
        valor: Number(d.current_amount),
        vencimento: d.due_date
          ? new Date(d.due_date).toLocaleDateString("pt-BR")
          : "—",
        status: statusMap[d.status] || d.status,
      });
    });

    // Formata coluna de valor como moeda
    ws.getColumn("valor").numFmt = "R$ #,##0.00";

    // Zebra nas linhas
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNumber % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF" },
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", 'attachment; filename="dividas.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// GET /api/export/debtors — exporta devedores em Excel
router.get("/debtors", async (req, res, next) => {
  try {
    const { data: debtors, error } = await supabase
      .from("debtors")
      .select("*")
      .eq("tenant_id", req.tenantId)
      .eq("active", true)
      .order("name");
    if (error) throw error;

    const wb = new ExcelJS.Workbook();
    wb.creator = "SaaS Cobranças";
    const ws = wb.addWorksheet("Devedores");

    ws.columns = [
      { header: "Nome", key: "nome", width: 28 },
      { header: "CPF", key: "cpf", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Telefone", key: "telefone", width: 18 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    debtors.forEach((d) => {
      ws.addRow({
        nome: d.name,
        cpf: d.cpf || "—",
        email: d.email || "—",
        telefone: d.phone || "—",
      });
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNumber % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF" },
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="devedores.xlsx"',
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// GET /api/export/report/pdf — relatório de inadimplência em PDF
router.get("/report/pdf", async (req, res, next) => {
  try {
    const PDFDocument = require("pdfkit");

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", req.user.tenantId)
      .single();

    const { data: debts, error } = await supabase
      .from("debts")
      .select("*, debtors(name, cpf, phone)")
      .eq("tenant_id", req.user.tenantId)
      .in("status", ["pending", "negotiating"])
      .lt("due_date", new Date().toISOString())
      .order("due_date", { ascending: true });

    if (error) throw error;

    const fmt = (v) =>
      Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const today = new Date();

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="relatorio-inadimplencia.pdf"',
    );
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 70).fill("#1D4ED8");
    doc
      .fillColor("white")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Relatório de Inadimplência", 40, 20);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `${tenant?.name || "Clínica"} — Gerado em ${today.toLocaleDateString("pt-BR")}`,
        40,
        46,
      );

    // Métricas
    const total = debts.reduce((s, d) => s + Number(d.current_amount), 0);
    doc
      .fillColor("#111827")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Resumo", 40, 90);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#374151")
      .text(`Total de dívidas em atraso: ${debts.length}`, 40, 108)
      .text(`Valor total em aberto: ${fmt(total)}`, 40, 122);

    // Linha separadora
    doc
      .moveTo(40, 142)
      .lineTo(555, 142)
      .strokeColor("#E5E7EB")
      .lineWidth(1)
      .stroke();

    // Cabeçalho da tabela
    let y = 155;
    doc.rect(40, y, 515, 20).fill("#1D4ED8");
    doc
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Devedor", 45, y + 5)
      .text("CPF", 200, y + 5)
      .text("Vencimento", 300, y + 5)
      .text("Dias em atraso", 390, y + 5)
      .text("Valor", 480, y + 5);

    y += 22;

    debts.forEach((debt, i) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const bg = i % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
      doc.rect(40, y, 515, 18).fill(bg);

      const dueDate = new Date(debt.due_date);
      const daysLate = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      doc
        .fillColor("#111827")
        .fontSize(8)
        .font("Helvetica")
        .text(debt.debtors?.name || "—", 45, y + 4, { width: 150 })
        .text(debt.debtors?.cpf || "—", 200, y + 4)
        .text(dueDate.toLocaleDateString("pt-BR"), 300, y + 4)
        .text(`${daysLate} dias`, 390, y + 4)
        .text(fmt(debt.current_amount), 470, y + 4);

      y += 20;
    });

    // Rodapé
const footerY = doc.page.height - doc.page.margins.bottom - 20
doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#E5E7EB').lineWidth(1).stroke()
doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
  .text('Cobranças SaaS — Sistema de gestão de inadimplência', 40, footerY + 4, {
    align: 'center', width: 515, lineBreak: false
  });

    doc.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
