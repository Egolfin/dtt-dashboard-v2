// ==========================================
// js/app.js
// MAIN APPLICATION CONTROLLER
// ==========================================

window.app = {
    activeTab: 'matrix',

    init: function() {
        // Initialize the UI Shell from ui.js
        window.AppUI.initShell();
        this.setupDragAndDrop();

        // Load saved state from IndexedDB (defined in data.js)
        this.loadStateAndRender();
    },

    setupDragAndDrop: function() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('csvFileInput');

        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => e.preventDefault());
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFile(e.target.files[0]);
        });
    },

    handleFile: function(file) {
        window.AppState.fileName = file.name;
        document.getElementById('fileNameDisplay').textContent = `File: ${file.name}`;
        document.getElementById('fileNameDisplay').classList.remove('hidden');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Call Data Engine
                processCSVData(results.data);
                
                // Show Controls
                document.getElementById('appControls').classList.remove('hidden');
                
                // Set default period and render
                this.setPresetPeriod('weekly');
            }
        });
    },

    async loadStateAndRender() {
        try {
            const db = await openDB();
            const tx = db.transaction('app_state', 'readonly');
            const store = tx.objectStore('app_state');
            const request = store.get('current_data');
            
            request.onsuccess = () => {
                const savedState = request.result;
                if (savedState) {
                    window.AppState = savedState;
                    // Restore Sets that were serialized as Arrays
                    window.AppState.allKnownReps = new Set(savedState.allKnownReps || []);
                    
                    if (window.AppState.rawCallData && window.AppState.rawCallData.length > 0) {
                        document.getElementById('fileNameDisplay').textContent = `File: ${window.AppState.fileName} (Restored)`;
                        document.getElementById('fileNameDisplay').classList.remove('hidden');
                        document.getElementById('appControls').classList.remove('hidden');
                        
                        document.getElementById('teamSelect').value = window.AppState.selectedTeam || 'ALL';
                        this.setPresetPeriod(window.AppState.currentMode || 'weekly');
                    }
                }
            };
        } catch (err) {
            console.warn("No saved state found or DB error.", err);
        }
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        
        // Update tab styling
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'text-gray-300', 'border-indigo-500'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.add('text-gray-400', 'border-transparent'));
        
        const activeBtn = document.getElementById(`tab-${tab}`);
        activeBtn.classList.remove('text-gray-400', 'border-transparent');
        activeBtn.classList.add('active', 'text-gray-300', 'border-indigo-500');

        this.renderActiveTab();
    },

    setPresetPeriod: function(mode) {
        window.AppState.currentMode = mode;
        document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
        
        const btnMap = { 'weekly': 'btnWeekly', 'monthly': 'btnMonthly', 'qtd': 'btnQTD', 'custom': 'btnCustom' };
        if (btnMap[mode]) document.getElementById(btnMap[mode]).classList.add('active');

        if (window.AppState.parsedDates.length === 0) return;
        const maxDateStr = window.AppState.parsedDates[window.AppState.parsedDates.length - 1];
        
        let startStr = maxDateStr;
        let endStr = maxDateStr;

        if (mode === 'weekly') {
            const parts = maxDateStr.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dayOfWeek = d.getDay(); 
            const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startStr = addDaysToStringDate(maxDateStr, diffToMon);
        } else if (mode === 'monthly') {
            const parts = maxDateStr.split('-');
            startStr = `${parts[0]}-${parts[1]}-01`;
            const lastDay = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate();
            endStr = `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`;
        }

        window.AppState.startDateStr = startStr;
        window.AppState.endDateStr = endStr;
        
        this.renderActiveTab();
        saveAppState();
    },

    renderActiveTab: function() {
        if (!window.AppState.rawCallData || window.AppState.rawCallData.length === 0) return;

        const start = window.AppState.startDateStr;
        const end = window.AppState.endDateStr;
        const search = document.getElementById('searchRep')?.value || '';
        const team = document.getElementById('teamSelect')?.value || 'ALL';

        // Update Badge
        const badge = document.getElementById('manualBadgeCount');
        if (badge) badge.textContent = window.AppState.manualEntries.length;

        if (this.activeTab === 'matrix') {
            this.renderMatrixTab(start, end, search, team);
        } else if (this.activeTab === 'metrics') {
            window.AppUI.renderMetricsTab(start, end, search, team);
        } else if (this.activeTab === 'manual') {
            this.renderManualTab();
        }
    },

    // --- MATRIX TAB RENDERING ---
    renderMatrixTab: function(startDateStr, endDateStr, searchRep, selectedTeam) {
        const container = document.getElementById('tab-content-container');
        
        // Build active dates using pure string arithmetic
        let activeDates = [];
        let currStr = startDateStr;
        let loopGuard = 0;
        while (currStr <= endDateStr && loopGuard < 1000) {
            activeDates.push(currStr);
            currStr = addDaysToStringDate(currStr, 1);
            loopGuard++;
        }

        const aggregated = {};
        const repTotals = {};

        const processItem = (item) => {
            if (item.date >= startDateStr && item.date <= endDateStr && 
                item.rep.toLowerCase().includes(searchRep) && 
                isRepInTeam(item.rep, selectedTeam)) {

                if (!aggregated[item.rep]) aggregated[item.rep] = {};
                if (!aggregated[item.rep][item.date]) aggregated[item.rep][item.date] = 0;

                aggregated[item.rep][item.date] += item.dtt;
                repTotals[item.rep] = (repTotals[item.rep] || 0) + item.dtt;
            }
        };

        window.AppState.rawCallData.forEach(processItem);
        window.AppState.manualEntries.forEach(processItem);

        const sortedReps = Object.keys(aggregated).sort();

        let html = `
        <section class="glass-card rounded-2xl border border-gray-800 p-2">
            <div class="p-4 border-b border-gray-800/80 bg-gray-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                    <h2 class="font-semibold text-gray-200 text-base">DTT Performance Summary</h2>
                    <p class="text-[11px] text-gray-400">Range: ${startDateStr} to ${endDateStr} • Formula: (Duration/60) + 1 min</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-2 py-0.5 rounded text-[10px] heat-red">&lt; 50m</span>
                    <span class="px-2 py-0.5 rounded text-[10px] heat-yellow">50m - 69m</span>
                    <span class="px-2 py-0.5 rounded text-[10px] heat-green">&ge; 70m</span>
                </div>
            </div>
            <div class="overflow-auto max-h-[600px] relative">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-gray-900/90 text-gray-400 uppercase tracking-wider text-[11px] font-semibold border-b border-gray-800 sticky-header">
                        <tr><th class="py-3 px-4 sticky-col">Rep Name</th>
        `;

        activeDates.forEach(d => {
            const parts = d.split('-');
            html += `<th class="py-3 px-3 text-center min-w-[50px]">${parseInt(parts[1])}/${parseInt(parts[2])}</th>`;
        });
        html += `<th class="py-3 px-4 text-center bg-gray-900/90 text-gray-200">Total</th></tr></thead><tbody class="divide-y divide-gray-800/60 font-mono">`;

        let dateDailyTotals = {};
        activeDates.forEach(d => dateDailyTotals[d] = 0);
        let overallGrandTotal = 0;

        if (sortedReps.length === 0) {
            html += `<tr><td colspan="${activeDates.length + 2}" class="py-8 text-center text-gray-500 font-sans">No matching rep records found.</td></tr>`;
        } else {
            sortedReps.forEach(rep => {
                html += `<tr class="hover:bg-gray-800/30 transition"><td class="py-2.5 px-4 font-sans font-medium text-gray-200 sticky-col">${rep}</td>`;
                
                activeDates.forEach(d => {
                    const val = aggregated[rep][d] || 0;
                    dateDailyTotals[d] += val;
                    const heatClass = val < 50 ? 'heat-red' : val < 70 ? 'heat-yellow' : 'heat-green';
                    html += `<td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 rounded ${heatClass}">${val.toFixed(1)}</span></td>`;
                });

                const repTotal = repTotals[rep] || 0;
                overallGrandTotal += repTotal;
                const target = activeDates.length * 70;
                const weeklyHeat = repTotal < (target * 0.714) ? 'heat-red' : repTotal < target ? 'heat-yellow' : 'heat-green';
                
                html += `<td class="py-2.5 px-4 text-center bg-gray-900/50"><span class="px-2 py-0.5 rounded font-bold ${weeklyHeat}">${repTotal.toFixed(1)}</span></td></tr>`;
            });
        }

        html += `</tbody><tfoot class="bg-gray-900/90 font-bold border-t border-gray-800 text-gray-200"><tr><td class="py-3 px-4 font-sans uppercase tracking-wider text-[11px] text-gray-400 sticky-col">Total DTT</td>`;
        activeDates.forEach(d => html += `<td class="py-3 px-3 text-center text-gray-300">${dateDailyTotals[d].toFixed(1)}</td>`);
        html += `<td class="py-3 px-4 text-center text-indigo-400 bg-gray-900">${overallGrandTotal.toFixed(1)}</td></tr></tfoot></table></div></section>`;
        
        container.innerHTML = html;
    },

    // --- MANUAL RECORDS TAB RENDERING ---
    renderManualTab: function() {
        const container = document.getElementById('tab-content-container');
        let html = `
            <section class="glass-card rounded-2xl p-6 border border-indigo-500/20 mb-6">
                <h2 class="text-base font-semibold text-gray-200 mb-4">Manual DTT Log Repository</h2>
                <form id="manualForm" class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                    <input type="text" id="mRep" placeholder="Rep Name" required class="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200">
                    <input type="date" id="mDate" required class="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200">
                    <input type="number" id="mMins" step="0.01" min="0.01" placeholder="Mins (e.g. 64.98)" required class="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200">
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-xl text-xs transition">+ Add Record</button>
                </form>
            </section>
            
            <section class="glass-card rounded-2xl overflow-hidden border border-gray-800">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-gray-900/90 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-800">
                        <tr><th class="py-3 px-4">Rep Name</th><th class="py-3 px-4">Date</th><th class="py-3 px-4 text-center">DTT Minutes</th><th class="py-3 px-4 text-right">Action</th></tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800/60 font-mono text-gray-300">
        `;

        if (window.AppState.manualEntries.length === 0) {
            html += `<tr><td colspan="4" class="py-8 text-center text-gray-500 font-sans">No manual DTT records added yet.</td></tr>`;
        } else {
            const sorted = [...window.AppState.manualEntries].sort((a, b) => b.date.localeCompare(a.date));
            sorted.forEach(entry => {
                html += `
                <tr class="hover:bg-gray-800/30">
                    <td class="py-3 px-4">${entry.rep}</td>
                    <td class="py-3 px-4">${entry.date}</td>
                    <td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300">+${entry.dtt}m</span></td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="app.removeManualEntry(${entry.id})" class="text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">Delete</button>
                    </td>
                </tr>`;
            });
        }
        
        html += `</tbody></table></section>`;
        container.innerHTML = html;

        // Attach event listener for the form
        document.getElementById('manualForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const rep = document.getElementById('mRep').value.trim();
            const date = document.getElementById('mDate').value;
            const mins = parseFloat(document.getElementById('mMins').value);

            if (rep && date && !isNaN(mins)) {
                window.AppState.manualEntries.push({ id: Date.now(), rep, date, dtt: mins });
                window.AppState.allKnownReps.add(rep);
                saveAppState();
                this.renderActiveTab();
            }
        });
    },

    removeManualEntry: function(id) {
        window.AppState.manualEntries = window.AppState.manualEntries.filter(m => m.id !== id);
        saveAppState();
        this.renderActiveTab();
    }
};

// Start the app when the page loads!
window.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
