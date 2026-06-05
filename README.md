# 🏥 Chifaâ Maroc - Medical Queue & Appointment Management SaaS

**Chifaâ Maroc** est un logiciel de gestion des files d'attente quotidiennes et des réservations de rendez-vous médicaux, conçu spécialement pour moderniser les cabinets de consultation et les cliniques au Maroc. 

Son objectif principal est d'éliminer l'engorgement des salles d'attente grâce à un suivi en temps réel et un système d'alerte multilingue automatique via WhatsApp.

---

## 🚀 1. Architecture Globale de l'interaction

Le système repose sur un flux triangulaire permettant à la fois la planification en amont et la synchronisation en temps réel :

```
             ┌────────────────────────────────────────────────────────┐
             │            Patient App (Next.js / React)               │
             └───────────────────────────┬────────────────────────────┘
                                         │  (Prise de RDV / Check-in)
                                         ▼
                                HTTP REST API (Express)
                                         │
             ┌───────────────────────────┴────────────────────────────┐
             │       Express Server & Core Queue Processor            │◀─── (Appels WhatsApp Simulés)
             └───────────────────────────┬────────────────────────────┘
                                         │
                        Prisma Client & Live Event Stream (SSE)
                                         │
             ┌───────────────────────────▼────────────────────────────┐
             │          Secrétariat & Cabinet (Admin Panel)           │
             └────────────────────────────────────────────────────────┘
```

1. **Next.js & React Frontend (Double Panel)** :
   - **Espace Patient (Bilingue FR/AR)** : Permet de choisir un médecin, de soumettre un rendez-vous planifié, de s’enregistrer sans rendez-vous (Walk-in) une fois sur place, et de suivre son rang d'attente à distance avec une estimation actualisée en direct.
   - **Espace Secrétariat / Médecin** : Permet de valider et d'ordonner les arrivées, de faire progresser la file d'attente d'un clic, d'émettre des alertes de retards groupés et de déclarer les absences ("No-Show").

2. **Serveur Node.js (Express) & SSE (Server-Sent Events)** :
   - Utilisé pour le traitement robuste de la file. Contrairement aux WebSockets, les **Server-Sent Events (SSE)** via `/api/queues/live-events` sont parfaits pour les réseaux mobiles marocains (Maroc Telecom, Orange, Inwi) car ils utilisent une connexion HTTP standard unidirectionnelle très légère et robuste face aux micro-déconnexions.

