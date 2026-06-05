import React, { useState } from "react";
import { Doctor, Appointment, Queue, Language } from "@/src/types";
import { 
  Search, MapPin, Calendar, Clock, Ticket, User, Phone, AlignLeft, 
  ChevronRight, Sparkles, CheckCircle2, ChevronDown, Check, Compass, AlertCircle 
} from "lucide-react";

interface PatientPortalProps {
  doctors: Doctor[];
  queues: Record<string, Queue>;
  appointments: Appointment[];
  language: Language;
  onBookAppointment: (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    dateTime: string;
    notes: string;
  }) => Promise<void>;
  onCheckInWalkIn: (data: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
  }) => Promise<void>;
}

export default function PatientPortal({
  doctors,
  queues,
  appointments,
  language,
  onBookAppointment,
  onCheckInWalkIn,
}: PatientPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Tous");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  // Onglets d'action patient
  const [activeTab, setActiveTab] = useState<"book" | "walkin" | "tracker">("book");

  // Formulaire de réservation
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [appointmentDateTime, setAppointmentDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);

  // Formulaire Walk-in Checking
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [isWalkinSuccess, setIsWalkinSuccess] = useState(false);

  // Suivi de ticket patient (simulation par numéro de téléphone enregistré)
  const [searchPhoneTracker, setSearchPhoneTracker] = useState("");
  const [matchedEntries, setMatchedEntries] = useState<any[]>([]);

  // Dictionnaires bilingues
  const t = {
    FR: {
      searchPlaceholder: "Rechercher par spécialité ou nom...",
      cityLabel: "Ville :",
      allCities: "Toutes les villes",
      bookTitle: "Prise de Rendez-vous",
      walkinTitle: "Arrivé(e) au cabinet ? Obtenir un Ticket",
      trackerTitle: "Suivi File Direct",
      doctorList: "Médecins disponibles au Maroc",
      avgWait: "Attente Moyenne",
      currentConsult: "Consultation en cours",
      activeQueue: "Patients en attente",
      bookBtn: "Prendre RDV",
      ticketBtn: "Émettre Ticket",
      fullName: "Nom complet",
      phoneLabel: "Numéro de téléphone marocain (+212)",
      phonePlaceholder: "06 12 34 56 78 ou +2126...",
      notesLabel: "Symptômes ou remarques (optionnel)",
      dateTimeLabel: "Heure souhaitée",
      submitBook: "Confirmer la Réservation",
      submitWalkIn: "Prendre mon Ticket d'Attente",
      trackerPhoneLabel: "Entrez votre numéro pour suivre votre rang en direct",
      trackBtn: "Suivre mes Tickets",
      durationUnit: "min",
      estWaitLabel: "Temps d'attente estimé",
      ticketNumLabel: "Votre Ticket",
      rankLabel: "Votre rang",
      peopleAhead: "personnes devant vous",
      statusLabel: "Statut",
      celt: "Veuillez vous présenter immédiatement au cabinet !",
      waitingStatus: "En salle d'attente",
      calledStatus: "APPELÉ ! Entrez en consultation ! 📣",
      completedStatus: "Consultation terminée",
      missedStatus: "Absence constatée",
      noTicketFound: "Aucun ticket ni rendez-vous en cours trouvé pour ce numéro.",
      successBookMsg: "Félicitations ! Votre demande de rendez-vous a été enregistrée à Casablanca/Rabat."
    },
    AR: {
      searchPlaceholder: "ابحث عن طبيب أو تخصص...",
      cityLabel: "المدينة:",
      allCities: "كل المدن",
      bookTitle: "حجز موعد جديد",
      walkinTitle: "وصلت للعيادة؟ احصل على تذكرتك",
      trackerTitle: "تتبع الدور مباشرة",
      doctorList: "الأطباء المتاحون في المغرب",
      avgWait: "متوسط الانتظار",
      currentConsult: "قيد الانتظار حالياً",
      activeQueue: "المرضى في الانتظار",
      bookBtn: "حجز موعد",
      ticketBtn: "سحب تذكرة",
      fullName: "الاسم الكامل",
      phoneLabel: "رقم الهاتف المغربي (212+)",
      phonePlaceholder: "06 12 34 56 78 أو 2126+",
      notesLabel: "ملاحظات أو أعراض (اختياري)",
      dateTimeLabel: "الوقت المطلوب",
      submitBook: "تأكيد الطلب والحجز",
      submitWalkIn: "الحصول على تذكرة الانتظار",
      trackerPhoneLabel: "أدخل رقم هاتفك لتتبع ترتيبك مباشرة",
      trackBtn: "تتبع تذكرتي",
      durationUnit: "دقيقة",
      estWaitLabel: "وقت الانتظار المتوقع",
      ticketNumLabel: "تذكرتك",
      rankLabel: "ترتيبك",
      peopleAhead: "مرضى قبل دورك",
      statusLabel: "الحالة",
      celt: "يرجى التوجه فوراً إلى مكتب الاستقبال أو الطبيب !",
      waitingStatus: "في قاعة الانتظار",
      calledStatus: "تم مناداتك ! تفضل بالدخول 📣",
      completedStatus: "اكتملت الاستشارة",
      missedStatus: "غير موجود",
      noTicketFound: "لم يتم العثور على أي موعد أو تذكرة نشطة لهذا الرقم.",
      successBookMsg: "تهانينا! تم تسجيل طلب الموعد الخاص بك بنجاح بالدار البيضاء/الرباط."
    }
  }[language];

  // Filtrer les médecins
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "Tous" || doc.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    try {
      await onBookAppointment({
        patientName,
        patientPhone,
        doctorId: selectedDoctor.id,
        dateTime: appointmentDateTime,
        notes,
      });
      setIsSubmitSuccessful(true);
      setTimeout(() => {
        setIsSubmitSuccessful(false);
        setActiveTab("tracker");
        setSearchPhoneTracker(patientPhone);
        handleTrack(patientPhone);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWalkInCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    try {
      await onCheckInWalkIn({
        doctorId: selectedDoctor.id,
        patientName: walkinName,
        patientPhone: walkinPhone,
      });
      setIsWalkinSuccess(true);
      setTimeout(() => {
        setIsWalkinSuccess(false);
        setActiveTab("tracker");
        setSearchPhoneTracker(walkinPhone);
        handleTrack(walkinPhone);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrack = (phoneToSearch?: string) => {
    const targetPhone = phoneToSearch || searchPhoneTracker;
    if (!targetPhone) return;

    // Normaliser le téléphone pour la recherche
    let normalized = targetPhone.trim();
    if (normalized.startsWith("0")) {
      normalized = "+212" + normalized.substring(1);
    } else if (!normalized.startsWith("+212")) {
      normalized = "+212" + normalized;
    }

    const matched: any[] = [];

    // 1. Rechercher dans les files d'attente d'aujourd'hui
    Object.values(queues).forEach((q) => {
      const doc = doctors.find((d) => d.id === q.doctorId);
      q.entries.forEach((entry) => {
        if (entry.patientPhone === normalized) {
          // Calculer le nombre de personnes devant
          const activePriorEntries = q.entries.filter(
            (e) => e.status === "WAITING" && e.ticketNumber < entry.ticketNumber
          );
          const aheadCount = activePriorEntries.length;
          // Estimer le temps d'attente en minutes
          const estimatedTime = (aheadCount + (q.currentNumber && entry.status === "WAITING" ? 1 : 0)) * (doc?.avgConsultationTime || 15);

          matched.push({
            type: "queueTicket",
            doctorName: doc?.name,
            specialty: doc?.specialty,
            cabinetName: doc?.cabinetName,
            status: entry.status,
            ticketNumber: entry.ticketNumber,
            aheadCount,
            estimatedTime,
            checkInAt: entry.checkInAt,
          });
        }
      });
    });

    // 2. Rechercher dans les rendez-vous futurs qui ne sont pas encore appelés ou qui sont en attente de validation
    appointments.forEach((appt) => {
      if (appt.patientPhone === normalized) {
        const doc = doctors.find((d) => d.id === appt.doctorId);
        // Seulement afficher si pas encore dans la file du jour d'aujourd'hui pour éviter doublon
        const alreadyInQueue = matched.some(m => m.ticketNumber === appt.ticketNumber && m.doctorName === doc?.name);
        
        if (!alreadyInQueue) {
          matched.push({
            type: "appointmentOnly",
            doctorName: doc?.name,
            specialty: doc?.specialty,
            cabinetName: doc?.cabinetName,
            status: appt.status,
            dateTime: appt.dateTime,
            notes: appt.notes,
            ticketNumber: appt.ticketNumber,
          });
        }
      }
    });

    setMatchedEntries(matched);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Colonne Gauche : Sélection du Médecin */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
            <h2 className={`text-base font-bold text-slate-800 ${language === "AR" ? "font-ara text-right w-full md:w-auto" : ""}`}>
              {t.doctorList}
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
              {["Tous", "Casablanca", "Rabat", "Marrakech"].map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    selectedCity === city
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {city === "Tous" ? t.allCities : city}
                </button>
              ))}
            </div>
          </div>

          {/* Recherche barre */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                language === "AR" ? "text-right font-ara" : ""
              }`}
            />
          </div>

          {/* Liste des cabinets médicaux */}
          <div className="space-y-3 max-h-[38rem] overflow-y-auto pr-1">
            {filteredDoctors.map((doc) => {
              const queue = queues[doc.id] || { status: "NOT_STARTED", entries: [], currentNumber: 0, totalTickets: 0 };
              const isSelected = selectedDoctor?.id === doc.id;
              
              // Compter patients en attente
              const waitingCount = queue.entries.filter((e) => e.status === "WAITING").length;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    // réinitialiser états réussite
                    setIsSubmitSuccessful(false);
                    setIsWalkinSuccess(false);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/15 shadow-sm"
                      : "border-slate-100 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{doc.name}</h4>
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {doc.city}
                        </span>
                      </div>
                      <p className="text-emerald-700 text-xs font-semibold mt-0.5">{doc.specialty}</p>
                      
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-2.5">
                        <MapPin className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span className="line-clamp-1">{doc.cabinetName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-5">{doc.cabinetAddress}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {doc.licenseNumber}
                      </span>
                      <div className="mt-3 flex flex-col gap-1 items-end">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          {t.avgWait} : <strong>{doc.avgConsultationTime} {t.durationUnit}</strong>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t.activeQueue} : <strong className="text-slate-800">{waitingCount} En attente</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statut de la file en temps réel */}
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${queue.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                      <span className="text-slate-500">
                        {queue.status === "ACTIVE" ? (
                          <>
                            File active • {t.currentConsult} : <strong className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">N° {queue.currentNumber}</strong>
                          </>
                        ) : (
                          "Cabinet non ouvert actuellement"
                        )}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                        Cabinet sélectionné <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Colonne Droite : Formulaires / Visualisation du Ticket Patient */}
      <div className="lg:col-span-5 space-y-4">
        {selectedDoctor ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header Docteur sélectionné */}
            <div className="bg-slate-900 text-white p-4">
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">🎯 Choix du Cabinet</span>
              <h3 className="font-bold text-base">{selectedDoctor.name}</h3>
              <p className="text-xs text-slate-300">{selectedDoctor.specialty} • {selectedDoctor.cabinetName}</p>
            </div>

            {/* Menu d'onglets pour le patient */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1">
              <button
                onClick={() => setActiveTab("book")}
                className={`flex-1 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  activeTab === "book" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.bookTitle}
              </button>
              <button
                onClick={() => setActiveTab("walkin")}
                className={`flex-1 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  activeTab === "walkin" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.walkinTitle}
              </button>
              <button
                onClick={() => setActiveTab("tracker")}
                className={`flex-1 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  activeTab === "tracker" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.trackerTitle}
              </button>
            </div>

            {/* Corps des onglets */}
            <div className="p-5">
              {/* ONGLET 1: Prendre Rendez-vous en ligne */}
              {activeTab === "book" && (
                <form onSubmit={handleBook} className="space-y-4">
                  {isSubmitSuccessful ? (
                    <div className="py-6 text-center space-y-2">
                      <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full mb-1">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Rendez-vous pré-enregistré !</h4>
                      <p className="text-xs text-slate-500 px-4">{t.successBookMsg}</p>
                      <p className="text-[10px] text-slate-400 italic">Ouverture automatique du tracker...</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.fullName}</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            required
                            type="text"
                            placeholder="Meryem Bennani"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.phoneLabel}</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            required
                            type="tel"
                            placeholder={t.phonePlaceholder}
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.dateTimeLabel}</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                              required
                              type="datetime-local"
                              value={appointmentDateTime}
                              onChange={(e) => setAppointmentDateTime(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.notesLabel}</label>
                        <textarea
                          placeholder="Ex: Première visite de contrôle ou consultation pédiatrique..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-3 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t.submitBook}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* ONGLET 2: Arrivé en salle (Check-in direct / Walk-in) */}
              {activeTab === "walkin" && (
                <form onSubmit={handleWalkInCheckin} className="space-y-4">
                  {isWalkinSuccess ? (
                    <div className="py-6 text-center space-y-2">
                      <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full mb-1">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Ticket de File Émis !</h4>
                      <p className="text-xs text-slate-500">Un SMS de confirmation WhatsApp a été adressé avec votre numéro de ticket.</p>
                      <p className="text-[10px] text-slate-400 italic">Redirection immédiate sur le live tracker...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-amber-50 p-3 rounded-xl text-[11px] text-amber-800 flex gap-2 border border-amber-100">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <p>
                          <strong>Sans Rendez-vous :</strong> Utilisez ce formulaire uniquement si vous êtes déjà arrivé(e) physiquement dans la salle d'attente pour que la secrétaire puisse vous appeler.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.fullName}</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            required
                            type="text"
                            placeholder="Anas Chraibi"
                            value={walkinName}
                            onChange={(e) => setWalkinName(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">{t.phoneLabel}</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            required
                            type="tel"
                            placeholder={t.phonePlaceholder}
                            value={walkinPhone}
                            onChange={(e) => setWalkinPhone(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm w-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-3 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Ticket className="w-4 h-4 text-emerald-400" />
                        {t.submitWalkIn}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* ONGLET 3: Live Queue Tracker (Suivi de rôle) */}
              {activeTab === "tracker" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 0661234567"
                      value={searchPhoneTracker}
                      onChange={(e) => setSearchPhoneTracker(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm flex-1 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleTrack()}
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
                    >
                      {t.trackBtn}
                    </button>
                  </div>

                  {/* Liste des tickets trouvés */}
                  <div className="space-y-3">
                    {matchedEntries.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-500 px-3">{t.trackerPhoneLabel}</p>
                      </div>
                    ) : (
                      matchedEntries.map((item, idx) => {
                        const isApptOnly = item.type === "appointmentOnly";
                        
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border ${
                              item.status === "CALLED" || item.status === "SERVING"
                                ? "bg-amber-50 border-amber-300 animate-pulse"
                                : "bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  {isApptOnly ? "Rendez-vous" : "Ticket en direct"}
                                </span>
                                <h4 className="font-bold text-slate-900 text-xs mt-1">{item.doctorName}</h4>
                                <p className="text-[10px] text-slate-500">{item.specialty} • {item.cabinetName}</p>
                              </div>

                              {item.ticketNumber && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{t.ticketNumLabel}</span>
                                  <span className="font-mono text-lg font-bold text-slate-900">#{item.ticketNumber}</span>
                                </div>
                              )}
                            </div>

                            {/* Données d'estimation de file */}
                            {!isApptOnly ? (
                              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/50 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block">{t.rankLabel}</span>
                                  <strong className="text-slate-800 text-xs">
                                    {item.aheadCount === 0 ? "⚠️ C'est votre tour" : `${item.aheadCount}ème (${item.aheadCount} ${t.peopleAhead})`}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">{t.estWaitLabel}</span>
                                  <strong className="text-emerald-700 text-xs">
                                    {item.aheadCount === 0 ? "Immédiat" : `~ ${item.estimatedTime} ${t.durationUnit}`}
                                  </strong>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 pt-3 border-t border-slate-200/50 text-[11px]">
                                <span className="text-slate-400 block">Planifié le :</span>
                                <strong className="text-slate-800 text-xs">
                                  {new Date(item.dateTime).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                                </strong>
                              </div>
                            )}

                            {/* Statut tag */}
                            <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">{t.statusLabel}</span>
                              <span className={`font-semibold ${
                                item.status === "CALLED" || item.status === "SERVING"
                                  ? "text-rose-600 animate-bounce"
                                  : item.status === "COMPLETED"
                                  ? "text-emerald-700"
                                  : "text-slate-700"
                              }`}>
                                {item.status === "WAITING" && t.waitingStatus}
                                {item.status === "CALLED" && t.calledStatus}
                                {item.status === "SERVING" && "En consultation active 🩺"}
                                {item.status === "COMPLETED" && t.completedStatus}
                                {item.status === "MISSED" && t.missedStatus}
                                {item.status === "PENDING" && "En attente de validation secrétariat ⏳"}
                                {item.status === "CONFIRMED" && "Mise en file planifiée ✔"}
                              </span>
                            </div>

                            {/* Alerte si appelé */}
                            {(item.status === "CALLED" || item.status === "SERVING") && (
                              <div className="mt-2.5 bg-amber-500 text-slate-900 font-medium text-[10px] p-2 rounded-lg text-center animate-pulse">
                                {t.celt}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center py-16">
            <Compass className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-3" />
            <p className="text-sm font-medium text-slate-600">Aucun cabinet sélectionné</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Veuillez cliquer sur un médecin dans la liste de gauche pour réserver un rendez-vous ou accéder au suivi de file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
