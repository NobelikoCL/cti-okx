import { useState } from "react";
import { useTelegramStatus, useTestTelegram, useSendAllUnsent } from "../hooks/useSignals";

export default function TelegramPanel() {
  const { data: status } = useTelegramStatus();
  const testMutation = useTestTelegram();
  const sendAllMutation = useSendAllUnsent();

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    const ok = await testMutation.mutateAsync({ token: token || undefined, chatId: chatId || undefined });
    setTestResult(ok);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📱</span>
        <div>
          <h2 className="text-base font-semibold text-white">Telegram</h2>
          <p className="text-xs text-gray-400">Envío de señales por bot</p>
        </div>
        <div className="ml-auto">
          {status?.configured ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
              Configurado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full inline-block" />
              Sin configurar
            </span>
          )}
        </div>
      </div>

      {status?.configured && (
        <p className="text-xs text-gray-400">
          Chat ID activo: <code className="text-gray-200">{status.chat_id}</code>
        </p>
      )}

      {/* Test with custom credentials */}
      <div className="space-y-2 border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-400 font-medium">Probar conexión (opcional)</p>
        <input
          type="text"
          placeholder="Bot Token (vacío = usa .env)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Chat ID (vacío = usa .env)"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleTest}
          disabled={testMutation.isPending}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {testMutation.isPending ? "Enviando…" : "Enviar mensaje de prueba"}
        </button>

        {testResult !== null && (
          <p className={`text-sm text-center font-medium ${testResult ? "text-emerald-400" : "text-red-400"}`}>
            {testResult ? "✓ Mensaje enviado correctamente" : "✗ Error al enviar — verifica las credenciales"}
          </p>
        )}
      </div>

      {/* Send all unsent */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => sendAllMutation.mutate()}
          disabled={sendAllMutation.isPending}
          className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {sendAllMutation.isPending
            ? "Enviando…"
            : `📤 Enviar todas las señales pendientes`}
        </button>
        {sendAllMutation.isSuccess && (
          <p className="text-xs text-center text-emerald-400 mt-2">
            {sendAllMutation.data.count} señales encoladas
          </p>
        )}
      </div>
    </div>
  );
}
