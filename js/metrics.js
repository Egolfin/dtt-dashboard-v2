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
        
        // ==========================================
        // RESEARCH-BASED SALE DETECTION DICTIONARIES
        // Based on YTD Rep Note Analysis
        // ==========================================

        // 1. PRODUCT VOCABULARY (Must contain at least one to avoid generic "campaign" confusion)
        const productRegex = /\b(sponsored\s+listings?|sponsor\s+listing|sl|ads?|advertising|advertisement|spon|sponsored\s+listen|sponsored\s+slitting|promos?|promotions?|smart\s+campaigns?|sc|smart|bogo|b1g1|buy\s+one\s+get\s+one|spend\s+x\s+get\s+y|sxgy|happy\s+hour|free\s+delivery|co-?funded|cofund)\b/i;

        // 2. ADOPTION VERBS (Must contain at least one confirmation of completion/current state)
        const actionRegex = /\b(activat\w*|active|live|sold|won|close\s+(deal|sale)|closed\s+(deal|sale)|set\s*up|we\s+took|took|agreed?|decided?|reactivat\w*|renew\w*)\b/i;

        // 3. EXCLUSION / FUTURE INTENT (If the note contains these, reject the sale as it's just a pitch/follow-up)
        const exclusionRegex = /\b(pitch\w*|interested|not\s+interested|tri(ed|y)\s+to\s+sell|will\s+activate|call\s+to\s+activate|follow\s*up\s+to|check\s+if|check\s+whether|send\s+link|send\s+email|pending|planned\s+to|overnight)\b/i;


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
                        
                        // 4. Evaluate the Note based on the research dictionaries
                        if (call.note) {
                            let note = call.note;
                            
                            // A valid sale requires a Product Mention AND an Adoption Verb
                            let hasProduct = productRegex.test(note);
                            let hasAction = actionRegex.test(note);
                            let hasExclusion = exclusionRegex.test(note);

                            if (hasProduct && hasAction && !hasExclusion) {
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
