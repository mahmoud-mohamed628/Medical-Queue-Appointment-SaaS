import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Interfaces correspondant au schéma Prisma pour notre "in-memory database" persistante dans le serveur
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  city: string;
  cabinetName: string;
  cabinetAddress: string;
  licenseNumber: string;
  avgConsultationTime: number; // minutes
}

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string; // ex: +212661234567
  doctorId: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  notes: string;
  ticketNumber?: number;
}

interface QueueEntry {
  id: string;
  patientName: string;
  patientPhone: string;
  ticketNumber: number;
  status: "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "MISSED";
  checkInAt: string;
  calledAt?: string;
  completedAt?: string;
  appointmentId?: string;
}

interface Queue {
  doctorId: string;
  status: "NOT_STARTED" | "ACTIVE" | "PAUSED" | "COMPLETED";
  currentNumber: number; // ticket number being called right now
  totalTickets: number;
  entries: QueueEntry[];
}

interface WhatsAppLog {
  id: string;
  receiverName: string;
  phoneNumber: string;
  type: "CONFIRMATION" | "REMINDER" | "YOUR_TURN" | "DELAY_ALERT";
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  sentAt: string;
}

// Données initiales (Seed Data Marocain)
const DB_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Amina El Mansouri",
    specialty: "Gynécologue - Obstétricienne",
    city: "Casablanca",
    cabinetName: "Clinique Gauthier - Dr. El Mansouri",
    cabinetAddress: "45, Rue de Prince Moulay Abdellah, Quartier Gauthier, Casablanca",
    licenseNumber: "CNOM-52891",
    avgConsultationTime: 15,
  },
  {
    id: "doc-2",
    name: "Dr. Youssef Benjelloun",
    specialty: "Pédiatre",
    city: "Rabat",
    cabinetName: "Cabinet de Pédiatrie de l'Agdal",
    cabinetAddress: "12, Avenue de France, 3ème étage, Agdal, Rabat",
    licenseNumber: "CNOM-41908",
    avgConsultationTime: 20,
  },
  {
    id: "doc-3",
    name: "Dr. Sofia Tazi",
    specialty: "Cardiologue",
    city: "Marrakech",
    cabinetName: "Centre de Cardiologie de l'Hivernage",
    cabinetAddress: "Boulevard Mohamed VI, Résidence Nour, Marrakech",
    licenseNumber: "CNOM-63102",
    avgConsultationTime: 25,
  }
];

const DB_APPOINTMENTS: Appointment[] = [
  {
    id: "appt-1",
    patientName: "Karim Bennani",
    patientPhone: "+212661234567",
    doctorId: "doc-1",
    dateTime: "2026-06-04T14:00:00.000Z",
    status: "CONFIRMED",
    notes: "Contrôle mensuel",
    ticketNumber: 1,
  },
  {
    id: "appt-2",
    patientName: "Fatima Zahra Alami",
    patientPhone: "+212675981243",
    doctorId: "doc-1",
    dateTime: "2026-06-04T14:30:00.000Z",
    status: "CONFIRMED",
    notes: "Première consultation de grossesse",
    ticketNumber: 2,
  },
  {
    id: "appt-3",
    patientName: "Mehdi Sadiki",
    patientPhone: "+212611987654",
    doctorId: "doc-2",
    dateTime: "2026-06-04T11:00:00.000Z",
    status: "COMPLETED",
    notes: "Vaccination 6 mois",
  }
];

// Initialisation des files d'attente pour chaque médecin
const DB_QUEUES: Record<string, Queue> = {
  "doc-1": {
    doctorId: "doc-1",
    status: "ACTIVE",
    currentNumber: 1,
    totalTickets: 4,
    entries: [
      {
        id: "q-1-1",
        patientName: "Karim Bennani",
        patientPhone: "+212661234567",
        ticketNumber: 1,
        status: "SERVING",
        checkInAt: "2026-06-04T13:00:00.000Z",
        calledAt: "2026-06-04T13:20:00.000Z",
        appointmentId: "appt-1"
      },
      {
        id: "q-1-2",
        patientName: "Fatima Zahra Alami",
        patientPhone: "+212675981243",
        ticketNumber: 2,
        status: "WAITING",
        checkInAt: "2026-06-04T13:10:00.000Z",
        appointmentId: "appt-2"
      },
      {
        id: "q-1-3",
        patientName: "Souad Amrani (sans RDV)",
        patientPhone: "+212662334455",
        ticketNumber: 3,
        status: "WAITING",
        checkInAt: "2026-06-04T13:15:00.000Z"
      },
      {
        id: "q-1-4",
        patientName: "Anas Chraibi (sans RDV)",
        patientPhone: "+212650998877",
        ticketNumber: 4,
        status: "WAITING",
        checkInAt: "2026-06-04T13:28:00.000Z"
      }
    ]
  },
  "doc-2": {
    doctorId: "doc-2",
    status: "NOT_STARTED",
    currentNumber: 0,
    totalTickets: 0,
    entries: []
  },
  "doc-3": {
    doctorId: "doc-3",
    status: "ACTIVE",
    currentNumber: 0,
    totalTickets: 1,
    entries: [
      {
        id: "q-3-1",
        patientName: "Omar Mansouri",
        patientPhone: "+212669887766",
        ticketNumber: 1,
        status: "WAITING",
        checkInAt: "2026-06-04T13:29:00.000Z"
      }
    ]
  }
};

