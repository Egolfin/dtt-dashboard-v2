// ==========================================
// js/metrics.js
// ROBUST CONVERSION DETECTION + METRICS
// ==========================================

const CONVERSION_PRODUCT_RX = {
    sponsored: /\b(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|sl|ads?|advertis(?:ing|ement|ment)|advertisment|adverticemnt|spon)\b/iu,
    promotion: /\b(?:promos?|promotions?|proms?|pormos?|promotons?|bogos?|bogo|b1g1|buy\s+one\s+get\s+one|sxgy|spend\s+x\s+get\s+y|happy\s+hour|free\s+delivery|co[- ]?fund(?:ed|ing)?|cofund(?:ed|ing)?)\b/iu,
    smartCampaign: /\b(?:smart\s+campaigns?|sc)\b/iu
};

const COMPLETED_ACTION_RX = /\b(?:activated|activate|reactivated|reactivate|re-activated|sold|won|launched|started|start|closed?\s+(?:the\s+)?(?:deal|sale)|set\s*up)\b/iu;
const COMMITMENT_RX = /\b(?:agreed|decided|confirmed|approved)\b.{0,80}\b(?:activate|activated|start|started|run|use|take|set\s*up|continue\s+with)\b/iu;
const FUTURE_ACTION_RX = /\b(?:will|would|wants?|want|willing|ready|going|needs?|plans?|planning|trying|almost|should|supposed)\b.{0,70}\b(?:activate|start|launch|set\s*up|run)\b/iu;
const CONDITIONAL_RX = /\b(?:if|once|after|until|pending|when)\b/iu;
const NEGATIVE_RX = /\b(?:not\s+interested|declined?|refused?|doesn['’]?t\s+want|didn['’]?t\s+want|cancel(?:led)?|deactivat\w*|paused?|stopped|ended)\b/iu;
const EXISTING_STATE_RX = /\b(?:already|currently|still|remain(?:ing)?|previously)\b.{0,70}\bactive\b/iu;
const ACTIVE_CONFIRMATION_RX = /\b(?:now|currently|already|officially|remains?)\b.{0,50}\bactive\b/iu;
const REACTIVATION_RX = /\b(?:reactivated|reactivate|re-activated|reactivation)\b/iu;
const RENEWAL_RX = /\b(?:renewed|renewal|renew)\b/iu;
const SETUP_CALL_RX = /\bset\s*up\b.{0,45}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/iu;
const SOLD_BUSINESS_RX = /\b(?:sold|sell)\b.{0,30}\b(?:resto|restaurant|business|company|location)\b/iu;
const SCHEDULING_AGREEMENT_RX = /\b(?:agreed|decided|confirmed)\b.{0,60}\b(?:call|meeting|follow[- ]?up|appointment)\b/iu;

const NORMALIZATION_REPLACEMENTS = [
    [/\bsponsorlisting\b/giu, 'sponsored listing'],
    [/\bsponsored\s+linsting\b/giu, 'sponsored listing'],
    [/\bsponsored\s+listen\b/giu, 'sponsored listing'],
    [/\bsponsored\s+slitting\b/giu, 'sponsored listing'],
    [/\bsponsore\s+listing\b/giu, 'sponsored listing'],
    [/\bpormos?\b/giu, 'promos'],
    [/\bpromotons?\b/giu, 'promotions'],
    [/\bproms\b/giu, 'promos'],
    [/\badvertisment\b/giu, 'advertisement'],
    [/\badverticemnt\b/giu, 'advertisement'],
    [/\bacivate\b/giu, 'activate'],
    [/\bactivaet\b/giu, 'activate']
];

function normalizeConversionText(value) {
    let text = String(value || '')
        .normalize('NFKC')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[’‘]/g, "'");

    // Turn known section headings into hard line boundaries even when
    // the CSV export flattened the note into one line.
    text = text.replace(
        /(^|\n|\s+)([^\p{L}\p{N}\n]{0,12})\s*(Reason\s+of\s+Call|Key\s+Points?\s*\/?\s*Concerns?|Actions?\s+Taken|Next\s+Steps?|Follow\s*Up)\s*:/giu,
        (_m, prefix, marks, heading) => `${prefix === '\n' ? '\n' : '\n'}${marks}${heading}:`
    );

    text = text.replace(/[ \t]+/g, ' ');

    NORMALIZATION_REPLACEMENTS.forEach(([rx, replacement]) => {
        text = text.replace(rx, replacement);
    });

    return text.trim();
}

