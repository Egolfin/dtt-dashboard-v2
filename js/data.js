// ==========================================
// js/data.js
// ROBUST CSV DATA ENGINE + LOCAL STORAGE
// ==========================================

const DATA_SCHEMA_VERSION = 11;
const DB_NAME = 'DTT_Analytics_Pro_DB';
const DB_VERSION = 3;

window.AppState = {
    schemaVersion: DATA_SCHEMA_VERSION,
    rawCallData: [],
    manualEntries: [],
    parsedDates: [],
    allKnownReps: new Set(),
    currentMode: 'weekly',
    fileName: '',
    selectedQuarter: '1',
    selectedTeam: 'ALL',
    startDateStr: '',
    endDateStr: '',
    importedAt: ''
};

const teamMapping = {
    "Alejandro Bustos": ["Allen Hodgson","Walter Salazar","Alejandro Fonseca","Kevin Cordero","Valentina Henriquez","Esteban Robles","Cristhian Castro","Jose Gonzalez","Kiara Molina","Sharon Mora","Eduardo Murillo","Fabiana Quiros","Jeremy Chaves"],
    "Emmanuel Jara": ["Bryan Garcia","Kiurwen West","Gareck Zuniga","Gareck Zuñiga","Sebastian Hernandez","Sergio Villegas","Erick Pacheco","Kiara Blanco","Valeria Carvajal","Alejandro Monge","Aaron Gomez","Aaron Gómez","Hector Arroyo","Felipe Sancho","Francis Viales"],
    "Ericka Jimenez": ["David Cordero","Marcel Torres","Jorge Salgado","Jorge Zuniga","Jorge Zuñiga","Yorlibeth Aguirre","Kenny Segura","Brenda Diaz","Jose Perez","Anthonny Castro","Josua Brown","Johayling Melendez"],
    "Maria Jose Herrera": ["Sebastian Rodriguez","Valeria Quiros","Jean Carlo Torres","Jean Torres","Pablo Granados","Dylan Cordero","Jose Carmona","Mariela Chaves","Maria Diaz","Esteban Golfin","Neigel Solano","Mariano Orozco","Frank Mesen","Jeremy Perez","Vito Nicollini"],
    "Pamela Robles": ["Alvaro Brenes","Avaro Brenes","Tifanny Ramos","Catalina Garcia","Catalina García","Gerlin Rivera","Maria Ramirez","Ana Palacios","Mariana Gutierrez","Mariana Gutiérrez","Virginia Ardila","Hersan Sancho","Emmanuel Castillo","Dylan Rojas","Mario Mesen","Mario Mesén","Suann Monardez","Yoser Arley"],
    "Samuel Soto": ["Orlando Steller"],
    "Saúl Chaves": ["Bruno Lara","Santiago Ramirez","Ricardo Urena","Ricardo Ureña","Maricela Miranda","Alvaro Porras","Camila Zeledon","Victoria Castillo","Juan Hernandez","Sergio Rosales","Pablo Cantillo","Pablo Cantillo Ramirez","Joshua Nunez","Joshua Nuñez","Marck Ali","Ruben Delgado"]
};

