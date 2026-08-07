// ==========================================
// js/ui.js
// ADVANCED METRICS UI RENDERER
// ==========================================

window.AppUI = {
    renderMetricsTab: function(startDateStr, endDateStr, searchRep, selectedTeam) {
        const thead = document.getElementById('metricsTableHead');
        const tbody = document.getElementById('metricsTableBody');
        
        document.getElementById('metricsDateRange').textContent = `Target: > 15% | Date Range: ${startDateStr} to ${endDateStr}`;

        thead.innerHTML = `
            <tr>
                <th class="py-3 px-4 sticky-col">Rep Name</th>
                <th class="py-3 px-4 text-center">Total DM Calls</th>
                <th class="py-3 px-4 text-center">Connected DM Calls</th>
                <th class="py-3 px-4 text-center">Connect Rate %</th>
            </tr>
        `;

        let bodyHTML = '';
        const sortedReps = Array.from(window.AppState.allKnownReps).sort();
        let hasData = false;

        sortedReps.forEach(rep => {
            if (rep.toLowerCase().includes(searchRep.toLowerCase()) && isRepInTeam(rep, selectedTeam)) {
                
                const metrics = window.AppMetrics.getDecisionMakerConnectRate(startDateStr, endDateStr, rep, selectedTeam);
                
                if (metrics.total > 0) {
                    hasData = true;
                    
                    let rateColor = metrics.rate >= 15 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                                    metrics.rate >= 10 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 
                                    'text-rose-400 bg-rose-500/10 border-rose-500/20';

                    bodyHTML += `
                        <tr class="hover:bg-gray-800/30 transition">
                            <td class="py-3 px-4 font-sans font-medium text-gray-200 sticky-col">${rep}</td>
                            <td class="py-3 px-4 text-center text-gray-400">${metrics.total}</td>
                            <td class="py-3 px-4 text-center text-gray-300 font-bold">${metrics.connected}</td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2.5 py-1 rounded font-bold ${rateColor} border">
                                    ${metrics.rate}%
                                </span>
                            </td>
                        </tr>
                    `;
                }
            }
        });

        if (!hasData) {
            bodyHTML = `<tr><td colspan="4" class="py-8 text-center text-gray-500 font-sans">No Decision Maker calls logged for this criteria.</td></tr>`;
        }

        tbody.innerHTML = bodyHTML;
    }
};
