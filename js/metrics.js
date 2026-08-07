// ==========================================
// js/metrics.js
// ADVANCED METRICS & CALCULATIONS
// ==========================================

window.AppMetrics = {
    
    /**
     * Calculates Decision Maker Connect Rate for a specific date range, team, and rep.
     * Formula: (Completed DM Calls / Total DM Calls) * 100
     */
    getDecisionMakerConnectRate: function(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        
        // Iterate through raw call data from our Data Engine
        window.AppState.rawCallData.forEach(call => {
            
            // 1. Check if the call falls within our active filters
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                // 2. Check if it's a Decision Maker Call
                if (call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    // 3. Check if the call was actually answered/completed
                    if (call.state === 'completed') {
                        connectedDMCalls++;
                    }
                }
            }
        });

        // Calculate percentage securely (avoiding division by zero errors)
        let connectRate = totalDMCalls > 0 ? ((connectedDMCalls / totalDMCalls) * 100).toFixed(1) : 0;

        return {
            total: totalDMCalls,
            connected: connectedDMCalls,
            rate: parseFloat(connectRate)
        };
    }
};
