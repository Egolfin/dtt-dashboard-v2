// ==========================================
// js/metrics.js
// ADVANCED METRICS & CALCULATIONS
// ==========================================

window.AppMetrics = {
    
    getDecisionMakerConnectRate: function(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        
        const nonConnects = ['left voicemail', 'no answer', 'left message', 'incorrect phone number', ''];
        
        window.AppState.rawCallData.forEach(call => {
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                if (call.purpose && call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    // Safely check disposition. If undefined, defaults to empty string
                    let disp = (call.disposition || '').toLowerCase().trim();
                    
                    if (disp !== '' && !nonConnects.includes(disp)) {
                        connectedDMCalls++;
                    }
                }
            }
        });

        let connectRate = totalDMCalls > 0 ? ((connectedDMCalls / totalDMCalls) * 100).toFixed(1) : 0;

        return {
            total: totalDMCalls,
            connected: connectedDMCalls,
            rate: parseFloat(connectRate)
        };
    }
};
