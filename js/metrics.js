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
        // ==========================================

        // 1. PRODUCT VOCABULARY
        const productRegex = /\b(sponsored\s+listings?|sponsor\s+listing|sl|ads?|advertising|advertisement|spon|sponsored\s+listen|sponsored\s+slitting|promos?|promotions?|smart\s+campaigns?|sc|smart|bogo|b1g1|buy\s+one\s+get\s+one|spend\s+x\s+get\s+y|sxgy|happy\s+hour|free\s+delivery|co-?funded|cofund)\b/i;

        // 2. ADOPTION VERBS (Must contain at least one confirmation of completion/current state)
        const actionRegex = /\b(activat\w*|active|live|sold|won|close\s+(deal|sale)|closed\s+(deal|sale)|set\s*up|we\s+took|took|agreed?|decided?|reactivat\w*|renew\w*)\b/i;

        // 3. HARDENED EXCLUSION / FUTURE INTENT
        // Captures future tense (will, should, after), settings activations, and past references (recent)
        const exclusionRegex = /\b(pitch\w*|interested|not\s+interested|tri(ed|y)\s+to\s+sell|will\s+activate|call\s+to\s+activate|follow\s*up\s+to|check\s+if|check\s+whether|send\s+link|send\s+email|pending|planned\s+to|overnight|should\s+be\s+activated|activate\s+after|after\s+(?:.*)\s+is\s+activated|activate\s+the\s+(?:.*)\s+setting|recent\s+activation|remain\s+active|finalize\s+and\s+activate|evaluate\s+and\s+activate|once\s+(?:.*)\s+is\s+active|activate\s+once)\b/i;


        window.AppState.rawCallData.forEach(call => {
            if (call.date >= startDate && call.date <= endDate &&
                call.rep.toLowerCase().includes(searchRep.toLowerCase()) &&
                isRepInTeam(call.rep, selectedTeam)) {
                
                if (call.purpose && call.purpose.toLowerCase() === 'decision maker call') {
                    totalDMCalls++;
                    
                    let disp = (call.disposition || '').toLowerCase().trim();
                    
                    if (disp !== '' && !nonConnects.includes(disp)) {
                        connectedDMCalls++;
                        
                        if (call.note) {
                            let note = call.note;
                            
                            let hasProduct = productRegex.test(note);
                            let hasAction = actionRegex.test(note);
                            let hasExclusion = exclusionRegex.test(note);

                            // If we have a product and an action verb, and NO exclusions triggered
                            if (hasProduct && hasAction && !hasExclusion) {
                                estimatedSales++;
                            }
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
