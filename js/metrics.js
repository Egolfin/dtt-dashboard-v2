// ==========================================
// js/metrics.js
// ADVANCED METRICS & CALCULATIONS
// ==========================================

window.AppMetrics = {
    
    getDecisionMakerConnectRate: function(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        let estimatedSales = 0;
        
        const nonConnects = ['left voicemail', 'no answer', 'left message', 'incorrect phone number', ''];
        
        // Keywords that indicate a sale/activation happened on the call
        const saleKeywords = ['sale', 'sold', 'deal', 'won', 'closed', 'activat', 'contract'];
        
        window.AppState.rawCallData.forEach(call => {
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                if (call.purpose && call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    let disp = (call.disposition || '').toLowerCase().trim();
                    
                    // If it's a true human connect
                    if (disp !== '' && !nonConnects.includes(disp)) {
                        connectedDMCalls++;
                        
                        // Check if the call note contains any of the sale keywords
                        let hasSale = saleKeywords.some(keyword => call.note.includes(keyword));
                        if (hasSale) {
                            estimatedSales++;
                        }
                    }
                }
            }
        });

        let connectRate = totalDMCalls > 0 ? ((connectedDMCalls / totalDMCalls) * 100).toFixed(1) : 0;
        let conversionRate = connectedDMCalls > 0 ? ((estimatedSales / connectedDMCalls) * 100).toFixed(1) : 0;

        return {
            total: totalDMCalls,
            connected: connectedDMCalls,
            rate: parseFloat(connectRate),
            sales: estimatedSales,
            conversionRate: parseFloat(conversionRate)
        };
    }
};
