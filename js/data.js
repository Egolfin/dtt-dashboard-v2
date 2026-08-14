// ==========================================
// js/data.js
// CORE DATA ENGINE & LOCAL STORAGE
// ==========================================

window.AppState = {
    rawCallData: [],
    manualEntries: [],
    parsedDates: [],
    allKnownReps: new Set(),
    currentMode: 'weekly',
    fileName: '',
    selectedQuarter: '1',
    selectedTeam: 'ALL',
    startDateStr: '',
    endDateStr: ''
};

const teamMapping = {
    "Alejandro Bustos": [
        "Allen Hodgson",
        "Walter Salazar",
        "Alejandro Fonseca",
        "Kevin Cordero",
        "Valentina Henriquez",
        "Esteban Robles",
        "Cristhian Castro",
        "Jose Gonzalez",
        "Kiara Molina",
        "Sharon Mora",
        "Eduardo Murillo",
        "Fabiana Quiros",
        "Jeremy Chaves"
    ],

    "Emmanuel Jara": [
        "Bryan Garcia",
        "Kiurwen West",
        "Gareck Zuniga",
        "Gareck Zuñiga",
        "Sebastian Hernandez",
        "Sergio Villegas",
        "Erick Pacheco",
        "Kiara Blanco",
        "Valeria Carvajal",
        "Alejandro Monge",
        "Aaron Gomez",
        "Aaron Gómez",
        "Hector Arroyo",
        "Felipe Sancho",
        "Francis Viales"
    ],

    "Ericka Jimenez": [
        "David Cordero",
        "Marcel Torres",
        "Jorge Salgado",
        "Jorge Zuniga",
        "Jorge Zuñiga",
        "Yorlibeth Aguirre",
        "Kenny Segura",
        "Brenda Diaz",
        "Jose Perez",
        "Anthonny Castro",
        "Josua Brown",
        "Johayling Melendez"
    ],

    "Maria Jose Herrera": [
        "Sebastian Rodriguez",
        "Valeria Quiros",
        "Jean Carlo Torres",
        "Jean Torres",
        "Pablo Granados",
        "Dylan Cordero",
        "Jose Carmona",
        "Mariela Chaves",
        "Maria Diaz",
        "Esteban Golfin",
        "Neigel Solano",
        "Mariano Orozco",
        "Frank Mesen",
        "Jeremy Perez",
        "Vito Nicollini"
    ],

    "Pamela Robles": [
        "Alvaro Brenes",
        "Avaro Brenes",
        "Tifanny Ramos",
        "Catalina Garcia",
        "Catalina García",
        "Gerlin Rivera",
        "Maria Ramirez",
        "Ana Palacios",
        "Mariana Gutierrez",
        "Mariana Gutiérrez",
        "Virginia Ardila",
        "Hersan Sancho",
        "Emmanuel Castillo",
        "Dylan Rojas",
        "Mario Mesen",
        "Mario Mesén",
        "Suann Monardez",
        "Yoser Arley"
    ],

    "Samuel Soto": [
        "Orlando Steller"
    ],

    "Saúl Chaves": [
        "Bruno Lara",
        "Santiago Ramirez",
        "Ricardo Urena",
        "Ricardo Ureña",
        "Maricela Miranda",
        "Alvaro Porras",
        "Camila Zeledon",
        "Victoria Castillo",
        "Juan Hernandez",
        "Sergio Rosales",
        "Pablo Cantillo",
        "Pablo Cantillo Ramirez",
        "Joshua Nunez",
        "Joshua Nuñez",
        "Marck Ali",
        "Ruben Delgado"
    ]
};

function normalizeName(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function isRepInTeam(repName, teamManager) {
    if (teamManager === 'ALL') return true;

    const members = teamMapping[teamManager];

    if (!members) return true;

    return members.some(
        member => normalizeName(member) === normalizeName(repName)
    );
}

function parseDateString(str) {
    if (!str) return null;

    const value = String(str);

    const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const usMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (usMatch) {
        return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    }

    const months = {
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12'
    };

    const textMatch = value.match(
        /([a-zA-Z]{3})\s+(\d{1,2})\s+(\d{4})/
    );

    if (textMatch) {
        const month =
            months[textMatch[1].toLowerCase()];

        if (month) {
            return `${textMatch[3]}-${month}-${textMatch[2].padStart(2, '0')}`;
        }
    }

    const d = new Date(value);

    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return null;
}

function addDaysToStringDate(dateStr, days) {
    if (!dateStr || !dateStr.includes('-')) {
        return dateStr;
    }

    const parts = dateStr.split('-');

    const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
    );

    d.setDate(d.getDate() + days);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function refreshDateFilterOptions() {
    const allDates = [
        ...window.AppState.rawCallData.map(d => d.date),
        ...window.AppState.manualEntries.map(m => m.date)
    ]
        .filter(d => d && d.includes('-'))
        .sort();

    window.AppState.parsedDates =
        [...new Set(allDates)];
}

const DB_NAME = 'DTT_Analytics_Pro_DB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {

            const db = e.target.result;

            if (!db.objectStoreNames.contains('app_state')) {
                db.createObjectStore('app_state');
            }
        };

        request.onsuccess =
            (e) => resolve(e.target.result);

        request.onerror =
            (e) => reject(e.target.error);
    });
}

