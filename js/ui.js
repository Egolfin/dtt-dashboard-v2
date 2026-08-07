// ==========================================
// js/ui.js
// USER INTERFACE & RENDERING ENGINE
// ==========================================

window.AppUI = {
    
    // 1. Initialize the main HTML shell
    initShell: function() {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <!-- File Upload Zone -->
            <section class="glass-card rounded-2xl p-6 text-center border border-gray-800 hover:border-indigo-500/50 transition-all duration-300 mb-6">
                <div id="dropZone" class="cursor-pointer group">
                    <input type="file" id="csvFileInput" accept=".csv" class="hidden" />
                    <div class="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-semibold text-gray-200 mt-3">Drop outreach call report CSV here</h3>
                    <p id="fileNameDisplay" class="text-xs font-mono text-indigo-400 mt-2 hidden"></p>
                </div>
            </section>

            <!-- Global Filters & Controls -->
            <div id="appControls" class="hidden space-y-6 mb-6">
                <section class="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="app.setPresetPeriod('weekly')" id="btnWeekly" class="btn-period active px-4 py-2 rounded-xl text-xs font-semibold border border-gray-800 bg-gray-900 text-gray-300 hover:text-white">Weekly</button>
                        <button onclick="app.setPresetPeriod('monthly')" id="btnMonthly" class="btn-period px-4 py-2 rounded-xl text-xs font-semibold border border-gray-800 bg-gray-900 text-gray-300 hover:text-white">Monthly</button>
                    </div>

                    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <select id="teamSelect" onchange="app.renderActiveTab()" class="bg-gray-900 border border-gray-800 text-indigo-300 font-medium rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
                            <option value="ALL">All Teams (Managers)</option>
                            <!-- Teams injected dynamically -->
                        </select>
                        <input type="text" id="searchRep" oninput="app.renderActiveTab()" placeholder="Search rep..." class="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 flex-1 sm:w-36">
                    </div>
                </section>
            </div>

            <!-- Dynamic Tab Content Container -->
            <div id="tab-content-container"></div>
        `;

        // Populate the team dropdown dynamically based on data.js mapping
        const teamSelect = document.getElementById('teamSelect');
        Object.keys(teamMapping).forEach(manager => {
            let opt = document.createElement('option');
            opt.value = manager;
            opt.textContent = manager + "'s Team";
            teamSelect.appendChild(opt);
        });
    },

    // 2. Render the Advanced Metrics Tab (Decision Maker Connect Rate)
    renderMetricsTab: function(startDateStr, endDateStr, searchRep, selectedTeam) {
        const container = document.getElementById('tab-content-container');
        
        let html = `
        <section class="glass-card rounded-2xl border border-gray-800 p-2">
            <div class="p-4 border-b border-gray-800/80 bg-gray-900/40 flex justify-between items-center text-xs">
                <div>
                    <h2 class="font-semibold text-gray-200 text-base">Decision Maker Connect Rate</h2>
                    <p class="text-[11px] text-gray-400">Target: > 15% | Date Range: ${startDateStr} to ${endDateStr}</p>
                </div>
            </div>
            <div class="overflow-auto max-h-[600px] relative">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-gray-900/90 text-gray-400 uppercase tracking-wider text-[11px] font-semibold border-b border-gray-800 sticky-header">
                        <tr>
                            <th class="py-3 px-4 sticky-col">Rep Name</th>
                            <th class="py-3 px-4 text-center">Total DM Calls</th>
                            <th class="py-3 px-4 text-center">Connected DM Calls</th>
                            <th class="py-3 px-4 text-center">Connect Rate %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800/60 font-mono">
        `;

        // Get sorted reps
        const sortedReps = Array.from(window.AppState.allKnownReps).sort();
        let hasData = false;

        sortedReps.forEach(rep => {
            if (rep.toLowerCase().includes(searchRep.toLowerCase()) && isRepInTeam(rep, selectedTeam)) {
                
                // Fetch metric from metrics.js
                const metrics = window.AppMetrics.getDecisionMakerConnectRate(startDateStr, endDateStr, rep, selectedTeam);
                
                // Only show reps that actually dialed Decision Makers
                if (metrics.total > 0) {
                    hasData = true;
                    
                    // Simple Color Coding for Connect Rate
                    let rateColor = metrics.rate >= 15 ? 'text-emerald-400 bg-emerald-500/10' : 
                                    metrics.rate >= 10 ? 'text-amber-400 bg-amber-500/10' : 
                                    'text-rose-400 bg-rose-500/10';

                    html += `
                        <tr class="hover:bg-gray-800/30 transition">
                            <td class="py-3 px-4 font-sans font-medium text-gray-200 sticky-col">${rep}</td>
                            <td class="py-3 px-4 text-center text-gray-400">${metrics.total}</td>
                            <td class="py-3 px-4 text-center text-gray-300 font-bold">${metrics.connected}</td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2.5 py-1 rounded font-bold ${rateColor} border border-gray-700">
                                    ${metrics.rate}%
                                </span>
                            </td>
                        </tr>
                    `;
                }
            }
        });

        if (!hasData) {
            html += `<tr><td colspan="4" class="py-8 text-center text-gray-500 font-sans">No Decision Maker calls logged for this criteria.</td></tr>`;
        }

        html += `</tbody></table></div></section>`;
        container.innerHTML = html;
    },

    // 3. Render Blank State (For Matrix & Manual records while we build app.js)
    renderPlaceholder: function(title) {
        const container = document.getElementById('tab-content-container');
        container.innerHTML = `
            <div class="glass-card rounded-2xl p-12 text-center border border-gray-800">
                <h2 class="text-lg font-bold text-gray-200 mb-2">${title}</h2>
                <p class="text-sm text-gray-500">View successfully switched. Data will render here.</p>
            </div>
        `;
    }
};
