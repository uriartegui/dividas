"use client";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ReportsPage() {
  async function downloadPDF() {
    try {
      toast.loading("Gerando relatório...", { id: "pdf" });
      const response = await api.get("/export/report/pdf", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-inadimplencia.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado!", { id: "pdf" });
    } catch {
      toast.error("Erro ao gerar relatório", { id: "pdf" });
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">📄 Relatórios</h1>
      <p className="text-gray-400 mb-8">
        Exporte relatórios em PDF para análise e apresentação.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-white font-semibold text-lg mb-2">
            Relatório de Inadimplência
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Lista completa de dívidas vencidas com devedor, CPF, dias em atraso
            e valor. Ideal para apresentar para a diretoria ou cobrar ação.
          </p>
          <button
            onClick={downloadPDF}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            📥 Baixar PDF
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 opacity-50">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-white font-semibold text-lg mb-2">
            Relatório de Acordos
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Histórico de acordos firmados, valores negociados e status de
            pagamento.
          </p>
          <button
            disabled
            className="w-full bg-gray-600 text-gray-400 font-medium py-2.5 rounded-lg cursor-not-allowed"
          >
            Em breve
          </button>
        </div>
      </div>
    </div>
  );
}