function splitNoteSections(note) {
    const normalized = normalizeConversionText(note);
    const matches = [
        ...normalized.matchAll(
            /(?:^|\n)\s*(?:[^\p{L}\p{N}\n]{0,12}\s*)?(reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:/giu
        )
    ];

    if (!matches.length) {
        return [{ type: 'freeform', text: normalized }];
    }

    const sections = [];

    if ((matches[0].index ?? 0) > 0) {
        sections.push({
            type: 'summary',
            text: normalized.slice(0, matches[0].index).trim()
        });
    }

    for (let i = 0; i < matches.length; i++) {
        const start = (matches[i].index ?? 0) + matches[i][0].length;
        const end = i + 1 < matches.length
            ? (matches[i + 1].index ?? normalized.length)
            : normalized.length;

        sections.push({
            type: String(matches[i][1]).replace(/\s+/g, ' ').trim().toLowerCase(),
            text: normalized.slice(start, end).trim()
        });
    }

    return sections;
}

function isFutureSection(sectionType) {
    const type = String(sectionType || '').toLowerCase();
    return type.startsWith('next step') || type.startsWith('follow up');
}

function splitIntoClauses(text) {
    return String(text || '')
        .split(/\n+/)
        .map(v => v.trim())
        .map(v => v.replace(/^[•▪◦●◆■➜➤→\-]+\s*/u, ''))
        .flatMap(v => v.split(/(?<=[.!?])\s+/u))
        .map(v => v.trim())
        .filter(Boolean);
}

function allMatches(regex, text) {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    return [...String(text || '').matchAll(new RegExp(regex.source, flags))];
}

function hasNearbyMatch(text, productRegex, actionRegex, maxDistance = 120) {
    const products = allMatches(productRegex, text);
    const actions = allMatches(actionRegex, text);
    return products.some(p =>
        actions.some(a =>
            Math.abs((p.index ?? 0) - (a.index ?? 0)) <= maxDistance
        )
    );
}

function detectProducts(text) {
    const categories = [];
    if (CONVERSION_PRODUCT_RX.sponsored.test(text)) categories.push('sponsored');
    if (CONVERSION_PRODUCT_RX.promotion.test(text)) categories.push('promotion');
    if (CONVERSION_PRODUCT_RX.smartCampaign.test(text)) categories.push('smart_campaign');
    return categories;
}

function classifyConversion(rawNote) {
    const note = normalizeConversionText(rawNote);

    if (!note) {
        return { status: 'none', categories: [], reason: 'empty_note', evidence: '' };
    }

    const result = {
        status: 'none',
        categories: new Set(),
        reason: null,
        evidence: ''
    };

    for (const section of splitNoteSections(note)) {
        const canProveConversion = !isFutureSection(section.type);

        for (const clause of splitIntoClauses(section.text)) {
            const products = detectProducts(clause);
            if (!products.length) continue;

            products.forEach(p => result.categories.add(p));

            const hasNegative = NEGATIVE_RX.test(clause);
            const hasFuture = FUTURE_ACTION_RX.test(clause);
            const hasExisting = EXISTING_STATE_RX.test(clause);
            const hasActiveConfirmation = ACTIVE_CONFIRMATION_RX.test(clause);
            const hasReactivate = REACTIVATION_RX.test(clause);
            const hasRenewal = RENEWAL_RX.test(clause);
            const setupIsForCall = SETUP_CALL_RX.test(clause);
            const soldBusiness = SOLD_BUSINESS_RX.test(clause);
            const schedulingAgreement = SCHEDULING_AGREEMENT_RX.test(clause);

            const hasCompleted = hasNearbyMatch(
                clause,
                /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*|\bprom\w*|\bbogo\w*|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*|\bsxgy\b|happy\s+hour|free\s+delivery)/iu,
                COMPLETED_ACTION_RX,
                120
            );

            if (
                canProveConversion &&
                hasCompleted &&
                !hasNegative &&
                !hasFuture &&
                !hasExisting &&
                !hasActiveConfirmation &&
                !hasReactivate &&
                !hasRenewal &&
                !setupIsForCall &&
                !soldBusiness &&
                !schedulingAgreement
            ) {
                return {
                    status: 'converted',
                    categories: [...result.categories],
                    reason: 'product_and_completed_action_same_clause',
                    evidence: clause
                };
            }

            const hasCommitment =
                COMMITMENT_RX.test(clause) &&
                !CONDITIONAL_RX.test(clause) &&
                !hasNegative &&
                !hasExisting &&
                !schedulingAgreement;

            if (canProveConversion && hasCommitment && !hasFuture) {
                result.status = 'committed';
                result.reason = 'explicit_unconditional_commitment';
                result.evidence = clause;
                continue;
            }

            if (canProveConversion && hasReactivate && !hasFuture) {
                result.status = 'reactivated';
                result.reason = 'reactivation_detected';
                result.evidence = clause;
                continue;
            }

            if (canProveConversion && hasRenewal && !hasFuture) {
                result.status = 'renewed';
                result.reason = 'renewal_detected';
                result.evidence = clause;
                continue;
            }

            if (hasExisting && result.status === 'none') {
                result.status = 'existing_active';
                result.reason = 'existing_campaign_state';
                result.evidence = clause;
                continue;
            }

            if (hasActiveConfirmation && result.status === 'none') {
                result.status = 'confirmation_only';
                result.reason = 'activation_confirmation';
                result.evidence = clause;
                continue;
            }

            if ((hasFuture || !canProveConversion) && result.status === 'none') {
                result.status = 'future_pending';
                result.reason = 'future_or_pending';
                result.evidence = clause;
                continue;
            }

            if (hasNegative && result.status === 'none') {
                result.status = 'declined';
                result.reason = 'negative_or_deactivation';
                result.evidence = clause;
            }
        }
    }

    return {
        ...result,
        categories: [...result.categories]
    };
}

