// ==========================================
// js/metrics.js
// ADVANCED METRICS & CONVERSION CALCULATIONS
// ==========================================


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
// ACTION DETECTION
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
// CONTEXT SAFETY
// ==========================================

const SETUP_CALL_RX =
    /\bset\s*up\b.{0,30}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/i;

const SOLD_BUSINESS_RX =
    /\b(?:sold|sell)\b.{0,20}\b(?:resto|restaurant|business|company|location)\b/i;

const SCHEDULING_AGREEMENT_RX =
    /\b(?:agreed|decided|confirmed)\b.{0,40}\b(?:call|meeting|follow[- ]?up|appointment)\b/i;


// ==========================================
// CORPUS-SPECIFIC TYPO NORMALIZATION
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

    let text =
        String(value || '')
            .toLowerCase()
            .normalize('NFKC')
            .replace(/[’‘]/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

    NORMALIZATION_REPLACEMENTS.forEach(
        ([regex, replacement]) => {
            text = text.replace(
                regex,
                replacement
            );
        }
    );

    return text;
}


// ==========================================
// STRUCTURED NOTE PARSER
// ==========================================

function splitNoteSections(note) {

    const normalized =
        String(note || '')
            .replace(/\r/g, '\n');

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
            text:
                normalized
                    .slice(
                        0,
                        matches[0].index
                    )
                    .trim()
        });
    }

    for (
        let i = 0;
        i < matches.length;
        i++
    ) {

        const start =
            matches[i].index +
            matches[i][0].length;

        const end =
            i + 1 < matches.length
                ? matches[i + 1].index
                : normalized.length;

        sections.push({

            type:
                matches[i][1]
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
// FUTURE SECTIONS
// ==========================================

function isFutureSection(sectionType) {

    const type =
        String(sectionType || '')
            .toLowerCase();

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
        new RegExp(
            regex.source,
            flags
        );

    return [
        ...String(text || '')
            .matchAll(globalRegex)
    ];
}


// ==========================================
// PRODUCT + ACTION PROXIMITY
// ==========================================

function hasNearbyMatch(
    text,
    productRegex,
    actionRegex,
    maxDistance = 100
) {

    const products =
        allMatches(
            productRegex,
            text
        );

    const actions =
        allMatches(
            actionRegex,
            text
        );

    return products.some(
        product =>
            actions.some(
                action => {

                    const p =
                        product.index ?? 0;

                    const a =
                        action.index ?? 0;

                    return (
                        Math.abs(p - a) <=
                        maxDistance
                    );
                }
            )
    );
}


// ==========================================
// PRODUCT DETECTION
// ==========================================

function detectProducts(text) {

    const products = [];

    if (
        CONVERSION_PRODUCT_RX.sponsored
            .test(text)
    ) {
        products.push(
            'sponsored'
        );
    }

    if (
        CONVERSION_PRODUCT_RX.promotion
            .test(text)
    ) {
        products.push(
            'promotion'
        );
    }

    if (
        CONVERSION_PRODUCT_RX.smartCampaign
            .test(text)
    ) {
        products.push(
            'smart_campaign'
        );
    }

    return products;
}


// ==========================================
// CLASSIFY CONVERSION
// ==========================================

function classifyConversion(rawNote) {

    const note =
        normalizeConversionText(
            rawNote
        );

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

        categories:
            new Set(),

        reason:
            null,

        evidence:
            ''
    };


    for (const section of sections) {

        const canProveConversion =
            !isFutureSection(
                section.type
            );

        const clauses =
            section.text
                .split(
                    /[\n•;\/]+|(?<=[.!?])\s+/
                )
                .map(
                    value =>
                        value.trim()
                )
                .filter(Boolean);


        for (const clause of clauses) {

            const products =
                detectProducts(
                    clause
                );

            if (!products.length) {
                continue;
            }

            products.forEach(
                product =>
                    result.categories
                        .add(product)
            );


            const hasNegative =
                NEGATIVE_RX.test(
                    clause
                );

            const hasExisting =
                EXISTING_STATE_RX.test(
                    clause
                );

            const hasActiveConfirmation =
                ACTIVE_CONFIRMATION_RX.test(
                    clause
                );

            const hasFuture =
                FUTURE_ACTION_RX.test(
                    clause
                );

            const hasReactivate =
                REACTIVATION_RX.test(
                    clause
                );

            const hasRenewal =
                RENEWAL_RX.test(
                    clause
                );


            const setupIsForCall =
                SETUP_CALL_RX.test(
                    clause
                );

            const soldBusiness =
                SOLD_BUSINESS_RX.test(
                    clause
                );

            const schedulingAgreement =
                SCHEDULING_AGREEMENT_RX.test(
                    clause
                );


            const hasCompleted =
                hasNearbyMatch(

                    clause,

                    /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*\b|\bprom\w*\b|\bbogo\w*\b|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*\b|\bsxgy\b|happy\s+hour|free\s+delivery)/i,

                    COMPLETED_ACTION_RX,

                    100
                );


            /*
                STRICT CONVERSION

                Only the product + completed action
                in the same clause can produce
                a strict conversion.
            */

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

                    status:
                        'converted',

                    categories:
                        [
                            ...result.categories
                        ],

                    reason:
                        'product_and_completed_action_same_clause',

                    evidence:
                        clause
                };
            }


            /*
                REACTIVATION
            */

            if (
                canProveConversion &&
                hasReactivate &&
                !hasNegative &&
                !hasFuture
            ) {

                result.status =
                    'reactivated';

                result.reason =
                    'reactivation_detected';

                result.evidence =
                    clause;

                continue;
            }


            /*
                RENEWAL
            */

            if (
                canProveConversion &&
                hasRenewal &&
                !hasNegative &&
                !hasFuture
            ) {

                result.status =
                    'renewed';

                result.reason =
                    'renewal_detected';

                result.evidence =
                    clause;

                continue;
            }


            /*
                EXPLICIT COMMITMENT
            */

            const hasCommitment =

                COMMITMENT_RX.test(
                    clause
                ) &&

                !CONDITIONAL_RX.test(
                    clause
                ) &&

                !hasNegative &&

                !hasExisting &&

                !schedulingAgreement;


            if (
                canProveConversion &&
                hasCommitment &&
                !hasFuture
            ) {

                result.status =
                    'committed';

                result.reason =
                    'explicit_unconditional_commitment';

                result.evidence =
                    clause;

                continue;
            }


            /*
                EXISTING CAMPAIGN
            */

            if (hasExisting) {

                if (
                    result.status ===
                    'none'
                ) {

                    result.status =
                        'existing_active';

                    result.reason =
                        'existing_campaign_state';

                    result.evidence =
                        clause;
                }

                continue;
            }


            /*
                ACTIVE CONFIRMATION
            */

            if (
                hasActiveConfirmation
            ) {

                if (
                    result.status ===
                    'none'
                ) {

                    result.status =
                        'confirmation_only';

                    result.reason =
                        'activation_confirmation';

                    result.evidence =
                        clause;
                }

                continue;
            }


            /*
                FUTURE / PENDING
            */

            if (
                hasFuture ||
                !canProveConversion
            ) {

                if (
                    result.status ===
                    'none'
                ) {

                    result.status =
                        'future_pending';

                    result.reason =
                        'future_or_pending';

                    result.evidence =
                        clause;
                }

                continue;
            }


            /*
                NEGATIVE
            */

            if (hasNegative) {

                if (
                    result.status ===
                    'none'
                ) {

                    result.status =
                        'declined';

                    result.reason =
                        'negative_or_deactivation';

                    result.evidence =
                        clause;
                }
            }
        }
    }


    return {

        ...result,

        categories:
            [...result.categories]
    };
}


