// ==========================================
// js/metrics.js
// ADVANCED METRICS & CONVERSION CALCULATIONS
// ==========================================

/*
    CONVERSION MODEL

    Product:
        sponsored
        promotion
        smart_campaign

    Status:
        converted
        committed
        reactivated
        renewed
        ambiguous
        existing_active
        confirmation_only
        future_pending
        declined
        none

    IMPORTANT:
    Only "converted" contributes to the strict Sponsored/Promotion
    conversion-rate numerator.

    Smart Campaign remains separate and does not count toward the
    Sponsored Listings / Promotions KPI unless the business definition
    is explicitly changed later.
*/


// ==========================================
// PRODUCT DETECTION
// ==========================================

const CONVERSION_PRODUCT_RX = {

    sponsored:
        /\b(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|sl|ads?|advertis(?:ing|ement|ment)|advertisment|adverticemnt|spon|sponsore\s+listing)\b/i,

    promotion:
        /\b(?:promos?|promotions?|proms?|pormos?|promotons?|bogos?|b1g1|buy\s+one\s+get\s+one|spend\s+x\s+get\s+y|sxgy|happy\s+hour|free\s+delivery|co[- ]?fund(?:ed|ing)?|cofund(?:ed|ing)?)\b/i,

    smartCampaign:
        /\b(?:smart\s+campaigns?|sc)\b/i
};


// ==========================================
// ACTION / STATE DETECTION
// ==========================================

const COMPLETED_ACTION_RX =
    /\b(?:activated|reactivated|re-activated|sold|won|launched|started|closed?\s+(?:the\s+)?(?:deal|sale)|set\s*up)\b/i;

const COMMITMENT_RX =
    /\b(?:agreed|decided|confirmed|approved)\b.{0,50}\b(?:activate|start|run|use|take|set\s*up|continue\s+with)\b/i;

const FUTURE_ACTION_RX =
    /\b(?:will|would|wants?|willing|ready|going|needs?|plans?|trying|almost|should|supposed)\b.{0,40}\b(?:activate|start|launch|set\s*up|run)\b/i;

const CONDITIONAL_RX =
    /\b(?:if|once|after|until|pending)\b/i;

const NEGATIVE_RX =
    /\b(?:not\s+interested|declined?|refused?|doesn['’]?t\s+want|didn['’]?t\s+want|cancel(?:led)?|deactivat\w*|paused?|stopped|ended)\b/i;

const EXISTING_STATE_RX =
    /\b(?:already|currently|still|remain(?:ing)?|keep(?:ing)?|previously)\b.{0,60}\bactive\b/i;

const ACTIVE_CONFIRMATION_RX =
    /\b(?:now|currently|still|already|officially|remains?)\b.{0,40}\bactive\b/i;

const REACTIVATION_RX =
    /\b(?:reactivated|re-activated|reactivate|reactivation)\b/i;

const RENEWAL_RX =
    /\b(?:renewed|renew|renewal)\b/i;


// ==========================================
// FALSE-POSITIVE CONTEXTS
// ==========================================

/*
    Prevent "set up" from turning "set up a call" into a campaign sale.
*/

const SETUP_CALL_RX =
    /\bset\s*up\b.{0,30}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/i;

/*
    Prevent "sold restaurant/resto/business" from becoming a product sale.
*/

const SOLD_BUSINESS_RX =
    /\b(?:sold|sell)\b.{0,20}\b(?:resto|restaurant|business|company|location)\b/i;

/*
    Prevent agreement around scheduling a follow-up from becoming a
    campaign commitment.
*/

const SCHEDULING_AGREEMENT_RX =
    /\b(?:agreed|decided|confirmed)\b.{0,40}\b(?:call|meeting|follow[- ]?up|appointment)\b/i;


// ==========================================
// TYPO NORMALIZATION
// ==========================================

const NORMALIZATION_REPLACEMENTS = [

    [/\bsponsorlisting\b/g, 'sponsored listing'],

    [/\bsponsored\s+linsting\b/g, 'sponsored listing'],

    [/\bsponsored\s+listen\b/g, 'sponsored listing'],

    [/\bsponsored\s+slitting\b/g, 'sponsored listing'],

    [/\bsponsore\s+listing\b/g, 'sponsored listing'],

    [/\bpormos?\b/g, 'promos'],

    [/\bpromotons?\b/g, 'promotions'],

    [/\bproms\b/g, 'promos'],

    [/\badvertisment\b/g, 'advertisement'],

    [/\badverticemnt\b/g, 'advertisement'],

    [/\bacivate\b/g, 'activate'],

    [/\bactivaet\b/g, 'activate']
];