function isConnectedDisposition(disposition) {
    const value = String(disposition || '').trim().toLowerCase();
    const nonConnects = new Set([
        'left voicemail',
        'no answer',
        'left message',
        'incorrect phone number',
        ''
    ]);
    return !nonConnects.has(value);
}

function getCallClassification(call) {
    if (
        call &&
        call.conversionStatus &&
        Array.isArray(call.conversionCategories)
    ) {
        return {
            status: call.conversionStatus,
            categories: call.conversionCategories,
            reason: call.conversionReason || '',
            evidence: call.conversionEvidence || ''
        };
    }
    return classifyConversion(call?.originalNote || call?.note || '');
}

window.AppMetrics = {
    getDecisionMakerConnectRate(startDate, endDate, searchRep, selectedTeam) {
        let totalDMCalls = 0;
        let connectedDMCalls = 0;
        let convertedCalls = 0;
        let committedCalls = 0;
        let ambiguousCalls = 0;
        let reactivatedCalls = 0;
        let renewedCalls = 0;
        let existingActiveCalls = 0;
        let confirmationOnlyCalls = 0;
        let futurePendingCalls = 0;
        let declinedCalls = 0;
        let sponsoredConversions = 0;
        let promotionConversions = 0;
        let smartOnlyConversions = 0;
        let multiProductConversions = 0;

        const convertedRecords = [];
        const normalizedSearchRep = normalizeName(searchRep);

        window.AppState.rawCallData.forEach(call => {
            const repMatches = !searchRep || normalizeName(call.rep) === normalizedSearchRep;

            if (
                call.date < startDate ||
                call.date > endDate ||
                !repMatches ||
                !isRepInTeam(call.rep, selectedTeam)
            ) {
                return;
            }

            if (String(call.purpose || '').trim().toLowerCase() !== 'decision maker call') {
                return;
            }

            totalDMCalls++;

            if (!isConnectedDisposition(call.disposition)) {
                return;
            }

            connectedDMCalls++;

            const classification = getCallClassification(call);
            const categories = classification.categories || [];

            const hasSponsored = categories.includes('sponsored');
            const hasPromotion = categories.includes('promotion');
            const hasSmart = categories.includes('smart_campaign');

            if (classification.status === 'converted') {
                if (hasSponsored || hasPromotion) {
                    convertedCalls++;
                    if (hasSponsored) sponsoredConversions++;
                    if (hasPromotion) promotionConversions++;
                    if (hasSponsored && hasPromotion) multiProductConversions++;
                    convertedRecords.push(call);
                } else if (hasSmart) {
                    smartOnlyConversions++;
                }
            }

            switch (classification.status) {
                case 'committed': committedCalls++; break;
                case 'ambiguous': ambiguousCalls++; break;
                case 'reactivated': reactivatedCalls++; break;
                case 'renewed': renewedCalls++; break;
                case 'existing_active': existingActiveCalls++; break;
                case 'confirmation_only': confirmationOnlyCalls++; break;
                case 'future_pending': futurePendingCalls++; break;
                case 'declined': declinedCalls++; break;
            }
        });

        const connectRate = totalDMCalls > 0
            ? Number(((connectedDMCalls / totalDMCalls) * 100).toFixed(1))
            : 0;

        const conversionRate = connectedDMCalls > 0
            ? Number(((convertedCalls / connectedDMCalls) * 100).toFixed(1))
            : 0;

        return {
            total: totalDMCalls,
            connected: connectedDMCalls,
            rate: connectRate,
            sales: convertedCalls,
            convertedCalls,
            committedCalls,
            ambiguousCalls,
            reactivatedCalls,
            renewedCalls,
            existingActiveCalls,
            confirmationOnlyCalls,
            futurePendingCalls,
            declinedCalls,
            sponsoredConversions,
            promotionConversions,
            smartOnlyConversions,
            multiProductConversions,
            convertedRecords,
            conversionRate
        };
    }
};