3. **PostgreSQL & Prisma ORM** :
   - Assure la persistance durable sous forme de données relationnelles structurées (Médecins, Patients, Rendez-vous, File Active, Logs d'envois).

---

## 🗄️ 2. Schéma de Base de Données Prisma (`prisma/schema.prisma`)

Voici le schéma complet conçu pour modéliser cette suite fonctionnelle d'un cabinet marocain standard :

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

/// Rôles d'utilisateurs disponibles dans le SaaS de santé marocain
enum UserRole {
  PATIENT
  SECRETARY
  DOCTOR
  ADMIN
}

/// Langues de préférence pour les notifications et l'interface (bilingue Maroc)
enum LanguagePreference {
  FR     // Français
  AR     // Arabe
}

/// Statuts d'un rendez-vous
enum AppointmentStatus {
  PENDING      // En attente de confirmation par le secrétariat
  CONFIRMED    // Confirmé
  RESCHEDULED  // Reporté
  CANCELED     // Annulé
  COMPLETED    // Terminé (visite effectuée)
  NOSHOW       // Absent (patient ne s'est pas présenté)
}

/// Statuts du ticket de file d'attente quotidienne
enum QueueEntryStatus {
  WAITING      // En attente dans la salle
  CALLED       // Appelé par le médecin (notification envoyée)
  SERVING      // Actuellement en consultation
  COMPLETED    // Consultation terminée
  MISSED       // Patient absent lors de l'appel
}

/// Statut de la file d'attente globale quotidienne du cabinet
enum QueueStatus {
  NOT_STARTED  // Cabinet fermé ou file non active
  ACTIVE       // Consultation en cours
  PAUSED       // Le médecin est en pause
  COMPLETED    // Journée terminée
}

/// Type de notification envoyée
enum NotificationType {
  WHATSAPP_CONFIRMATION
  WHATSAPP_REMINDER
  WHATSAPP_YOUR_TURN       // "Prochain sur la liste" - invitation à se présenter
  WHATSAPP_DELAY_ALERT     // Alerte de retard du médecin
}

/// Statut d'envoi de la notification
enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

/// Modèle Utilisateur principal (Patients, Secrétaires, Médecins, Admins)
model User {
  id                 String             @id @default(uuid())
  email              String?            @unique
  passwordHash       String
  firstName          String
  lastName           String
  
  // Format international requis pour Twilio (+212xxxxxxxx pour le Maroc)
  phoneNumber        String             @unique
  
  role               UserRole           @default(PATIENT)
  language           LanguagePreference @default(FR)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  // Profils spécialisés liés
  doctorProfile      Doctor?            @relation("UserToDoctor")
  secretaryProfile   Secretary?         @relation("UserToSecretary")
  
  // Relations d'activité
  appointments       Appointment[]      @relation("PatientAppointments")
  queueEntries       QueueEntry[]       @relation("PatientQueueEntries")
  notifications      Notification[]     @relation("UserNotifications")

  @@index([phoneNumber])
  @@index([role])
}

/// Profil détaillé des Médecins
model Doctor {
  id                 String             @id @default(uuid())
  userId             String             @unique
  user               User               @relation("UserToDoctor", fields: [userId], references: [id], onDelete: Cascade)
  
  specialty          String             // ex: Cardiologue, Pédiatre...
  licenseNumber      String             @unique // Numéro d'ordre national des médecins au Maroc (CNOM)
  cabinetName        String             // Nom de la clinique ou du cabinet
  cabinetAddress     String             // Adresse physique
  city               String             // Ville au Maroc (ex: Casablanca, Rabat, Marrakech...)
  
  // Paramètres de file d'attente du cabinet
  avgConsultationTime Int               @default(15) // Temps moyen par consultation en minutes
  
  // Relations
  secretaries        Secretary[]        @relation("DoctorSecretaries")
  appointments       Appointment[]
  queues             Queue[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([city])
  @@index([specialty])
}

/// Profil des Secrétaires (associé à un ou plusieurs médecins d'un même cabinet)
model Secretary {
  id                 String             @id @default(uuid())
  userId             String             @unique
  user               User               @relation("UserToSecretary", fields: [userId], references: [id], onDelete: Cascade)
  
  doctorId           String
  doctor             Doctor             @relation("DoctorSecretaries", fields: [doctorId], references: [id], onDelete: Cascade)

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
}

/// Gestion des rendez-vous classiques réservés en avance
model Appointment {
  id                 String            @id @default(uuid())
  
  patientId          String
  patient            User              @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Cascade)
  
  doctorId           String
  doctor             Doctor            @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  
  dateTime           DateTime          // Date et heure prévue du rendez-vous
  status             AppointmentStatus @default(PENDING)
  notes              String?           // Symptômes ou remarques particulières
  
  // Relation optionnelle vers le ticket de file d'attente actuel
  queueEntry         QueueEntry?

  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  @@index([dateTime])
  @@index([status])
}

/// File d'attente globale quotidienne par Cabinet/Médecin
model Queue {
  id                 String            @id @default(uuid())
  
  doctorId           String
  doctor             Doctor            @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  
  date               DateTime          // Journée de la file d'attente (ex: 2026-06-04)
  status             QueueStatus       @default(NOT_STARTED)
  
  // Indicateurs en temps réel pour l'estimation de l'attente
  currentNumber      Int               @default(0)  // Ticket actuellement en cours de traitement
  totalTickets       Int               @default(0)  // Nombre total de tickets attribués ce jour
  
  entries            QueueEntry[]

  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  // On s'assure qu'il n'y a qu'une seule file d'attente active par médecin et par jour
  @@unique([doctorId, date])
  @@index([date])
}

```

---

## 💬 3. Système d'Alertes WhatsApp Twilio (+212)

Afin d'offrir une expérience marocaine typique et bilingue, l'application génère automatiquement des messages dans la langue préférée de l'utilisateur :

- **À la Validation du RDV** : Un message contenant le numéro de ticket de file, le rappel de l'emplacement et l'heure.
- **Rappel d'Approche "Noubetek Qrabat" (نوبتك قربات)** : Émis lorsque le patient est le prochain sur la liste d'attente pour l'inviter à se présenter d'urgence au cabinet.
- **Avis de Retard Global** : Permet au secrétariat d'envoyer un message groupé à tous les patients en attente de la journée pour annoncer un retard médical général de l'ordre de `+20min` ou `+30min`, afin qu’ils modifient leur heure de départ et évitent d'encombrer la clinique.

---

## 🛠️ 4. Comment Pousser ce Projet sur votre Git GitHub

Comme l'indique l'image téléchargée, voici les lignes de commandes exactes pour lier ce dossier local à votre dépôt GitHub distant :

1. Ouvrez votre terminal à la racine de ce dossier et initialisez git :
   ```bash
   git init
   ```

2. Ajoutez l'ensemble des fichiers (exclus d'office par notre `.gitignore` de sécurité) :
   ```bash
   git add .
   ```

3. Créez votre première sauvegarde locale (first commit) :
   ```bash
   git commit -m "feat: initialisation du SaaS Chifaâ Maroc avec files temps réel"
   ```

4. Configurez la branche principale et liez-la à votre dépôt GitHub distant :
   ```bash
   git branch -M main
   git remote add origin https://github.com/mahmoudmohamed628/Medical-Queue-Appointment-SaaS.git
   ```

5. Envoyez le code vers GitHub :
   ```bash
   git push -u origin main
   ```

---

## 🖥️ 5. Lancement Local de l'Application

Pour l'exécuter localement sur votre ordinateur :

1. Installez les paquets requis :
   ```bash
   npm install
   ```

2. Lancez le serveur de développement full-stack bilingue en direct :
   ```bash
   npm run dev
   ```

Votre plateforme de santé sera alors accessible localement pour vos démonstrations !