function normalizeName(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function isRepInTeam(repName, teamManager) {
    if (teamManager === 'ALL') return true;
    const members = teamMapping[teamManager];
    if (!members) return true;
    return members.some(m => normalizeName(m) === normalizeName(repName));
}

function parseDateString(str) {
    if (!str) return null;
    const value = String(str).trim();

    const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const us = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`;

    const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
    const text = value.match(/([a-zA-Z]{3})\s+(\d{1,2})\s+(\d{4})/);
    if (text) {
        const month = months[text[1].toLowerCase()];
        if (month) return `${text[3]}-${month}-${text[2].padStart(2,'0')}`;
    }

    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return null;
}

function addDaysToStringDate(dateStr, days) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y,m,d] = dateStr.split('-').map(Number);
    const date = new Date(y, m-1, d);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function refreshDateFilterOptions() {
    const dates = [
        ...window.AppState.rawCallData.map(x => x.date),
        ...window.AppState.manualEntries.map(x => x.date)
    ].filter(Boolean).sort();
    window.AppState.parsedDates = [...new Set(dates)];
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('app_state')) {
                db.createObjectStore('app_state');
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveAppState() {
    try {
        const db = await openDB();
        const tx = db.transaction('app_state', 'readwrite');
        const store = tx.objectStore('app_state');

        const stateToSave = {
            ...window.AppState,
            schemaVersion: DATA_SCHEMA_VERSION,
            allKnownReps: Array.from(window.AppState.allKnownReps)
        };

        store.put(stateToSave, 'current_data');
    } catch (error) {
        console.error('Failed to save app state:', error);
    }
}

async function clearPersistedCallData() {
    try {
        const db = await openDB();
        const tx = db.transaction('app_state', 'readwrite');
        tx.objectStore('app_state').delete('current_data');
    } catch (error) {
        console.error('Failed to clear persisted state:', error);
    }
}

function validateCSVHeaders(fields) {
    const required = [
        'Id',
        'State',
        'Created At',
        'Direction',
        'To',
        'Purpose',
        'Disposition',
        'Note',
        'User First Name',
        'User Last Name'
    ];

    const fieldSet = new Set(fields || []);
    return {
        valid: required.every(field => fieldSet.has(field)),
        missing: required.filter(field => !fieldSet.has(field))
    };
}

function processCSVData(data, fields = []) {
    window.AppState.rawCallData = [];
    window.AppState.allKnownReps.clear();

    let acceptedRows = 0;

    data.forEach((row, rowIndex) => {
        const userFirstName = String(row['User First Name'] ?? '');
        const userLastName = String(row['User Last Name'] ?? '');
        const userFullName = `${userFirstName} ${userLastName}`.trim();
        const repName = userFullName || String(row['Prospect Owner Name'] ?? row['User Name'] ?? '').trim();

        const durationSec = Number.parseFloat(row['Duration in Seconds'] ?? row['Duration'] ?? 0);
        const safeDuration = Number.isFinite(durationSec) ? durationSec : 0;

        const createdAt = String(row['Created At'] ?? '');
        const answeredAt = String(row['Answered At'] ?? '');
        const completedAt = String(row['Completed At'] ?? '');
        const parsedDate = parseDateString(createdAt || completedAt);

        if (!repName || !parsedDate) return;

        const prospectFirstName = String(row['Prospect First Name'] ?? '').trim();
        const prospectLastName = String(row['Prospect Last Name'] ?? '').trim();
        const prospectFullName = `${prospectFirstName} ${prospectLastName}`.trim();

        // Preserve ALL source fields exactly as imported.
        const raw = { ...row };

        const originalNote = String(raw['Note'] ?? '');
        const classification = classifyConversion(originalNote);

        const record = {
            id: String(raw['Id'] ?? ''),
            state: String(raw['State'] ?? ''),
            createdAt,
            answeredAt,
            completedAt,
            durationSec: safeDuration,
            direction: String(raw['Direction'] ?? ''),
            from: String(raw['From'] ?? ''),
            to: String(raw['To'] ?? ''),
            outcome: String(raw['Outcome'] ?? ''),
            purpose: String(raw['Purpose'] ?? '').trim(),
            disposition: String(raw['Disposition'] ?? '').trim(),
            userFirstName,
            userLastName,
            userFullName,
            prospectFirstName,
            prospectLastName,
            prospectFullName,
            prospectCompany: String(raw['Prospect Company'] ?? '').trim(),
            rep: repName,
            date: parsedDate,
            dtt: (safeDuration / 60) + 1,
            originalNote,
            note: originalNote,
            conversionStatus: classification.status,
            conversionCategories: classification.categories,
            conversionReason: classification.reason,
            conversionEvidence: classification.evidence,
            raw
        };

        window.AppState.rawCallData.push(record);
        window.AppState.allKnownReps.add(repName);
        acceptedRows++;
    });

    window.AppState.schemaVersion = DATA_SCHEMA_VERSION;
    window.AppState.importedAt = new Date().toISOString();
    window.AppState.rawHeaders = fields;
    refreshDateFilterOptions();

    return acceptedRows;
}
