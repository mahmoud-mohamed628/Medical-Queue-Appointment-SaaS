import React, { useState } from "react";
import { Doctor, Appointment, Queue, Language, QueueEntry } from "@/src/types";
import { 
  Users, UserCheck, Play, CheckCircle, Clock, Volume2, Shield, Calendar,
  AlertTriangle, Phone, MoreVertical, Ban, RefreshCw, Plus, Check, ArrowRight
} from "lucide-react";

interface AdminPortalProps {
  doctors: Doctor[];
  queues: Record<string, Queue>;
  appointments: Appointment[];
  language: Language;
  onConfirmAppointment: (id: string) => Promise<void>;
  onCallNext: (doctorId: string) => Promise<void>;
  onDeclareDelay: (doctorId: string, minutes: number) => Promise<void>;
  onMarkMissed: (doctorId: string, entryId: string) => Promise<void>;
  onRequeue: (doctorId: string, entryId: string) => Promise<void>;
  onAddManualWalkin: (doctorId: string, name: string, phone: string) => Promise<void>;
}

export default function AdminPortal({
  doctors,
  queues,
  appointments,
  language,
  onConfirmAppointment,
  onCallNext,
  onDeclareDelay,
  onMarkMissed,
  onRequeue,
  onAddManualWalkin,
}: AdminPortalProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>("doc-1");
  const [delayMinutes, setDelayMinutes] = useState<number>(20);
  
  // États d'ajout de patient direct par le secrétariat
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const activeDoc = doctors.find((d) => d.id === selectedDocId) || doctors[0];
  const queue = queues[selectedDocId] || { doctorId: selectedDocId, status: "NOT_STARTED", currentNumber: 0, totalTickets: 0, entries: [] };
  
  // Filtrer les rendez-vous d'aujourd'hui pour ce médecin
  const pendingAppointments = appointments.filter((a) => a.doctorId === selectedDocId && a.status === "PENDING");
  const validatedAppointments = appointments.filter((a) => a.doctorId === selectedDocId && a.status === "CONFIRMED");

  // Patients actuellement dans la file d'attente
  const waitingEntries = queue.entries.filter((e) => e.status === "WAITING");
  const currentServing = queue.entries.find((e) => e.status === "SERVING");
  const completedEntries = queue.entries.filter((e) => e.status === "COMPLETED");
  const missedEntries = queue.entries.filter((e) => e.status === "MISSED");

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualPhone) return;
    try {
      await onAddManualWalkin(selectedDocId, manualName, manualPhone);
      setManualName("");
      setManualPhone("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* SÉLECTEUR DE MÉDECIN / PROFIL ACTIF */}
      <div className="col-span-12 bg-white p-4 border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Gestion Clinique & Secrétariat</h3>
            <p className="text-xs text-slate-500">Choisissez le cabinet médical à administrer en direct</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {doctors.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedDocId === doc.id
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {doc.name}
            </button>
          ))}
        </div>
      </div>

      {/* COLONNE GAUCHE (7/12) : Salle d'Attente Interactive & Contrôles */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* BOITE DE PILOTAGE DE FIL (MOTEUR TEMPS RÉEL) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Contrôle de File d'Attente</h4>
              <p className="text-xs text-slate-500">Mettez à jour le statut et alertez les patients sur WhatsApp</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                File active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Boite 1 : Appel Patient Suivant */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between h-40">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Prochain patient</span>
                <h5 className="font-semibold text-xs text-slate-300 mt-1">Avancement automatique</h5>
              </div>

              {waitingEntries.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-400 mb-2">
                    Suivant : <strong>{waitingEntries[0].patientName}</strong> (Ticket #{waitingEntries[0].ticketNumber})
                  </p>
                  <button
                    onClick={() => onCallNext(selectedDocId)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Appeler Suivant
                  </button>
                </div>
              ) : (
                <div className="text-slate-400 text-xs py-2 text-center border border-dashed border-slate-800 rounded bg-slate-900/40">
                  Aucun patient en attente
                </div>
              )}
            </div>

            {/* Boite 2 : En Cours de Soin */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-40">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">En consultation 🩺</span>
                {currentServing ? (
                  <div className="mt-2">
                    <div className="text-lg font-mono font-bold text-slate-900">
                      Ticket #{currentServing.ticketNumber}
                    </div>
                    <p className="text-xs text-slate-700 truncate">{currentServing.patientName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{currentServing.patientPhone}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-4 italic">Aucun patient installé actuellement</p>
                )}
              </div>

              {currentServing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onMarkMissed(selectedDocId, currentServing.id)}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold py-1.5 px-2 rounded-lg transition-colors cursor-pointer border border-rose-100"
                  >
                    Absent (No-Show)
                  </button>
                  <button
                    onClick={() => onCallNext(selectedDocId)}
                    className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-semibold py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Terminer RDV
                  </button>
                </div>
              )}
            </div>

            {/* Boite 3 : Signaler un retard */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-40">
              <div>
                <span className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alerte Retard Général
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Prévenir instantanément par WhatsApp les patients attendus.</p>
              </div>

              <div>
                <div className="flex gap-1.5 mb-2">
                  {[15, 30, 45].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDelayMinutes(m)}
                      className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${
                        delayMinutes === m ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      +{m} min
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onDeclareDelay(selectedDocId, delayMinutes)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  Bulk Alerte Retard
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* LISTE DES TICKETS DE LA SALLE D'ATTENTE */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Registre d'aujourd'hui ({queue.entries.length} inscrits)</h4>
              <p className="text-xs text-slate-500">Tous les tickets du jour classés par heure d'intégration</p>
            </div>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Inscrire Walk-in
            </button>
          </div>

          {/* Formulaire ajout direct secrétaire */}
          {showAddForm && (
            <form onSubmit={handleManualAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3 mb-4 grid grid-cols-1 md:grid-cols-12 items-end">
              <div className="md:col-span-5">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Nom du patient</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Omar Mansouri"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Téléphone portable (+212)</label>
                <input
                  required
                  type="tel"
                  placeholder="Ex: 0663121212"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg cursor-pointer hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          )}

          {/* Liste dynamique */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {queue.entries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Aucun patient inscrit dans la file du jour pour le moment.
              </div>
            ) : (
              queue.entries.map((entry) => {
                const isServing = entry.status === "SERVING";
                const isWaiting = entry.status === "WAITING";
                const isMissed = entry.status === "MISSED";
                const isCompleted = entry.status === "COMPLETED";

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors ${
                      isServing
                        ? "bg-slate-900 border-slate-900 text-white"
                        : isMissed
                        ? "bg-rose-50/50 border-rose-100"
                        : "bg-white border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg font-mono font-bold flex items-center justify-center text-sm ${
                        isServing
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        #{entry.ticketNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className={`font-semibold text-xs ${isServing ? "text-white" : "text-slate-800"}`}>
                            {entry.patientName}
                          </h5>
                          {entry.appointmentId && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase">
                              RDV en Ligne
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-mono ${isServing ? "text-slate-400" : "text-slate-500"}`}>
                          📱 {entry.patientPhone} • Arrivé à : {new Date(entry.checkInAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      {/* Statut label */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isServing
                          ? "bg-emerald-500/20 text-emerald-300"
                          : isWaiting
                          ? "bg-slate-100 text-slate-600"
                          : isMissed
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {entry.status}
                      </span>

                      {/* Actions */}
                      {isWaiting && (
                        <button
                          onClick={() => onMarkMissed(selectedDocId, entry.id)}
                          className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold px-2 py-1.5 rounded-lg cursor-pointer"
                        >
                          Déclarer Absent
                        </button>
                      )}

                      {isMissed && (
                        <button
                          onClick={() => onRequeue(selectedDocId, entry.id)}
                          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] font-bold px-2 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Ré-inscrire
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* COLONNE DROITE (4/12) : Calendrier & Demandes de RDV */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* DEMANDES DE RDV EN LATTENTE (CONFIRMATION EN 1 CLIC) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <h4 className="font-bold text-slate-900 text-sm">Demandes de RDV ({pendingAppointments.length})</h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg">
            La validation automatique émet un ticket et envoie une alerte WhatsApp Twilio bilingue.
          </p>

          <div className="space-y-3">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Aucune demande en attente
              </div>
            ) : (
              pendingAppointments.map((appt) => (
                <div key={appt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs">{appt.patientName}</h5>
                      <span className="font-mono text-[10px] text-slate-500 block">{appt.patientPhone}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                      PENDING
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    🕒 Prévu le : <strong>{new Date(appt.dateTime).toLocaleDateString("fr-FR")} à {new Date(appt.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
                  </p>

                  {appt.notes && (
                    <div className="bg-white p-2 rounded text-[10px] text-slate-500">
                      📝 {appt.notes}
                    </div>
                  )}

                  <button
                    onClick={() => onConfirmAppointment(appt.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Valider & Assigner Ticket
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HISTORIQUE DE RDV CONFIRMÉS AUJOURD'HUI */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs mb-3">RDV Confirmés / Agenda ({validatedAppointments.length})</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {validatedAppointments.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">Aucun rendez-vous sur l'agenda aujourd'hui.</p>
            ) : (
              validatedAppointments.map((appt) => (
                <div key={appt.id} className="text-xs p-2.5 bg-slate-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">{appt.patientName}</span>
                    <span className="text-[10px] text-slate-500">Hour: {new Date(appt.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {appt.ticketNumber && (
                    <span className="bg-slate-900 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded text-xs">
                      #{appt.ticketNumber}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