const DB_WHATSAPP_LOGS: WhatsAppLog[] = [
  {
    id: "notif-1",
    receiverName: "Karim Bennani",
    phoneNumber: "+212661234567",
    type: "CONFIRMATION",
    message: "Bonjour Karim Bennani, votre rendez-vous est confirmé avec Dr. Amina El Mansouri le 04/06/2026 à 15:00. Numéro de ticket de file d'attente : #1.",
    status: "SENT",
    sentAt: "2026-06-04T11:05:00.000Z"
  }
];

// Service de diffusion en temps réel (SSE Clients)
let SSE_CLIENTS: any[] = [];

function notifySSEClients(doctorId: string) {
  const queueData = DB_QUEUES[doctorId] || { doctorId, status: "NOT_STARTED", entries: [], currentNumber: 0, totalTickets: 0 };
  const payload = JSON.stringify({ doctorId, queue: queueData, appointments: DB_APPOINTMENTS, logs: DB_WHATSAPP_LOGS });
  
  SSE_CLIENTS.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Fonction utilitaire d'envoi d'alerte WhatsApp via Twilio (simulée)
function sendSimulatedWhatsApp(patientName: string, phoneNumber: string, type: "CONFIRMATION" | "REMINDER" | "YOUR_TURN" | "DELAY_ALERT", customMsg?: string) {
  let message = "";
  if (customMsg) {
    message = customMsg;
  } else {
    switch (type) {
      case "CONFIRMATION":
        message = `🟢 *MaClinique Maroc* 🟢\nBonjour ${patientName},\n\nVotre rendez-vous a été enregistré avec succès ! 🏥\n📱 Format de notification : WhatsApp Twilio (+212)\n🌐 Rendez-vous : Consultable en temps réel sur notre application.`;
        break;
      case "REMINDER":
        message = `🔔 *RAPPEL RDV* 🔔\n\nCher(e) ${patientName},\nNous vous rappelons votre rendez-vous d'aujourd'hui. Préparez vos pièces médicales.\n\nCabinet Médical au Maroc.`;
        break;
      case "YOUR_TURN":
        message = `🚀 *À VOUS LE TOUR / نوبتك قربات* 🚀\n\nBonjour ${patientName},\n\nVous êtes le *prochain sur la liste* en salle d'attente. Nous vous prions de bien vouloir vous installer ou vous approcher du secrétariat.\n\nشكراً لتفهمكم وصبركم. 🤍`;
        break;
      case "DELAY_ALERT":
        message = `⚠️ *Alerte Retard clinique* ⚠️\n\nBonjour ${patientName},\nNous vous informons que le médecin a un léger retard d'environ 20 minutes aujourd'hui. Vous pouvez adapter votre heure de venue afin d'éviter l'attente au cabinet.`;
        break;
    }
  }

  const log: WhatsAppLog = {
    id: `notif-${Date.now()}`,
    receiverName: patientName,
    phoneNumber,
    type,
    message,
    status: "SENT",
    sentAt: new Date().toISOString()
  };

  DB_WHATSAPP_LOGS.unshift(log); // Ajouter en haut
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parser les requêtes JSON
  app.use(express.json());

  // API - Liste de tous les médecins
  app.get("/api/doctors", (req, res) => {
    res.json(DB_DOCTORS);
  });

  // API - Obtenir toutes les notifications
  app.get("/api/notifications", (req, res) => {
    res.json(DB_WHATSAPP_LOGS);
  });

  // API - Obtenir tous les rendez-vous
  app.get("/api/appointments", (req, res) => {
    res.json(DB_APPOINTMENTS);
  });

  // API - Réserver un nouveau rendez-vous
  app.post("/api/appointments", (req, res) => {
    const { patientName, patientPhone, doctorId, dateTime, notes } = req.body;
    if (!patientName || !patientPhone || !doctorId || !dateTime) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }

    // Valider ou s'assurer du format marocain pour la démonstration
    let formattedPhone = patientPhone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+212" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+212")) {
      formattedPhone = "+212" + formattedPhone;
    }

    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      patientName,
      patientPhone: formattedPhone,
      doctorId,
      dateTime,
      status: "PENDING",
      notes: notes || ""
    };

    DB_APPOINTMENTS.push(newAppt);

    // Envoyer une notification automatique de confirmation de réservation WhatsApp
    sendSimulatedWhatsApp(patientName, formattedPhone, "CONFIRMATION");

    notifySSEClients(doctorId);
    res.status(201).json(newAppt);
  });

  // API - Confirmer un rendez-vous (géré par secrétaire/médecin)
  app.post("/api/appointments/:id/confirm", (req, res) => {
    const { id } = req.params;
    const appt = DB_APPOINTMENTS.find(a => a.id === id);
    if (!appt) return res.status(404).json({ error: "Rendez-vous introuvable." });

    appt.status = "CONFIRMED";

    // Assigner automatiquement un numéro de ticket dans la file si c'est pour aujourd'hui
    const queue = DB_QUEUES[appt.doctorId];
    if (queue) {
      const ticketNum = ++queue.totalTickets;
      appt.ticketNumber = ticketNum;
      
      const newQueueEntry: QueueEntry = {
        id: `q-entry-${Date.now()}`,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        ticketNumber: ticketNum,
        status: "WAITING",
        checkInAt: new Date().toISOString(),
        appointmentId: appt.id
      };
      
      queue.entries.push(newQueueEntry);
      
      // Envoi de la notification WhatsApp avec numéro de ticket
      sendSimulatedWhatsApp(
        appt.patientName,
        appt.patientPhone,
        "CONFIRMATION",
        `🟢 *Rendez-vous Confirmé / تأكيد الموعد* 🟢\nBonjour ${appt.patientName},\n\nVotre rendez-vous avec ${DB_DOCTORS.find(d => d.id === appt.doctorId)?.name || 'le médecin'} est officiellement *CONFIRMÉ*.\n⏱️ Ticket Numero: *#${ticketNum}*\n📍 Lieu: ${DB_DOCTORS.find(d => d.id === appt.doctorId)?.cabinetName}\n\nVous recevrez un message WhatsApp automatique à l'approche de votre tour !`
      );
    }

    notifySSEClients(appt.doctorId);
    res.json(appt);
  });

  // API - Obtenir la file d'attente d'un médecin
  app.get("/api/queues/:doctorId", (req, res) => {
    const { doctorId } = req.params;
    const queue = DB_QUEUES[doctorId] || { doctorId, status: "NOT_STARTED", currentNumber: 0, totalTickets: 0, entries: [] };
    res.json(queue);
  });

  // API - Check-in d'un patient sans RDV (Walk-in)
  app.post("/api/queues/:doctorId/checkin", (req, res) => {
    const { doctorId } = req.params;
    const { patientName, patientPhone } = req.body;
    
    if (!patientName || !patientPhone) {
      return res.status(400).json({ error: "Nom et numéro de téléphone requis." });
    }

    let formattedPhone = patientPhone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+212" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+212")) {
      formattedPhone = "+212" + formattedPhone;
    }

    let queue = DB_QUEUES[doctorId];
    if (!queue) {
      queue = {
        doctorId,
        status: "ACTIVE",
        currentNumber: 0,
        totalTickets: 0,
        entries: []
      };
      DB_QUEUES[doctorId] = queue;
    }

    const ticketNumber = ++queue.totalTickets;
    const newEntry: QueueEntry = {
      id: `q-walk-${Date.now()}`,
      patientName: `${patientName} (S.R.)`,
      patientPhone: formattedPhone,
      ticketNumber,
      status: "WAITING",
      checkInAt: new Date().toISOString()
    };

    queue.entries.push(newEntry);

    // Notification instantanée d'émission de ticket d'attente en salle
    sendSimulatedWhatsApp(
      patientName,
      formattedPhone,
      "CONFIRMATION",
      `🎫 *Ticket de File d'Attente / تذكرة الانتظار* 🎫\n\nBonjour ${patientName},\n\nVotre ticket d'attente a été généré.\n👉 Numéro de Ticket: *#${ticketNumber}*\n🏥 Cabinet: ${DB_DOCTORS.find(d => d.id === doctorId)?.cabinetName}\n\nConsultez l'état d'avancement de la salle en direct sur l'application !`
    );

    notifySSEClients(doctorId);
    res.status(201).json(newEntry);
  });

  // API - Action Médecin/Secrétaire: Faire avancer la file (Appeler le patient suivant)
  app.post("/api/queues/:doctorId/next", (req, res) => {
    const { doctorId } = req.params;
    const queue = DB_QUEUES[doctorId];
    if (!queue) return res.status(404).json({ error: "File d'attente introuvable." });

    // 1. Terminer le patient en cours (le cas échéant)
    queue.entries.forEach(e => {
      if (e.status === "SERVING") {
        e.status = "COMPLETED";
        e.completedAt = new Date().toISOString();
      }
    });

    // 2. Trouver le prochain patient avec statut WAITING
    const nextWaiting = queue.entries.find(e => e.status === "WAITING");
    if (nextWaiting) {
      nextWaiting.status = "SERVING";
      nextWaiting.calledAt = new Date().toISOString();
      queue.currentNumber = nextWaiting.ticketNumber;

      // Alerte WhatsApp pour le patient activement appelé
      sendSimulatedWhatsApp(
        nextWaiting.patientName,
        nextWaiting.patientPhone,
        "YOUR_TURN",
        `🔔 *C'EST VOTRE TOUR / نوبتك دابا* 🔔\n\nCher(e) ${nextWaiting.patientName.replace(" (S.R.)", "")},\n\nLe médecin vous appelle maintenant en consultation ! Veuillez vous diriger immédiatement vers la salle de soins.\n\n📍 Ticket N°: *#${nextWaiting.ticketNumber}*\n👨‍⚕️ ${DB_DOCTORS.find(d => d.id === doctorId)?.name}`
      );

      // Trouver également le "Prochain" (celui qui vient juste après le nouvel appelé pour lui envoyer une alerte de préparation "YOUR_TURN")
      const upcoming = queue.entries.find(e => e.status === "WAITING" && e.ticketNumber > nextWaiting.ticketNumber);
      if (upcoming) {
        sendSimulatedWhatsApp(
          upcoming.patientName,
          upcoming.patientPhone,
          "YOUR_TURN"
        );
      }
    } else {
      // Plus personne n'attend
      queue.currentNumber = 0;
    }

    notifySSEClients(doctorId);
    res.json(queue);
  });

  // API - Action Médecin/Secrétaire: Déclarer un retard du médecin (alerte générale de retard)
  app.post("/api/queues/:doctorId/delay", (req, res) => {
    const { doctorId } = req.params;
    const { minutes } = req.body;
    const queue = DB_QUEUES[doctorId];
    if (!queue) return res.status(404).json({ error: "File d'attente introuvable." });

    // Envoyer la notification de retard à tous les patients qui attendent encore
    const waitingPatients = queue.entries.filter(e => e.status === "WAITING");
    waitingPatients.forEach(patient => {
      sendSimulatedWhatsApp(
        patient.patientName,
        patient.patientPhone,
        "DELAY_ALERT",
        `⚠️ *Avis de Retard / إشعار تأخير* ⚠️\n\nCher(e) ${patient.patientName.replace(" (S.R.)", "")},\n\nDr. ${DB_DOCTORS.find(d => d.id === doctorId)?.name} aura un retard estimé de *${minutes || 20} minutes* aujourd'hui.\n\nVous êtes actuellement au rang #_ ${patient.ticketNumber - queue.currentNumber} _ dans la file. Nous vous recommandons d'ajuster votre arrivée au cabinet pour votre confort.\n\nNous vous remercions pour votre précieuse compréhension. 🙏`
      );
    });

    notifySSEClients(doctorId);
    res.json({ message: "Alertes de retard de groupe envoyées.", count: waitingPatients.length });
  });

  // API - Action Médecin/Secrétaire: Marquer un ticket individuel comme absent / absent lors de l'appel
  app.post("/api/queues/:doctorId/entries/:entryId/missed", (req, res) => {
    const { doctorId, entryId } = req.params;
    const queue = DB_QUEUES[doctorId];
    if (!queue) return res.status(404).json({ error: "File d'attente introuvable." });

    const entry = queue.entries.find(e => e.id === entryId);
    if (!entry) return res.status(404).json({ error: "Ticket introuvable." });

    entry.status = "MISSED";

    // Envoyer une notification d'avis d'absence
    sendSimulatedWhatsApp(
      entry.patientName,
      entry.patientPhone,
      "CONFIRMATION",
      `❌ *Appel Manqué / موعد فائت* ❌\n\nBonjour ${entry.patientName.replace(" (S.R.)", "")},\n\nLe médecin vous a appelé à plusieurs reprises sans succès. Votre ticket est marqué comme "Absent".\n\nVeuillez vous présenter au secrétariat du cabinet ${DB_DOCTORS.find(d => d.id === doctorId)?.cabinetName} pour réactiver votre rang si vous êtes sur place.`
    );

    notifySSEClients(doctorId);
    res.json(entry);
  });

  // API - Action Médecin/Secrétaire: Ré-engager un patient manqué (remettre à l'état WAITING)
  app.post("/api/queues/:doctorId/entries/:entryId/requeue", (req, res) => {
    const { doctorId, entryId } = req.params;
    const queue = DB_QUEUES[doctorId];
    if (!queue) return res.status(404).json({ error: "File d'attente introuvable." });

    const entry = queue.entries.find(e => e.id === entryId);
    if (!entry) return res.status(404).json({ error: "Ticket introuvable." });

    entry.status = "WAITING";
    
    notifySSEClients(doctorId);
    res.json(entry);
  });

  // API - Canal de mise à jour en Temps Réel SSE (Server-Sent Events)
  app.get("/api/queues/live-events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    SSE_CLIENTS.push(res);

    // Envoi initial des données
    const payload = JSON.stringify({ 
      doctors: DB_DOCTORS,
      queues: DB_QUEUES, 
      appointments: DB_APPOINTMENTS, 
      logs: DB_WHATSAPP_LOGS 
    });
    res.write(`data: ${payload}\n\n`);

    req.on("close", () => {
      SSE_CLIENTS = SSE_CLIENTS.filter(client => client !== res);
    });
  });

  // Route de test d'effacement / réinitialisation de la file d'attente
  app.post("/api/system/reset", (req, res) => {
    // Réinitialiser les files et RDV de démonstration
    DB_QUEUES["doc-1"].currentNumber = 1;
    DB_QUEUES["doc-1"].totalTickets = 4;
    DB_QUEUES["doc-1"].entries = [
      {
        id: "q-1-1",
        patientName: "Karim Bennani",
        patientPhone: "+212661234567",
        ticketNumber: 1,
        status: "SERVING",
        checkInAt: "2026-06-04T13:00:00.000Z",
        calledAt: "2026-06-04T13:20:00.000Z",
        appointmentId: "appt-1"
      },
      {
        id: "q-1-2",
        patientName: "Fatima Zahra Alami",
        patientPhone: "+212675981243",
        ticketNumber: 2,
        status: "WAITING",
        checkInAt: "2026-06-04T13:10:00.000Z",
        appointmentId: "appt-2"
      },
      {
        id: "q-1-3",
        patientName: "Souad Amrani (sans RDV)",
        patientPhone: "+212662334455",
        ticketNumber: 3,
        status: "WAITING",
        checkInAt: "2026-06-04T13:15:00.000Z"
      },
      {
        id: "q-1-4",
        patientName: "Anas Chraibi (sans RDV)",
        patientPhone: "+212650998877",
        ticketNumber: 4,
        status: "WAITING",
        checkInAt: "2026-06-04T13:28:00.000Z"
      }
    ];

    DB_APPOINTMENTS.forEach(a => {
      if (a.id === "appt-1" || a.id === "appt-2") {
        a.status = "CONFIRMED";
        a.ticketNumber = parseInt(a.id.split("-")[1]);
      } else {
        a.status = "COMPLETED";
      }
    });

    DB_WHATSAPP_LOGS.splice(0, DB_WHATSAPP_LOGS.length);
    DB_WHATSAPP_LOGS.push({
      id: "notif-1",
      receiverName: "Karim Bennani",
      phoneNumber: "+212661234567",
      type: "CONFIRMATION",
      message: "Bonjour Karim Bennani, votre rendez-vous est confirmé avec Dr. Amina El Mansouri le 04/06/2026 à 15:00. Numéro de ticket de file d'attente : #1.",
      status: "SENT",
      sentAt: "2026-06-04T11:05:00.000Z"
    });

    notifySSEClients("doc-1");
    notifySSEClients("doc-2");
    notifySSEClients("doc-3");
    res.json({ status: "success", message: "Système de démonstration réinitialisé." });
  });

  // Serveur d'assets statiques et middleware Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
