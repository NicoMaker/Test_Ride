# Test Ride — Sistema di prenotazione

Applicazione per prenotare un *test ride* di una moto: il cliente sceglie moto,
data e orario; gli slot si aggiornano in tempo reale (Socket.IO) e vengono
inviate email di conferma a cliente e manager (Nodemailer). I dati sono
persistiti su file JSON.

## Struttura del progetto

Il codice è diviso in **componenti**, ognuno con una responsabilità precisa.

```
Test_Ride/
├── Backend/
│   ├── server.js                 # Entry point: HTTP + Socket.IO, avvio
│   ├── package.json
│   ├── .env.example              # Copia in .env e compila
│   └── src/
│       ├── app.js                # Assembla l'app Express (middleware, route, SPA)
│       ├── config/
│       │   ├── env.js            # Variabili d'ambiente / configurazione
│       │   └── paths.js          # Percorsi dei file di dati
│       ├── routes/               # Definizione endpoint (una per risorsa)
│       │   ├── index.js          # Aggrega le route sotto /api
│       │   ├── companyRoutes.js
│       │   ├── motorcyclesRoutes.js
│       │   ├── bookingsRoutes.js
│       │   └── spaRoutes.js      # Serve index.html per le route non-API
│       ├── controllers/          # Gestione richiesta/risposta HTTP
│       │   ├── companyController.js
│       │   ├── motorcyclesController.js
│       │   └── bookingsController.js
│       ├── services/             # Logica di business
│       │   ├── companyService.js
│       │   ├── motorcyclesService.js
│       │   ├── bookingsService.js
│       │   └── email/            # Sottodominio email
│       │       ├── transporter.js
│       │       ├── emailSender.js
│       │       └── emailTemplates.js
│       ├── repositories/         # Accesso ai dati (file JSON)
│       │   ├── companyRepository.js
│       │   ├── motorcyclesRepository.js
│       │   └── bookingsRepository.js
│       ├── middleware/
│       │   └── errorHandler.js
│       ├── realtime/
│       │   └── socket.js         # Handler Socket.IO
│       └── utils/
│           ├── fileStore.js      # Lettura/scrittura JSON
│           ├── dateFormat.js
│           └── network.js
│
└── frontend/
    ├── index.html
    ├── css/styles.css
    ├── data/                     # "Database" JSON
    │   ├── company-info.json
    │   ├── motorcycles.json
    │   └── bookings.json
    ├── img/
    └── js/
        ├── config/
        │   └── state.js          # Stato globale + helper
        ├── ui/                   # Componenti di interfaccia
        │   ├── notifications.js  # Toast
        │   ├── modals.js         # Loader + modali successo/errore
        │   └── form-view.js      # Viste form, riepilogo, stato connessione
        ├── features/             # Funzionalità
        │   ├── motorcycles.js    # Griglia moto + filtri
        │   ├── slots.js          # Date e fasce orarie
        │   └── booking-form.js   # Wizard prenotazione (step, validazione, invio)
        └── core/
            ├── api.js            # Chiamate API
            ├── realtime.js       # Client Socket.IO
            └── app.js            # Bootstrap + event listener
```

### Il flusso di una richiesta (backend)

```
route  →  controller  →  service  →  repository  →  file JSON
```

Ogni risorsa (company, motorcycles, bookings) ha la sua catena. Il controller
gestisce HTTP, il service la logica (validazione, conflitti), il repository
l'accesso ai dati. Email e realtime sono componenti separati.

## Avvio

```bash
cd Backend
cp .env.example .env      # compila host/porta email
npm install
npm run dev               # oppure: npm start
```

Il server serve anche il frontend statico: apri `http://localhost:3002`.
