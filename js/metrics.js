// ==========================================
// js/metrics.js
// ADVANCED METRICS & CALCULATIONS
// ==========================================

window.AppMetrics = {
    
    getDecisionMakerConnectRate: function(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        let estimatedSales = 0;
        
        // Dispositions that do NOT count as a human connect
        const nonConnects = ['left voicemail', 'no answer', 'left message', 'incorrect phone number', ''];
        
        // REGEX MATCHING: \b ensures we only match whole words.
        // This prevents "deactivate" from matching "activate", or "wholesale" from matching "sale".
        const saleRegex = /\b(sale|sales|sold|deal|won|closed|activate|activated|activation|activations|contract|contracts)\b/i;
        
        window.AppState.rawCallData.forEach(call => {
            // 1. Filter by Date, Rep, and Team
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                // 2. Filter by Decision Maker calls only
                if (call.purpose && call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    let disp = (call.disposition || '').toLowerCase().trim();
                    
                    // 3. Filter by True Human Connects
                    if (disp !== '' && !nonConnects.includes(disp)) {
                        connectedDMCalls++;
                        
                        // 4. Check for Sales Keywords safely using Word Boundaries
                        if (saleRegex.test(call.note)) {
                            
                            // Optional Hardening: Ignore notes that explicitly say "cancel" or "deactivate" near our keywords
                            const negativeRegex = /\b(cancel|deactivate|deactivated|no deal|not interested)\b/i;
                            if (!negativeRegex.test(call.note)) {
                                estimatedSales++;
                            }
                        }
                    }
                }
            }
        });

        // 5. Calculate percentages securely (avoiding division by zero)
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