async function saveAppState() {

    try {

        const db = await openDB();

        const tx =
            db.transaction('app_state', 'readwrite');

        const store =
            tx.objectStore('app_state');

        const stateToSave = {
            ...window.AppState,
            allKnownReps:
                Array.from(window.AppState.allKnownReps)
        };

        store.put(
            stateToSave,
            'current_data'
        );

    } catch (err) {

        console.error(
            'Failed to save state:',
            err
        );
    }
}

function ensureConversionFields() {

    if (!window.AppState.rawCallData) {
        return;
    }

    window.AppState.rawCallData.forEach(call => {

        if (
            !call.conversionStatus ||
            !Array.isArray(call.conversionCategories)
        ) {

            const classification =
                classifyConversion(
                    call.originalNote ||
                    call.note ||
                    ''
                );

            call.conversionStatus =
                classification.status;

            call.conversionCategories =
                classification.categories;

            call.conversionReason =
                classification.reason;

            call.conversionEvidence =
                classification.evidence;
        }
    });
}

function processCSVData(data) {

    window.AppState.rawCallData = [];

    window.AppState.allKnownReps.clear();

    data.forEach(row => {

        const firstName =
            row['User First Name'] ||
            row['User FirstName'] ||
            '';

        const lastName =
            row['User Last Name'] ||
            row['User LastName'] ||
            '';

        const repName =
            `${firstName} ${lastName}`.trim() ||
            row['Prospect Owner Name'] ||
            row['User Name'] ||
            'Unknown Rep';

        let durationSec =
            parseFloat(
                row['Duration in Seconds'] ||
                row['Duration'] ||
                0
            );

        if (isNaN(durationSec)) {
            durationSec = 0;
        }

        /*
            Created At is the source timestamp we use for
            the displayed Date and Time.
        */

        const createdAt =
            (row['Created At'] || '').trim();

        const dateStr =
            createdAt ||
            row['Completed At'] ||
            row['Date'] ||
            '';

        const parsedDate =
            parseDateString(dateStr);

        const purpose =
            (row['Purpose'] || '').trim();

        const disposition =
            (row['Disposition'] || '')
                .trim()
                .toLowerCase();

        const outcome =
            (row['Outcome'] || '').trim();

        const state =
            (row['State'] || '').trim();

        const direction =
            (row['Direction'] || '').trim();

        const from =
            (row['From'] || '').trim();

        const to =
            (row['To'] || '').trim();

        const prospectFirstName =
            (row['Prospect First Name'] || '').trim();

        const prospectLastName =
            (row['Prospect Last Name'] || '').trim();

        const prospectFullName =
            `${prospectFirstName} ${prospectLastName}`.trim();

        const prospectCompany =
            (row['Prospect Company'] || '').trim();

        const originalNote =
            (row['Note'] || '').trim();

        const note =
            originalNote.toLowerCase();

        const recordId =
            String(
                row['Id'] ||
                row['Record Id'] ||
                row['ID'] ||
                ''
            ).trim();

        if (repName && parsedDate) {

            const dtt =
                (durationSec / 60.0) + 1.0;

            const conversion =
                classifyConversion(
                    originalNote
                );

            window.AppState.rawCallData.push({

                // Source audit information
                id: recordId,

                // Rep
                rep: repName,
                userFullName:
                    `${firstName} ${lastName}`.trim(),

                // Dates
                date: parsedDate,
                createdAt: createdAt,
                answeredAt:
                    (row['Answered At'] || '').trim(),
                completedAt:
                    (row['Completed At'] || '').trim(),

                // Call information
                dtt: dtt,
                purpose: purpose,
                disposition: disposition,
                outcome: outcome,
                state: state,
                direction: direction,
                from: from,
                to: to,

                // Prospect
                prospectFirstName:
                    prospectFirstName,

                prospectLastName:
                    prospectLastName,

                prospectFullName:
                    prospectFullName,

                prospectCompany:
                    prospectCompany,

                // Notes
                note: note,
                originalNote: originalNote,

                // Conversion classification
                conversionStatus:
                    conversion.status,

                conversionCategories:
                    conversion.categories,

                conversionReason:
                    conversion.reason,

                conversionEvidence:
                    conversion.evidence
            });

            window.AppState.allKnownReps.add(
                repName
            );
        }
    });

    window.AppState.manualEntries.forEach(
        m => window.AppState.allKnownReps.add(m.rep)
    );

    refreshDateFilterOptions();
}
