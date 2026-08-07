// ==========================================
// js/metrics.js
// ADVANCED METRICS & CALCULATIONS
// ==========================================

window.AppMetrics = {
    
    /**
     * Calculates Decision Maker Connect Rate for a specific date range, team, and rep.
     * Formula: (True DM Connects / Total DM Calls) * 100
     */
    getDecisionMakerConnectRate: function(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        
        // Define dispositions that do NOT count as a connect
        const nonConnects = [
            'left voicemail', 
            'no answer', 
            'left message', 
            'incorrect phone number',
            '' // Ignore blank dispositions (failed dials, canceled, etc.)
        ];
        
        window.AppState.rawCallData.forEach(call => {
            
            // 1. Check if the call falls within our active filters
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                // 2. Check if it's a Decision Maker Call
                if (call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    // 3. A true connect is when a human answers, meaning the disposition
                    // is NOT in our nonConnects list.
                    if (call.disposition && !nonConnects.includes(call.disposition)) {
                        connectedDMCalls++;
                    }
                }
            }
        });

        // Calculate percentage securely
        let connectRate = totalDMCalls > 0 ? ((connectedDMCalls / totalDMCalls) * 100).toFixed(1) : 0;

        return {
            total: totalDMCalls,
            connected: connectedDMCalls,
            rate: parseFloat(connectRate)
        };
    }
};
