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

// --- TEAM / MANAGER MAPPING ---
const teamMapping = {
    "Alejandro Bustos": ["Allen Hodgson", "Walter Salazar", "Alejandro Fonseca", "Kevin Cordero", "Valentina Henriquez", "Esteban Robles", "Cristhian Castro", "Jose Gonzalez", "Kiara Molina", "Sharon Mora", "Eduardo Murillo", "Fabiana Quiros", "Jeremy Chaves"],
    "Emmanuel Jara": ["Bryan Garcia", "Kiurwen West", "Gareck Zuniga", "Gareck Zuñiga", "Sebastian Hernandez", "Sergio Villegas", "Erick Pacheco", "Kiara Blanco", "Valeria Carvajal", "Alejandro Monge", "Aaron Gomez", "Aaron Gómez", "Hector Arroyo", "Felipe Sancho", "Francis Viales"],
    "Ericka Jimenez": ["David Cordero", "Marcel Torres", "Jorge Salgado", "Jorge Zuniga", "Jorge Zuñiga", "Yorlibeth Aguirre", "Kenny Segura", "Brenda Diaz", "Jose Perez", "Anthonny Castro", "Josua Brown", "Johayling Melendez"],
    "Maria Jose Herrera": ["Sebastian Rodriguez", "Valeria Quiros", "Jean Carlo Torres", "Jean Torres", "Pablo Granados", "Dylan Cordero", "Jose Carmona", "Mariela Chaves", "Maria Diaz", "Esteban Golfin", "Neigel Solano", "Mariano Orozco", "Frank Mesen", "Jeremy Perez", "Vito Nicollini"],
    "Pamela Robles": ["Alvaro Brenes", "Avaro Brenes", "Tifanny Ramos", "Catalina Garcia", "Catalina García", "Gerlin Rivera", "Maria Ramirez", "Ana Palacios", "Mariana Gutierrez", "Mariana Gutiérrez", "Virginia Ardila", "Hersan Sancho", "Emmanuel Castillo", "Dylan Rojas", "Mario Mesen", "Mario Mesén", "Suann Monardez", "Yoser Arley"],
    "Samuel Soto": ["Orlando Steller"],
    "Saúl Chaves": ["Bruno Lara", "Santiago Ramirez", "Ricardo Urena", "Ricardo Ureña", "Maricela Miranda", "Alvaro Porras", "Camila Zeledon", "Victoria Castillo", "Juan Hernandez", "Sergio Rosales", "Pablo Cantillo", "Pablo Cantillo Ramirez", "Joshua Nunez", "Joshua Nuñez", "Marck Ali", "Ruben Delgado"]
};

// --- HELPER FUNCTIONS ---
function normalizeName(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isRepInTeam(repName, teamManager) {
    if (teamManager === 'ALL') return true;
    const members = teamMapping[teamManager];
    if (!members) return true;
    const normRep = normalizeName(repName);
    return members.some(m => normalizeName(m) === normRep);
}

function parseDateString(str) {
    if (!str) return null;
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const usMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const textMatch = str.match(/([a-zA-Z]{3})\s+(\d{1,2})\s+(\d{4})/);
    if (textMatch) {
        const month = months[textMatch[1].toLowerCase()];
        if (month) return `${textMatch[3]}-${month}-${textMatch[2].padStart(2, '0')}`;
    }
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
}

function addDaysToStringDate(dateStr, days) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function refreshDateFilterOptions() {
    const allDates = [...window.AppState.rawCallData.map(d => d.date), ...window.AppState.manualEntries.map(m => m.date)]
        .filter(d => d && d.includes('-')).sort();
    window.AppState.parsedDates = [...new Set(allDates)];
}

// --- INDEXED DB STORAGE ---
const DB_NAME = 'DTT_Analytics_Pro_DB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('app_state')) db.createObjectStore('app_state');
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveAppState() {
    try {
        const db = await openDB();
        const tx = db.transaction('app_state', 'readwrite');
        const store = tx.objectStore('app_state');
        
        // Convert Set to Array before saving
        const stateToSave = { ...window.AppState, allKnownReps: Array.from(window.AppState.allKnownReps) };
        store.put(stateToSave, 'current_data');
    } catch (err) {
        console.error('Failed to save state:', err);
    }
}

// --- CSV PROCESSING ENGINE ---
function processCSVData(data) {
    window.AppState.rawCallData = [];
    window.AppState.allKnownReps.clear();

    data.forEach(row => {
        let firstName = row['User First Name'] || row['User FirstName'] || '';
        let lastName = row['User Last Name'] || row['User LastName'] || '';
        let repName = `${firstName} ${lastName}`.trim() || row['Prospect Owner Name'] || row['User Name'] || 'Unknown Rep';

        let durationSec = parseFloat(row['Duration in Seconds'] || row['Duration'] || 0);
        if (isNaN(durationSec)) durationSec = 0;

        let dateStr = row['Created At'] || row['Completed At'] || row['Date'] || '';
        let parsedDate = parseDateString(dateStr);

        // NEW: Capture Purpose and State for Advanced Metrics
        let purpose = (row['Purpose'] || '').trim();
        let state = (row['State'] || '').trim().toLowerCase();

        if (repName && parsedDate) {
            let dtt = (durationSec / 60.0) + 1.0;
            
            window.AppState.rawCallData.push({ 
                rep: repName, 
                date: parsedDate, 
                dtt: dtt,
                purpose: purpose,   // For tracking Decision Maker Connects
                state: state        // 'completed', 'no_answer', etc.
            });
            window.AppState.allKnownReps.add(repName);
        }
    });

    window.AppState.manualEntries.forEach(m => window.AppState.allKnownReps.add(m.rep));
    refreshDateFilterOptions();
}
