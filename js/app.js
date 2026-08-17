// ==========================================
// js/app.js
// MAIN APPLICATION CONTROLLER
// ==========================================

function updateRepDatalist() {
    const datalist = document.getElementById('repOptions');
    if (!datalist) return;
    datalist.innerHTML = Array.from(window.AppState.allKnownReps)
        .sort((a, b) => a.localeCompare(b))
        .map(rep => `<option value="${String(rep).replace(/"/g, '&quot;')}"></option>`)
        .join('');
}

window.app = {
    activeTab: 'matrix',

    init: function() {
        this.setupDragAndDrop();
        this.setupEventListeners();
        this.updateStats();
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

    setupEventListeners: function() {
        // Main Manual Add
        document.getElementById('manualDTTForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addManualRecord(
                document.getElementById('manualRepInput').value,
                document.getElementById('manualDateInput').value,
                document.getElementById('manualMinutesInput').value,
                e.target
            );
        });

        // Tab Manual Add
        document.getElementById('manualDTTFormTab')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addManualRecord(
                document.getElementById('manualRepInputTab').value,
                document.getElementById('manualDateInputTab').value,
                document.getElementById('manualMinutesInputTab').value,
                e.target
            );
        });

        // Exports
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            let tableId = this.activeTab === 'metrics' ? 'metricsTable' : 'dttTable';
            let sheetName = this.activeTab === 'metrics' ? 'DM_Connect_Rate' : 'DTT_Report';
            let fileName = this.activeTab === 'metrics' ? 'Decision_Maker_Connect_Rate.xlsx' : 'DTT_Performance_Summary.xlsx';
            const table = document.getElementById(tableId);
            const wb = XLSX.utils.table_to_book(table, { sheet: sheetName });
            XLSX.writeFile(wb, fileName);
        });

        document.getElementById('exportManualExcelBtn')?.addEventListener('click', () => {
            if (window.AppState.manualEntries.length === 0) { alert("No manual entries to export."); return; }
            const exportData = window.AppState.manualEntries.map(entry => ({
                "Rep Name": entry.rep, "Date": entry.date, "DTT Minutes": entry.dtt, "Logged Timestamp": entry.timestamp || ""
            }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Manual_DTT_Logs");
            XLSX.writeFile(wb, "Manual_DTT_Records.xlsx");
        });

        document.getElementById('exportPdfBtn')?.addEventListener('click', () => window.print());
    },

    handleFile: function(file) {
        if (!file) return;

        const status = document.getElementById('fileNameDisplay');
        if (status) {
            status.classList.remove('hidden');
            status.textContent = `Loading: ${file.name}...`;
        }

        window.AppState.fileName = file.name;
        window.AppState.rawCallData = [];
        window.AppState.parsedDates = [];
        window.AppState.allKnownReps = new Set();
        window.AppState.schemaVersion = DATA_SCHEMA_VERSION;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: false,
            encoding: 'UTF-8',
            worker: false,
            transformHeader: (header) => String(header ?? '').replace(/^\uFEFF/, '').trim(),

            complete: (results) => {
                const validation = validateCSVHeaders(results.meta?.fields || []);

                if (!validation.valid) {
                    const message = `CSV header mismatch. Missing: ${validation.missing.join(', ')}`;
                    console.error(message, results.meta);
                    if (status) status.textContent = message;
                    alert(message);
                    return;
                }

                if (results.errors?.length) {
                    console.warn('CSV parser warnings:', results.errors);
                }

                const accepted = processCSVData(results.data, results.meta?.fields || []);

                if (!accepted) {
                    const message = 'The CSV was read, but no valid call rows were found.';
                    if (status) status.textContent = message;
                    alert(message);
                    return;
                }

                window.AppState.fileName = file.name;
                window.AppState.schemaVersion = DATA_SCHEMA_VERSION;
                window.AppState.rawHeaders = results.meta?.fields || [];

                if (status) {
                    status.classList.remove('text-rose-400');
                    status.classList.add('text-indigo-400');
                    status.textContent = `Loaded: ${file.name} • ${accepted.toLocaleString()} valid call rows`;
                }

                document.getElementById('appControls')?.classList.remove('hidden');
                document.getElementById('matrixTableSection')?.classList.remove('hidden');
                this.updateStats();
                this.setPresetPeriod('weekly');
                updateRepDatalist();
                saveAppState();
            },

            error: (error) => {
                console.error('CSV parsing error:', error);
                const message = `CSV parsing failed: ${error?.message || error}`;
                if (status) status.textContent = message;
                alert(message);
            }
        });
    },

    async loadStateAndRender() {
        try {
            const db = await openDB();
            const tx = db.transaction('app_state', 'readonly');
            const request = tx.objectStore('app_state').get('current_data');

            request.onsuccess = () => {
                const savedState = request.result;

                if (!savedState) {
                    return;
                }

                // Manual entries/preferences can be restored.
                window.AppState.manualEntries = Array.isArray(savedState.manualEntries)
                    ? savedState.manualEntries
                    : [];

                window.AppState.currentMode = savedState.currentMode || 'weekly';
                window.AppState.selectedQuarter = savedState.selectedQuarter || '1';
                window.AppState.selectedTeam = savedState.selectedTeam || 'ALL';
                window.AppState.startDateStr = savedState.startDateStr || '';
                window.AppState.endDateStr = savedState.endDateStr || '';

                const sample = Array.isArray(savedState.rawCallData) ? savedState.rawCallData.find(Boolean) : null;

                const schemaIsValid =
                    savedState.schemaVersion === DATA_SCHEMA_VERSION &&
                    Array.isArray(savedState.rawCallData) &&
                    savedState.rawCallData.length > 0 &&
                    sample &&
                    typeof sample.raw === 'object' &&
                    Object.prototype.hasOwnProperty.call(sample.raw, 'Id') &&
                    Object.prototype.hasOwnProperty.call(sample.raw, 'Created At') &&
                    Object.prototype.hasOwnProperty.call(sample.raw, 'Note');

                if (!schemaIsValid) {
                    console.info('Old/stale call data found. Waiting for a fresh CSV upload.');

                    window.AppState.rawCallData = [];
                    window.AppState.parsedDates = [];
                    window.AppState.allKnownReps = new Set(
                        window.AppState.manualEntries.map(entry => entry.rep).filter(Boolean)
                    );

                    const status = document.getElementById('fileNameDisplay');
                    if (status && savedState.rawCallData?.length) {
                        status.classList.remove('hidden');
                        status.classList.add('text-amber-400');
                        status.textContent = 'Previous call data was outdated. Please upload the CSV again.';
                    }

                    updateRepDatalist();
                    this.updateStats();
                    return;
                }

                window.AppState = {
                    ...window.AppState,
                    ...savedState,
                    allKnownReps: new Set(savedState.allKnownReps || []),
                    manualEntries: Array.isArray(savedState.manualEntries) ? savedState.manualEntries : [],
                    schemaVersion: DATA_SCHEMA_VERSION
                };

                refreshDateFilterOptions();
                updateRepDatalist();
                this.updateStats();

                const status = document.getElementById('fileNameDisplay');
                if (status) {
                    status.classList.remove('hidden');
                    status.textContent = `Loaded: ${window.AppState.fileName || 'Saved CSV'} (restored)`;
                }

                document.getElementById('appControls')?.classList.remove('hidden');
                document.getElementById('matrixTableSection')?.classList.remove('hidden');
                if (document.getElementById('teamSelect')) {
                    document.getElementById('teamSelect').value = window.AppState.selectedTeam || 'ALL';
                }
                this.setPresetPeriod(window.AppState.currentMode || 'weekly');
            };
        } catch (error) {
            console.warn('No valid saved state found.', error);
        }
    },

    updateStats: function() {
        const calls = window.AppState.rawCallData?.length || 0;
        const reps = window.AppState.allKnownReps?.size || 0;

        const totalEl = document.getElementById('statTotalCalls');
        const repsEl = document.getElementById('statActiveReps');
        const bar = document.getElementById('statsBar');

        if (totalEl) totalEl.textContent = calls.toLocaleString();
        if (repsEl) repsEl.textContent = reps.toLocaleString();
        if (bar) bar.classList.toggle('hidden', calls === 0);
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'text-gray-300', 'border-indigo-500'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.add('text-gray-400', 'border-transparent'));
        
        const activeBtn = document.getElementById(`tab-${tab}`);
        activeBtn.classList.remove('text-gray-400', 'border-transparent');
        activeBtn.classList.add('active', 'text-gray-300', 'border-indigo-500');

        // Toggle Views
        document.getElementById('sharedTopSection').classList.add('hidden');
        document.getElementById('matrixTableSection').classList.add('hidden');
        document.getElementById('metricsTableSection').classList.add('hidden');
        document.getElementById('manualTabView').classList.add('hidden');

        if (tab === 'matrix') {
            document.getElementById('sharedTopSection').classList.remove('hidden');
            if(window.AppState.rawCallData.length > 0) document.getElementById('matrixTableSection').classList.remove('hidden');
        } else if (tab === 'metrics') {
            document.getElementById('sharedTopSection').classList.remove('hidden');
            if(window.AppState.rawCallData.length > 0) document.getElementById('metricsTableSection').classList.remove('hidden');
        } else if (tab === 'manual') {
            document.getElementById('manualTabView').classList.remove('hidden');
        }

        this.renderActiveTab();
    },

    setPresetPeriod: function(mode) {
        window.AppState.currentMode = mode;
        document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
        
        const btnMap = { 'weekly': 'btnWeekly', 'monthly': 'btnMonthly', 'qtd': 'btnQTD', 'custom': 'btnCustom' };
        if (btnMap[mode]) document.getElementById(btnMap[mode]).classList.add('active');

        const customSec = document.getElementById('customDateSection');
        const qtdSec = document.getElementById('qtdSection');

        if (mode === 'custom') { customSec.classList.remove('hidden'); qtdSec.classList.add('hidden'); }
        else if (mode === 'qtd') { customSec.classList.add('hidden'); qtdSec.classList.remove('hidden'); }
        else { customSec.classList.add('hidden'); qtdSec.classList.add('hidden'); }

        if (window.AppState.parsedDates.length === 0) return;
        const maxDateStr = window.AppState.parsedDates[window.AppState.parsedDates.length - 1];
        let startStr = maxDateStr, endStr = maxDateStr;

        if (mode === 'weekly') {
            const parts = maxDateStr.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const diffToMon = d.getDay() === 0 ? -6 : 1 - d.getDay();
            startStr = addDaysToStringDate(maxDateStr, diffToMon);
        } else if (mode === 'monthly') {
            const parts = maxDateStr.split('-');
            startStr = `${parts[0]}-${parts[1]}-01`;
            const lastDay = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate();
            endStr = `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`;
        } else if (mode === 'qtd') {
            const y = maxDateStr.split('-')[0];
            const q = parseInt(document.getElementById('quarterSelect').value, 10);
            if (q === 1) { startStr = `${y}-01-01`; endStr = `${y}-03-31`; }
            else if (q === 2) { startStr = `${y}-04-01`; endStr = `${y}-06-30`; }
            else if (q === 3) { startStr = `${y}-07-01`; endStr = `${y}-09-30`; }
            else if (q === 4) { startStr = `${y}-10-01`; endStr = `${y}-12-31`; }
        }

        if (mode !== 'custom') {
            document.getElementById('startDate').value = startStr;
            document.getElementById('endDate').value = endStr;
        }

        window.AppState.startDateStr = document.getElementById('startDate').value;
        window.AppState.endDateStr = document.getElementById('endDate').value;
        
        this.renderActiveTab();
        saveAppState();
    },

    addManualRecord: function(rep, date, mins, formElement) {
        rep = rep.trim();
        mins = parseFloat(mins);
        if (rep && date && !isNaN(mins) && mins > 0) {
            window.AppState.manualEntries.push({ id: Date.now(), rep, date, dtt: mins, timestamp: new Date().toLocaleString() });
            window.AppState.allKnownReps.add(rep);
            updateRepDatalist();
            refreshDateFilterOptions();
            document.getElementById('manualBadgeCount').textContent = window.AppState.manualEntries.length;
            this.renderActiveTab();
            this.updateStats();
            saveAppState();
            if (formElement) formElement.reset();
        }
    },

    removeManualEntry: function(id) {
        window.AppState.manualEntries = window.AppState.manualEntries.filter(m => m.id !== id);
        document.getElementById('manualBadgeCount').textContent = window.AppState.manualEntries.length;
        saveAppState();
        this.updateStats();
        this.renderActiveTab();
    },

    renderActiveTab: function() {
        if (!window.AppState.rawCallData || window.AppState.rawCallData.length === 0) return;

        window.AppState.startDateStr = document.getElementById('startDate').value;
        window.AppState.endDateStr = document.getElementById('endDate').value;
        const start = window.AppState.startDateStr;
        const end = window.AppState.endDateStr;
        const search = document.getElementById('searchRep')?.value || '';
        const team = document.getElementById('teamSelect')?.value || 'ALL';

        if (this.activeTab === 'matrix') this.renderMatrixTab(start, end, search, team);
        else if (this.activeTab === 'metrics') window.AppUI.renderMetricsTab(start, end, search, team);
        else if (this.activeTab === 'manual') this.renderManualTab();
    },

    renderMatrixTab: function(startDateStr, endDateStr, searchRep, selectedTeam) {
        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        const tfoot = document.getElementById('tableFoot');

        if (!startDateStr || !endDateStr) {
            thead.innerHTML = ''; tfoot.innerHTML = '';
            tbody.innerHTML = `<tr><td class="py-8 text-center text-rose-500 font-sans">Error: Invalid Date Range.</td></tr>`;
            return;
        }

        const teamLabel = selectedTeam === 'ALL' ? '' : ` • Team: ${selectedTeam}`;
        document.getElementById('reportHeaderTitle').textContent = `DTT Performance Summary (${window.AppState.currentMode.toUpperCase()}${teamLabel})`;
        document.getElementById('reportSubtitle').textContent = `Range: ${startDateStr} to ${endDateStr} • Formula: (Duration/60) + 1 min`;

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
            if (item.date >= startDateStr && item.date <= endDateStr && item.rep.toLowerCase().includes(searchRep.toLowerCase()) && isRepInTeam(item.rep, selectedTeam)) {
                if (!aggregated[item.rep]) aggregated[item.rep] = {};
                if (!aggregated[item.rep][item.date]) aggregated[item.rep][item.date] = 0;
                aggregated[item.rep][item.date] += item.dtt;
                repTotals[item.rep] = (repTotals[item.rep] || 0) + item.dtt;
            }
        };

        window.AppState.rawCallData.forEach(processItem);
        window.AppState.manualEntries.forEach(processItem);

        const sortedReps = Object.keys(aggregated).sort();

        if (window.AppState.currentMode === 'qtd') {
            const monthsInQ = [];
            activeDates.forEach(d => {
                const key = d.slice(0, 7); 
                if (!monthsInQ.some(m => m.key === key)) {
                    const parts = d.split('-');
                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    monthsInQ.push({ name: monthNames[parseInt(parts[1], 10) - 1], key });
                }
            });

            let headerHTML = `<tr><th class="py-3 px-4 text-left border-b border-gray-800 text-gray-300 sticky-col">Rep Name</th>`;
            monthsInQ.forEach(m => { headerHTML += `<th class="py-3 px-6 text-center border-b border-gray-800">${m.name} Total</th>`; });
            headerHTML += `<th class="py-3 px-4 text-center border-b border-gray-800 bg-gray-900/90 text-gray-200">Quarter Total</th></tr>`;
            thead.innerHTML = headerHTML;

            let bodyHTML = '';
            const monthTotals = {};
            monthsInQ.forEach(m => monthTotals[m.key] = 0);
            let overallGrandTotal = 0;

            sortedReps.forEach(rep => {
                bodyHTML += `<tr class="hover:bg-gray-800/30 transition"><td class="py-2.5 px-4 font-sans font-medium text-gray-200 sticky-col">${rep}</td>`;
                let qTotal = 0;
                monthsInQ.forEach(m => {
                    let mSum = 0;
                    Object.keys(aggregated[rep] || {}).forEach(dateKey => { if (dateKey.startsWith(m.key)) mSum += aggregated[rep][dateKey]; });
                    monthTotals[m.key] += mSum;
                    qTotal += mSum;
                    bodyHTML += `<td class="py-2.5 px-6 text-center"><span class="px-2.5 py-1 rounded font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">${mSum.toFixed(1)}</span></td>`;
                });
                overallGrandTotal += qTotal;
                bodyHTML += `<td class="py-2.5 px-4 text-center bg-gray-900/50"><span class="px-2 py-0.5 rounded font-bold text-emerald-400">${qTotal.toFixed(1)}</span></td></tr>`;
            });

            tbody.innerHTML = bodyHTML || `<tr><td colspan="${monthsInQ.length + 2}" class="py-8 text-center text-gray-500 font-sans">No records found.</td></tr>`;

            let footHTML = `<tr><td class="py-3 px-4 font-sans uppercase tracking-wider text-[11px] text-gray-400 sticky-col">Quarter Total</td>`;
            monthsInQ.forEach(m => { footHTML += `<td class="py-3 px-6 text-center text-indigo-300 font-bold">${monthTotals[m.key].toFixed(1)}</td>`; });
            footHTML += `<td class="py-3 px-4 text-center text-emerald-400 font-bold bg-gray-900">${overallGrandTotal.toFixed(1)}</td></tr>`;
            tfoot.innerHTML = footHTML;

        } else {
            let headerHTML = `<tr><th class="py-3 px-4 text-left border-b border-gray-800 text-gray-300 sticky-col">Rep Name</th>`;
            activeDates.forEach(d => {
                const parts = d.split('-');
                headerHTML += `<th class="py-3 px-3 text-center border-b border-gray-800 min-w-[50px]">${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}</th>`;
            });
            headerHTML += `<th class="py-3 px-4 text-center border-b border-gray-800 bg-gray-900/90 text-gray-200">Total</th></tr>`;
            thead.innerHTML = headerHTML;

            let bodyHTML = '';
            const dateDailyTotals = {};
            activeDates.forEach(d => dateDailyTotals[d] = 0);
            let overallGrandTotal = 0;

            sortedReps.forEach(rep => {
                bodyHTML += `<tr class="hover:bg-gray-800/30 transition"><td class="py-2.5 px-4 font-sans font-medium text-gray-200 sticky-col">${rep}</td>`;
                activeDates.forEach(d => {
                    const val = aggregated[rep][d] || 0;
                    dateDailyTotals[d] += val;
                    const heatClass = val < 50 ? 'heat-red' : val < 70 ? 'heat-yellow' : 'heat-green';
                    bodyHTML += `<td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 rounded ${heatClass}">${val.toFixed(1)}</span></td>`;
                });
                const repTotal = repTotals[rep] || 0;
                overallGrandTotal += repTotal;
                const target = activeDates.length * 70;
                const weeklyHeat = repTotal < (target * 0.714) ? 'heat-red' : repTotal < target ? 'heat-yellow' : 'heat-green';
                bodyHTML += `<td class="py-2.5 px-4 text-center bg-gray-900/50"><span class="px-2 py-0.5 rounded font-bold ${weeklyHeat}">${repTotal.toFixed(1)}</span></td></tr>`;
            });

            tbody.innerHTML = bodyHTML || `<tr><td colspan="${activeDates.length + 2}" class="py-8 text-center text-gray-500 font-sans">No matching rep records found.</td></tr>`;

            let footHTML = `<tr><td class="py-3 px-4 font-sans uppercase tracking-wider text-[11px] text-gray-400 sticky-col">Total DTT</td>`;
            activeDates.forEach(d => { footHTML += `<td class="py-3 px-3 text-center text-gray-300">${dateDailyTotals[d].toFixed(1)}</td>`; });
            footHTML += `<td class="py-3 px-4 text-center text-indigo-400 font-bold bg-gray-900">${overallGrandTotal.toFixed(1)}</td></tr>`;
            tfoot.innerHTML = footHTML;
        }
    },

    renderManualTab: function() {
        const tbody = document.getElementById('manualRecordsTableBody');
        document.getElementById('manualTableCount').textContent = `Total Records: ${window.AppState.manualEntries.length}`;

        if (window.AppState.manualEntries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-500 font-sans">No manual DTT records added yet.</td></tr>`;
            return;
        }

        let html = '';
        const sorted = [...window.AppState.manualEntries].sort((a, b) => b.date.localeCompare(a.date));

        sorted.forEach(entry => {
            html += `<tr class="hover:bg-gray-800/30 transition">
                <td class="py-3 px-4 font-sans font-medium text-gray-200">${entry.rep}</td>
                <td class="py-3 px-4 text-gray-300">${entry.date}</td>
                <td class="py-3 px-4 text-center"><span class="px-2.5 py-1 rounded font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">+${entry.dtt}m</span></td>
                <td class="py-3 px-4 text-center text-gray-500 text-[11px]">${entry.timestamp || '-'}</td>
                <td class="py-3 px-4 text-right"><button onclick="app.removeManualEntry(${entry.id})" class="text-rose-400 hover:text-rose-300 font-sans text-xs bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition">Delete</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
};

window.addEventListener('DOMContentLoaded', () => window.app.init());
