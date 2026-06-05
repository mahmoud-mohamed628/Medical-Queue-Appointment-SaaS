import React, { useState, useEffect } from "react";
import { Doctor, Appointment, Queue, WhatsAppLog, Language } from "@/src/types";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import WhatsAppLogDrawer from "./components/WhatsAppLogDrawer";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, HeartPulse, User, Users, Globe, RefreshCw, 
  Settings, MessageSquare, ShieldCheck, PlayCircle, HelpCircle 
} from "lucide-react";

export default function App() {
  const [language, setLanguage] = useState<Language>("FR");
  const [persona, setPersona] = useState<"patient" | "admin">("patient");

  // Donnéés d'interface synchronisées en temps réel via l'EventSource SSE
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Record<string, Queue>>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppLog[]>([]);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Connexion Server-Sent Events (SSE) pour mises à jour instantanées
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    function connectSSE() {
      // Pour éviter les boucles infinies de reconnexion, on gère proprement
      eventSource = new EventSource("/api/queues/live-events");
      
      eventSource.onopen = () => {
        setIsConnected(true);
        console.log("SSE Connection to raw queue engine established.");
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.doctors) {
            setDoctors(payload.doctors);
          }
          if (payload.queues) {
            setQueues(payload.queues);
          } else if (payload.doctorId && payload.queue) {
            setQueues(prev => ({
              ...prev,
              [payload.doctorId]: payload.queue
            }));
          }
          if (payload.appointments) {
            setAppointments(payload.appointments);
          }
          if (payload.logs) {
            setWhatsAppLogs(payload.logs);
          }
        } catch (err) {
          console.error("Failed to parse SSE payload", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE Connection lost. Retrying standard fetching...", err);
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        // Tentative de reconnexion après 5 secondes
        setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    // Nettoyage au démontage
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Actions de l'application liées à l'Express Backend
  const onBookAppointment = async (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    dateTime: string;
    notes: string;
  }) => {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la réservation.");
  };

  const onCheckInWalkIn = async (data: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
  }) => {
    const res = await fetch(`/api/queues/${data.doctorId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName: data.patientName,
        patientPhone: data.patientPhone,
      }),
    });
    if (!res.ok) throw new Error("Erreur de check-in.");
  };

  const onConfirmAppointment = async (id: string) => {
    const res = await fetch(`/api/appointments/${id}/confirm`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Erreur lors de la confirmation.");
  };

  const onCallNext = async (doctorId: string) => {
    const res = await fetch(`/api/queues/${doctorId}/next`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Erreur lors du passage au suivant.");
  };

  const onDeclareDelay = async (doctorId: string, minutes: number) => {
    const res = await fetch(`/api/queues/${doctorId}/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) throw new Error("Erreur lors de la déclaration du retard.");
  };

  const onMarkMissed = async (doctorId: string, entryId: string) => {
    const res = await fetch(`/api/queues/${doctorId}/entries/${entryId}/missed`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Erreur de marquage d'absence.");
  };

  const onRequeue = async (doctorId: string, entryId: string) => {
    const res = await fetch(`/api/queues/${doctorId}/entries/${entryId}/requeue`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Erreur de ré-inscription.");
  };

  const onResetSystem = async () => {
    setIsResetting(true);
    try {
      await fetch("/api/system/reset", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsResetting(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-x-hidden antialiased">
      
      {/* BARRE DE NAVIGATION PRINCIPALE (EN ENTÊTE) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* LOGO & NOM DU SAAS */}
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 text-emerald-400 p-2 rounded-xl flex items-center justify-center shadow-xs">
              <HeartPulse className="w-5 h-5 pulse-slow" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                Chifaâ <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-semibold">Maroc</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Medical Queue & Booking SaaS</p>
            </div>
          </div>

          {/* SÉLECTEUR DE PERSONA (TABLEAU DE BORD DOUBLE) */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setPersona("patient")}
              className={`px-3 focus:outline-hidden py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                persona === "patient"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Espace Patient</span>
            </button>
            <button
              onClick={() => setPersona("admin")}
              className={`px-3 focus:outline-hidden py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                persona === "admin"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Médecin / Secrétaire</span>
            </button>
          </div>

          {/* SÉLECTEUR DU BILINGUISME (FRANÇAIS/ARABE) & SYNC STATE */}
          <div className="flex items-center gap-3">
            
            {/* Indicateur de connectivité SSE */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-[10px] text-slate-500 font-mono">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
              <span>{isConnected ? "Temps réel actif" : "Déconnecté"}</span>
            </div>

            {/* Toggle FR / AR */}
            <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
              <button
                onClick={() => setLanguage("FR")}
                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  language === "FR" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage("AR")}
                className={`px-2 py-1 rounded text-[10px] font-bold font-ara cursor-pointer transition-colors ${
                  language === "AR" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                عربي
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* BANNER D'ORIENTATION LOCALE (CONTEXTE MAROCAIN) */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white py-8 px-4 border-b border-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/10">
                Cabinet Connecté & Innovant
              </span>
              <span className="text-[10px] font-semibold text-slate-400">• Casablanca • Rabat • Marrakech • Fès • Tanger</span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1.5 flex items-center gap-2">
              {persona === "patient" ? (
                <>Prenez vos Rendez-vous & Suivez votre Tour en Direct</>
              ) : (
                <>Tableau de Bord Administratif & Moteur de File d'Attente</>
              )}
            </h2>
            <p className="text-slate-300 text-xs mt-1 font-medium max-w-2xl">
              Spécifiquement conçu pour éliminer l'engorgement des salles d'attente marocaines. 
              {persona === "patient" 
                ? " Réservez en ligne, arrivez pile à l'heure grâce à l'estimation en temps réel calculée par l'algorithme." 
                : " Assurez la fluidité des visites, validez les réservations, signalez d'éventuels retards médicaux et relancez les patients par WhatsApp."}
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={onResetSystem}
              disabled={isResetting}
              className="bg-white/10 hover:bg-white/15 active:bg-white/20 text-white disabled:opacity-50 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              <span>Réinitialiser Démo</span>
            </button>
          </div>
        </div>
      </section>

      {/* ZONE PRINCIPALE DE L'APPLICATION (GRILLE SAAS DOUBLE COLONNE) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* SECTION CONTROLES & VIEWS : 3 colonnes de large */}
          <div className="xl:col-span-3">
            <AnimatePresence mode="wait">
              {persona === "patient" ? (
                <motion.div
                  key="patient"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <PatientPortal
                    doctors={doctors}
                    queues={queues}
                    appointments={appointments}
                    language={language}
                    onBookAppointment={onBookAppointment}
                    onCheckInWalkIn={onCheckInWalkIn}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <AdminPortal
                    doctors={doctors}
                    queues={queues}
                    appointments={appointments}
                    language={language}
                    onConfirmAppointment={onConfirmAppointment}
                    onCallNext={onCallNext}
                    onDeclareDelay={onDeclareDelay}
                    onMarkMissed={onMarkMissed}
                    onRequeue={onRequeue}
                    onAddManualWalkin={async (doctorId, name, phone) => {
                      await onCheckInWalkIn({ doctorId, patientName: name, patientPhone: phone });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION DROITE : WHATSAPP LOG DRAWER - 1 colonne de large */}
          <div className="xl:col-span-1">
            <WhatsAppLogDrawer 
              logs={whatsAppLogs} 
              onResetSystem={onResetSystem}
            />
          </div>

        </div>
      </main>

      {/* FOOTER DESCRIPTIF TECHNIQUE */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-700">Prototype d'Architecture SaaS - Chifaâ Maroc</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xl mx-auto">
            Next.js / Vite (React 19) • Node.js Backend • PostgreSQL (Prisma ORM) • Twilio WhatsApp API. 
            Mises à jour instantanées de la file d'attente gérées par les émetteurs d'événements SSE.
          </p>
        </div>
      </footer>

    </div>
  );
}
