// ==========================================
// js/data.js
// CORE DATA ENGINE & LOCAL STORAGE
// ==========================================

const DATA_SCHEMA_VERSION = 2;

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
    endDateStr: ''
};


// ==========================================
// TEAM MAPPING
// ==========================================

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


// ==========================================
// NAME NORMALIZATION
// ==========================================

function normalizeName(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}


function isRepInTeam(repName, teamManager) {

    if (teamManager === 'ALL') {
        return true;
    }

    const members =
        teamMapping[teamManager];

    if (!members) {
        return true;
    }

    return members.some(
        member =>
            normalizeName(member) ===
            normalizeName(repName)
    );
}


// ==========================================
// DATE PARSER
// ==========================================

function parseDateString(str) {

    if (!str) {
        return null;
    }

    const value =
        String(str).trim();

    const isoMatch =
        value.match(
            /(\d{4})-(\d{2})-(\d{2})/
        );

    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const usMatch =
        value.match(
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/
        );

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

    const textMatch =
        value.match(
            /([a-zA-Z]{3})\s+(\d{1,2})\s+(\d{4})/
        );

    if (textMatch) {

        const month =
            months[
                textMatch[1].toLowerCase()
            ];

        if (month) {
            return `${textMatch[3]}-${month}-${textMatch[2].padStart(2, '0')}`;
        }
    }

    const d =
        new Date(value);

    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return null;
}


// ==========================================
// DATE HELPERS
// ==========================================

function addDaysToStringDate(
    dateStr,
    days
) {

    if (
        !dateStr ||
        !dateStr.includes('-')
    ) {
        return dateStr;
    }

    const parts =
        dateStr.split('-');

    const d =
        new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );

    d.setDate(
        d.getDate() + days
    );

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function refreshDateFilterOptions() {

    const allDates = [

        ...window.AppState.rawCallData
            .map(d => d.date),

        ...window.AppState.manualEntries
            .map(m => m.date)

    ]
        .filter(
            d =>
                d &&
                d.includes('-')
        )
        .sort();

    window.AppState.parsedDates =
        [...new Set(allDates)];
}


// ==========================================
// INDEXED DB
// ==========================================

const DB_NAME =
    'DTT_Analytics_Pro_DB';

const DB_VERSION = 2;


function openDB() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );

            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;

                    if (
                        !db.objectStoreNames
                            .contains('app_state')
                    ) {

                        db.createObjectStore(
                            'app_state'
                        );
                    }
                };

            request.onsuccess =
                event =>
                    resolve(
                        event.target.result
                    );

            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}


