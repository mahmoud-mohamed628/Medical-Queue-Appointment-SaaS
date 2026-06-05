import { WhatsAppLog } from "@/src/types";
import { MessageSquare, CheckCheck, Clock, ShieldAlert, Wifi, RefreshCw } from "lucide-react";

interface WhatsAppLogDrawerProps {
  logs: WhatsAppLog[];
  onResetSystem: () => void;
}

export default function WhatsAppLogDrawer({ logs, onResetSystem }: WhatsAppLogDrawerProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col h-full h-[32rem] lg:h-auto overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 text-white p-2 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              Twilio WhatsApp Logs
              <span className="inline-flex w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            </h3>
            <p className="text-xs text-slate-500">Flux d'envois Maroc (+212) • Sandbox</p>
          </div>
        </div>
        <button
          onClick={onResetSystem}
          title="Réinitialiser les données de démo"
          className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 text-xs text-emerald-800 flex items-start gap-2.5">
        <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Statut Webhook Twilio :</span> Lié de manière synchrone au moteur Express. Les réponses sont instantanées et optimisées pour le réseau mobile marocain (Maroc Telecom, Orange, Inwi).
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs text-slate-400">Aucun message généré pour le moment.</p>
          </div>
        ) : (
          logs.map((log) => {
            const isYourTurn = log.type === "YOUR_TURN";
            const isDelay = log.type === "DELAY_ALERT";
            return (
              <div
                key={log.id}
                className={`p-3 rounded-xl border transition-all ${
                  isYourTurn
                    ? "bg-amber-50/80 border-amber-200"
                    : isDelay
                    ? "bg-rose-50/80 border-rose-200"
                    : "bg-white border-slate-100 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                  <span className="font-semibold text-slate-700">TO: {log.receiverName}</span>
                  <span className="text-slate-400 font-mono">{log.phoneNumber}</span>
                </div>

                <div className="font-mono text-slate-600 text-xs bg-slate-900/5 p-2 rounded-lg leading-relaxed whitespace-pre-wrap font-ara">
                  {log.message}
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/50 text-[10px] text-slate-400">
                  <span className="bg-slate-200/55 px-1.5 py-0.5 rounded text-slate-600 uppercase font-medium">
                    {log.type}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span>Delivered</span>
                    <CheckCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 text-center">
        <span className="text-[10px] text-slate-400 block font-mono">
          © Twilio SMS & WhatsApp Gateway • Casablanca Hub
        </span>
      </div>
    </div>
  );
}