// ==========================================
// NORMALIZE NOTE
// ==========================================

function normalizeConversionText(value) {

    let text = String(value || '')
        .toLowerCase()
        .normalize('NFKC')
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

    NORMALIZATION_REPLACEMENTS.forEach(
        ([regex, replacement]) => {
            text = text.replace(regex, replacement);
        }
    );

    return text;
}


// ==========================================
// SECTION PARSER
// ==========================================

function splitNoteSections(note) {

    const normalized =
        String(note || '').replace(/\r/g, '\n');

    const headingRx =
        /\b(reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:/gi;

    const matches =
        [...normalized.matchAll(headingRx)];

    if (!matches.length) {
        return [
            {
                type: 'freeform',
                text: normalized
            }
        ];
    }

    const sections = [];

    if (matches[0].index > 0) {
        sections.push({
            type: 'summary',
            text: normalized
                .slice(0, matches[0].index)
                .trim()
        });
    }

    for (let i = 0; i < matches.length; i++) {

        const start =
            matches[i].index +
            matches[i][0].length;

        const end =
            i + 1 < matches.length
                ? matches[i + 1].index
                : normalized.length;

        sections.push({
            type: matches[i][1]
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase(),

            text:
                normalized
                    .slice(start, end)
                    .trim()
        });
    }

    return sections;
}


// ==========================================
// FUTURE-ONLY SECTIONS
// ==========================================

function isFutureSection(sectionType) {

    const type =
        String(sectionType || '').toLowerCase();

    return (
        type.startsWith('next step') ||
        type.startsWith('follow up')
    );
}


// ==========================================
// REGEX MATCH LOCATIONS
// ==========================================

function allMatches(regex, text) {

    const flags =
        regex.flags.includes('g')
            ? regex.flags
            : `${regex.flags}g`;

    const globalRegex =
        new RegExp(regex.source, flags);

    return [
        ...String(text || '').matchAll(globalRegex)
    ];
}


// ==========================================
// PRODUCT / ACTION PROXIMITY
// ==========================================

function hasNearbyMatch(
    text,
    productRegex,
    actionRegex,
    maxDistance = 100
) {

    const products =
        allMatches(productRegex, text);

    const actions =
        allMatches(actionRegex, text);

    return products.some(product => {

        return actions.some(action => {

            const productIndex =
                product.index ?? 0;

            const actionIndex =
                action.index ?? 0;

            return (
                Math.abs(
                    productIndex - actionIndex
                ) <= maxDistance
            );
        });
    });
}


// ==========================================
// PRODUCT DETECTOR
// ==========================================

function detectProducts(text) {

    const products = [];

    if (CONVERSION_PRODUCT_RX.sponsored.test(text)) {
        products.push('sponsored');
    }

    if (CONVERSION_PRODUCT_RX.promotion.test(text)) {
        products.push('promotion');
    }

    if (CONVERSION_PRODUCT_RX.smartCampaign.test(text)) {
        products.push('smart_campaign');
    }

    return products;
}


// ==========================================
// CLASSIFY ONE NOTE
// ==========================================

function classifyConversion(rawNote) {

    const note =
        normalizeConversionText(rawNote);

    if (!note) {

        return {
            status: 'none',
            categories: [],
            reason: 'empty_note',
            evidence: ''
        };
    }

    const sections =
        splitNoteSections(note);

    const result = {
        status: 'none',
        categories: new Set(),
        reason: null,
        evidence: ''
    };


    for (const section of sections) {

        /*
            Next Steps and Follow Up can describe intended future
            actions, but cannot independently prove a completed sale.
        */

        const canProveConversion =
            !isFutureSection(section.type);


        /*
            Break structured notes into smaller clauses.
        */

        const clauses =
            section.text
                .split(/[\n•;\/]+|(?<=[.!?])\s+/)
                .map(value => value.trim())
                .filter(Boolean);


        for (const clause of clauses) {

            const products =
                detectProducts(clause);

            if (!products.length) {
                continue;
            }

            products.forEach(product => {
                result.categories.add(product);
            });


            // ------------------------------------------
            // NEGATIVE / EXISTING / FUTURE CONDITIONS
            // ------------------------------------------

            const hasNegative =
                NEGATIVE_RX.test(clause);

            const hasExisting =
                EXISTING_STATE_RX.test(clause);

            const hasActiveConfirmation =
                ACTIVE_CONFIRMATION_RX.test(clause);

            const hasFuture =
                FUTURE_ACTION_RX.test(clause);

            const hasReactivate =
                REACTIVATION_RX.test(clause);

            const hasRenewal =
                RENEWAL_RX.test(clause);


            // ------------------------------------------
            // CONTEXT SAFETY
            // ------------------------------------------

            const setupIsForCall =
                SETUP_CALL_RX.test(clause);

            const soldBusiness =
                SOLD_BUSINESS_RX.test(clause);

            const schedulingAgreement =
                SCHEDULING_AGREEMENT_RX.test(clause);


            // ------------------------------------------
            // COMPLETED ACTION
            // ------------------------------------------

            const hasCompleted =
                hasNearbyMatch(
                    clause,

                    /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*\b|\bprom\w*\b|\bbogo\w*\b|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*\b|\bsxgy\b|happy\s+hour|free\s+delivery)/i,

                    COMPLETED_ACTION_RX,

                    100
                );


            // ------------------------------------------
            // STRICT CONVERSION
            // ------------------------------------------

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
                    reason:
                        'product_and_completed_action_same_clause',
                    evidence: clause
                };
            }


            // ------------------------------------------
            // REACTIVATION
            // ------------------------------------------

            if (
                canProveConversion &&
                hasReactivate &&
                !hasNegative &&
                !hasFuture
            ) {

                result.status = 'reactivated';
                result.reason =
                    'reactivation_detected';
                result.evidence = clause;

                continue;
            }


            // ------------------------------------------
            // RENEWAL
            // ------------------------------------------

            if (
                canProveConversion &&
                hasRenewal &&
                !hasNegative &&
                !hasFuture
            ) {

                result.status = 'renewed';
                result.reason =
                    'renewal_detected';
                result.evidence = clause;

                continue;
            }


            // ------------------------------------------
            // EXPLICIT COMMITMENT
            // ------------------------------------------

            const hasCommitment =
                COMMITMENT_RX.test(clause) &&
                !CONDITIONAL_RX.test(clause) &&
                !hasNegative &&
                !hasExisting &&
                !schedulingAgreement;


            if (
                canProveConversion &&
                hasCommitment &&
                !hasFuture
            ) {

                result.status = 'committed';
                result.reason =
                    'explicit_unconditional_commitment';
                result.evidence = clause;

                continue;
            }


            // ------------------------------------------
            // EXISTING / CONFIRMATION
            // ------------------------------------------

            if (
                hasExisting
            ) {

                if (result.status === 'none') {

                    result.status =
                        'existing_active';

                    result.reason =
                        'existing_campaign_state';

                    result.evidence = clause;
                }

                continue;
            }


            if (
                hasActiveConfirmation
            ) {

                if (result.status === 'none') {

                    result.status =
                        'confirmation_only';

                    result.reason =
                        'activation_confirmation';

                    result.evidence = clause;
                }

                continue;
            }


            // ------------------------------------------
            // FUTURE / PENDING
            // ------------------------------------------

            if (
                hasFuture ||
                !canProveConversion
            ) {

                if (result.status === 'none') {

                    result.status =
                        'future_pending';

                    result.reason =
                        'future_or_pending';

                    result.evidence = clause;
                }

                continue;
            }


            // ------------------------------------------
            // NEGATIVE
            // ------------------------------------------

            if (
                hasNegative
            ) {

                if (result.status === 'none') {

                    result.status =
                        'declined';

                    result.reason =
                        'negative_or_deactivation';

                    result.evidence = clause;
                }
            }
        }
    }


    return {
        ...result,
        categories: [...result.categories]
    };
}