async function saveAppState() {

    try {

        const db =
            await openDB();

        const tx =
            db.transaction(
                'app_state',
                'readwrite'
            );

        const store =
            tx.objectStore(
                'app_state'
            );

        const stateToSave = {

            ...window.AppState,

            schemaVersion:
                DATA_SCHEMA_VERSION,

            allKnownReps:
                Array.from(
                    window.AppState.allKnownReps
                )
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


// ==========================================
// CSV PROCESSOR
// ==========================================

function processCSVData(data) {

    window.AppState.rawCallData = [];

    window.AppState.allKnownReps.clear();

    data.forEach(row => {

        /*
            ALWAYS READ THE EXACT CSV HEADERS.
        */

        const userFirstName =
            String(
                row['User First Name'] ||
                ''
            );

        const userLastName =
            String(
                row['User Last Name'] ||
                ''
            );

        const userFullName =
            `${userFirstName} ${userLastName}`
                .trim();

        const repName =
            userFullName ||
            String(
                row['Prospect Owner Name'] ||
                row['User Name'] ||
                'Unknown Rep'
            );


        /*
            RAW CALL FIELDS
            ----------------
            Do not normalize these.
        */

        const id =
            String(
                row['Id'] ||
                ''
            );

        const state =
            String(
                row['State'] ||
                ''
            );

        const createdAt =
            String(
                row['Created At'] ||
                ''
            );

        const answeredAt =
            String(
                row['Answered At'] ||
                ''
            );

        const completedAt =
            String(
                row['Completed At'] ||
                ''
            );

        const durationRaw =
            String(
                row['Duration in Seconds'] ||
                row['Duration'] ||
                ''
            );

        const direction =
            String(
                row['Direction'] ||
                ''
            );

        const from =
            String(
                row['From'] ||
                ''
            );

        const to =
            String(
                row['To'] ||
                ''
            );

        const outcome =
            String(
                row['Outcome'] ||
                ''
            );

        const purpose =
            String(
                row['Purpose'] ||
                ''
            ).trim();

        const disposition =
            String(
                row['Disposition'] ||
                ''
            ).trim();


        /*
            PROSPECT
        */

        const prospectFirstName =
            String(
                row['Prospect First Name'] ||
                ''
            ).trim();

        const prospectLastName =
            String(
                row['Prospect Last Name'] ||
                ''
            ).trim();

        const prospectFullName =
            `${prospectFirstName} ${prospectLastName}`
                .trim();

        const prospectCompany =
            String(
                row['Prospect Company'] ||
                ''
            ).trim();


        /*
            IMPORTANT:
            Keep the Note EXACTLY as it appears
            in the CSV.

            No lowercase.
            No trim that removes line breaks.
            No whitespace replacement.
        */

        const originalNote =
            String(
                row['Note'] ||
                ''
            );


        /*
            Detection gets a separate copy.
            It can normalize this internally.
        */

        const conversion =
            classifyConversion(
                originalNote
            );


        let durationSec =
            parseFloat(
                durationRaw
            );

        if (isNaN(durationSec)) {
            durationSec = 0;
        }


        const dateForFilter =
            parseDateString(
                createdAt ||
                completedAt
            );


        if (
            repName &&
            dateForFilter
        ) {

            const dtt =
                (durationSec / 60) +
                1;


            window.AppState.rawCallData
                .push({

                    /*
                        Exact CSV fields
                    */

                    id:

                        id,

                    state:

                        state,

                    createdAt:

                        createdAt,

                    answeredAt:

                        answeredAt,

                    completedAt:

                        completedAt,

                    durationSec:

                        durationSec,

                    direction:

                        direction,

                    from:

                        from,

                    to:

                        to,

                    outcome:

                        outcome,

                    purpose:

                        purpose,

                    disposition:

                        disposition,


                    /*
                        User
                    */

                    userFirstName:

                        userFirstName,

                    userLastName:

                        userLastName,

                    userFullName:

                        userFullName,


                    /*
                        Prospect
                    */

                    prospectFirstName:

                        prospectFirstName,

                    prospectLastName:

                        prospectLastName,

                    prospectFullName:

                        prospectFullName,

                    prospectCompany:

                        prospectCompany,


                    /*
                        Existing dashboard fields
                    */

                    rep:

                        repName,

                    date:

                        dateForFilter,

                    dtt:

                        dtt,


                    /*
                        NOTE
                        Original value preserved.
                    */

                    note:

                        originalNote,

                    originalNote:

                        originalNote,


                    /*
                        Conversion classification
                    */

                    conversionStatus:

                        conversion.status,

                    conversionCategories:

                        conversion.categories,

                    conversionReason:

                        conversion.reason,

                    conversionEvidence:

                        conversion.evidence
                });

            window.AppState.allKnownReps
                .add(repName);
        }
    });


    window.AppState.schemaVersion =
        DATA_SCHEMA_VERSION;

    window.AppState.fileName =
        window.AppState.fileName ||
        'CSV Import';


    window.AppState.manualEntries
        .forEach(
            entry =>
                window.AppState
                    .allKnownReps
                    .add(entry.rep)
        );


    refreshDateFilterOptions();

    saveAppState();
}