// ==========================================
// CONNECTED CALL
// ==========================================

function isConnectedDisposition(
    disposition
) {

    const nonConnects =
        new Set([
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
// EXISTING CLASSIFICATION ACCESSOR
// ==========================================

function getCallClassification(
    call
) {

    if (
        call &&
        call.conversionStatus &&
        Array.isArray(
            call.conversionCategories
        )
    ) {

        return {

            status:
                call.conversionStatus,

            categories:
                call.conversionCategories,

            reason:
                call.conversionReason ||
                '',

            evidence:
                call.conversionEvidence ||
                ''
        };
    }

    return classifyConversion(

        call?.originalNote ||
        call?.note ||
        ''
    );
}


// ==========================================
// METRICS
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


            /*
                This is the important addition.

                Every call counted in convertedCalls is
                also placed into convertedRecords.

                ui.js uses this list when the user clicks
                "View calls".
            */

            const convertedRecords = [];


            const normalizedSearchRep =
                normalizeName(
                    searchRep
                );


            window.AppState.rawCallData.forEach(
                call => {

                    const normalizedCallRep =
                        normalizeName(
                            call.rep
                        );


                    /*
                        Exact rep matching for KPI calculation.
                    */

                    const repMatches =

                        !searchRep ||

                        normalizedCallRep ===
                            normalizedSearchRep;


                    if (

                        call.date < startDate ||

                        call.date > endDate ||

                        !repMatches ||

                        !isRepInTeam(
                            call.rep,
                            selectedTeam
                        )

                    ) {

                        return;
                    }


                    /*
                        Only Decision Maker Calls.
                    */

                    if (
                        !call.purpose ||
                        call.purpose.toLowerCase() !==
                            'decision maker call'
                    ) {

                        return;
                    }


                    totalDMCalls++;


                    /*
                        Connected call denominator.
                    */

                    if (
                        !isConnectedDisposition(
                            call.disposition
                        )
                    ) {

                        return;
                    }


                    connectedDMCalls++;


                    const classification =
                        getCallClassification(
                            call
                        );

                    const categories =
                        classification.categories ||
                        [];


                    const hasSponsored =
                        categories.includes(
                            'sponsored'
                        );

                    const hasPromotion =
                        categories.includes(
                            'promotion'
                        );

                    const hasSmart =
                        categories.includes(
                            'smart_campaign'
                        );


                    /*
                        STRICT CONVERSION

                        Sponsored OR Promotion
                        AND status = converted.
                    */

                    if (
                        classification.status ===
                        'converted'
                    ) {

                        const countsForRequestedKPI =
                            hasSponsored ||
                            hasPromotion;


                        if (
                            countsForRequestedKPI
                        ) {

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


                            /*
                                This is the exact source
                                record that generated the
                                conversion.
                            */

                            convertedRecords.push(
                                call
                            );

                        } else if (

                            hasSmart &&

                            !hasSponsored &&

                            !hasPromotion

                        ) {

                            smartOnlyConversions++;
                        }
                    }


                    switch (
                        classification.status
                    ) {

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
                }
            );


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
                    Backward-compatible.
                */

                sales:
                    convertedCalls,

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
                    multiProductConversions,

                /*
                    NEW:
                    exact converted source records.
                */

                convertedRecords:
                    convertedRecords,

                conversionRate:
                    conversionRate
            };
        }
};
