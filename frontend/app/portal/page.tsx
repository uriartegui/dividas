"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Debt {
  id: string;
  description: string;
  current_amount: number;
  due_date: string;
  status: string;
}

interface Debtor {
  id: string;
  name: string;
  cpf: string;
}

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const id = searchParams.get("id");

  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agreeing, setAgreeing] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) {
      setError("Link inválido.");
      setLoading(false);
      return;
    }
    api
      .get(`/portal/access?token=${token}&id=${id}`)
      .then((r) => {
        setDebtor(r.data.debtor);
        setDebts(r.data.debts);
      })
      .catch(() => setError("Link inválido ou expirado."))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function handleAgree(debtId: string, installments: number) {
    setAgreeing(`${debtId}-${installments}`);
    try {
      await api.post("/portal/agree", { token, id, debtId, installments });
      setDone(debtId);
      setDebts((prev) => prev.filter((d) => d.id !== debtId));
    } catch {
      alert("Erro ao registrar acordo. Tente novamente.");
    } finally {
      setAgreeing(null);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 font-semibold text-lg mb-2">
            Link inválido
          </p>
          <p className="text-gray-400 text-sm">
            Este link não é válido ou expirou. Entre em contato com nossa
            equipe.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-2xl font-bold text-white">Portal do Paciente</h1>
          <p className="text-gray-400 mt-1">
            Olá, <span className="text-white font-medium">{debtor?.name}</span>
          </p>
        </div>

        {done && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-green-400 font-semibold">
              ✅ Acordo registrado com sucesso!
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Você receberá uma confirmação pelo WhatsApp.
            </p>
          </div>
        )}

        {debts.length === 0 && !done && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">Nenhuma pendência em aberto.</p>
          </div>
        )}

        {debts.map((debt) => (
          <div
            key={debt.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4"
          >
            <div className="mb-4">
              <p className="text-white font-semibold">
                {debt.description || "Dívida em aberto"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Vencimento:{" "}
                {new Date(debt.due_date).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-red-400 text-2xl font-bold mt-2">
                {fmt(debt.current_amount)}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleAgree(debt.id, 1)}
                disabled={!!agreeing}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
              >
                {agreeing === `${debt.id}-1`
                  ? "Registrando..."
                  : `Pagar à vista — ${fmt(debt.current_amount)}`}
              </button>
              <button
                onClick={() => handleAgree(debt.id, 3)}
                disabled={!!agreeing}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
              >
                {agreeing === `${debt.id}-3`
                  ? "Registrando..."
                  : `Parcelar em 3x — ${fmt(debt.current_amount / 3)}/mês`}
              </button>
            </div>
          </div>
        ))}

        <p className="text-center text-gray-600 text-xs mt-8 pb-8">
          Dúvidas? Responda nossa mensagem no WhatsApp.
        </p>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <PortalContent />
    </Suspense>
  );
}