// ==========================================
// KPI HELPER
// ==========================================

function isSponsoredOrPromotionConversion(
    classification,
    includeCommitments = false
) {

    if (!classification) {
        return false;
    }

    const validStatus =
        includeCommitments
            ? (
                classification.status === 'converted' ||
                classification.status === 'committed'
            )
            : classification.status === 'converted';

    if (!validStatus) {
        return false;
    }

    return (
        classification.categories.includes('sponsored') ||
        classification.categories.includes('promotion')
    );
}


// ==========================================
// CONNECTIVITY
// ==========================================

function isConnectedDisposition(disposition) {

    const nonConnects = new Set([
        'left voicemail',
        'no answer',
        'left message',
        'incorrect phone number',
        ''
    ]);

    return !nonConnects.has(
        String(disposition || '')
            .toLowerCase()
            .trim()
    );
}


// ==========================================
// CLASSIFICATION ACCESSOR
// ==========================================

function getCallClassification(call) {

    /*
        New records already contain classification.

        Older records persisted in IndexedDB may not. In that case,
        classify the original note dynamically.
    */

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

    return classifyConversion(
        call?.originalNote ||
        call?.note ||
        ''
    );
}


// ==========================================
// ADVANCED METRICS
// ==========================================

window.AppMetrics = {

    getDecisionMakerConnectRate:
        function(
            startDate,
            endDate,
            searchRep,
            selectedTeam
        ) {

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


            window.AppState.rawCallData.forEach(call => {

                const normalizedCallRep =
                    normalizeName(call.rep);

                const normalizedSearchRep =
                    normalizeName(searchRep);

                /*
                    Exact equality is used here because this function
                    calculates an individual rep's KPI.

                    The UI search box may still use substring matching.
                */

                const repMatches =
                    !searchRep ||
                    normalizedCallRep === normalizedSearchRep;


                if (
                    call.date < startDate ||
                    call.date > endDate ||
                    !repMatches ||
                    !isRepInTeam(call.rep, selectedTeam)
                ) {
                    return;
                }


                if (
                    !call.purpose ||
                    call.purpose.toLowerCase() !==
                        'decision maker call'
                ) {
                    return;
                }


                totalDMCalls++;


                const connected =
                    isConnectedDisposition(
                        call.disposition
                    );


                if (!connected) {
                    return;
                }


                connectedDMCalls++;


                const classification =
                    getCallClassification(call);


                const categories =
                    classification.categories || [];


                const hasSponsored =
                    categories.includes('sponsored');

                const hasPromotion =
                    categories.includes('promotion');

                const hasSmart =
                    categories.includes('smart_campaign');


                if (
                    classification.status ===
                    'converted'
                ) {

                    const countsForRequestedKPI =
                        hasSponsored ||
                        hasPromotion;


                    if (countsForRequestedKPI) {

                        convertedCalls++;

                        if (hasSponsored) {
                            sponsoredConversions++;
                        }

                        if (hasPromotion) {
                            promotionConversions++;
                        }

                        if (
                            hasSponsored &&
                            hasPromotion
                        ) {
                            multiProductConversions++;
                        }

                    } else if (
                        hasSmart &&
                        !hasSponsored &&
                        !hasPromotion
                    ) {

                        smartOnlyConversions++;
                    }
                }


                switch (classification.status) {

                    case 'committed':
                        committedCalls++;
                        break;

                    case 'ambiguous':
                        ambiguousCalls++;
                        break;

                    case 'reactivated':
                        reactivatedCalls++;
                        break;

                    case 'renewed':
                        renewedCalls++;
                        break;

                    case 'existing_active':
                        existingActiveCalls++;
                        break;

                    case 'confirmation_only':
                        confirmationOnlyCalls++;
                        break;

                    case 'future_pending':
                        futurePendingCalls++;
                        break;

                    case 'declined':
                        declinedCalls++;
                        break;
                }
            });


            const connectRate =
                totalDMCalls > 0
                    ? Number(
                        (
                            connectedDMCalls /
                            totalDMCalls *
                            100
                        ).toFixed(1)
                    )
                    : 0;


            /*
                STRICT CONVERSION RATE

                Numerator:
                    Converted Sponsored Listing calls
                    +
                    Converted Promotion calls

                Denominator:
                    Connected Decision Maker calls

                Smart-only calls do NOT count.
                Commitments do NOT count.
                Existing active campaigns do NOT count.
                Future intent does NOT count.
            */

            const conversionRate =
                connectedDMCalls > 0
                    ? Number(
                        (
                            convertedCalls /
                            connectedDMCalls *
                            100
                        ).toFixed(1)
                    )
                    : 0;


            return {

                total:
                    totalDMCalls,

                connected:
                    connectedDMCalls,

                rate:
                    connectRate,

                /*
                    Backwards-compatible property.
                    UI can continue using metrics.sales.
                */
                sales:
                    convertedCalls,

                conversionRate:
                    conversionRate,

                convertedCalls:
                    convertedCalls,

                committedCalls:
                    committedCalls,

                ambiguousCalls:
                    ambiguousCalls,

                reactivatedCalls:
                    reactivatedCalls,

                renewedCalls:
                    renewedCalls,

                existingActiveCalls:
                    existingActiveCalls,

                confirmationOnlyCalls:
                    confirmationOnlyCalls,

                futurePendingCalls:
                    futurePendingCalls,

                declinedCalls:
                    declinedCalls,

                sponsoredConversions:
                    sponsoredConversions,

                promotionConversions:
                    promotionConversions,

                smartOnlyConversions:
                    smartOnlyConversions,

                multiProductConversions:
                    multiProductConversions
            };
        }
};
