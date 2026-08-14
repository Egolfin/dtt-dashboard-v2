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
    /\b(?:agreed|decided|confirmed|approved)\b.{0,60}\b(?:activate|start|run|use|take|set\s*up|continue\s+with)\b/i;


const FUTURE_ACTION_RX =
    /\b(?:will|would|wants?|willing|ready|going|needs?|plans?|trying|almost|should|supposed)\b.{0,50}\b(?:activate|start|launch|set\s*up|run)\b/i;


const CONDITIONAL_RX =
    /\b(?:if|once|after|until|pending)\b/i;


const NEGATIVE_RX =
    /\b(?:not\s+interested|declined?|refused?|doesn['’]?t\s+want|didn['’]?t\s+want|cancel(?:led)?|deactivat\w*|paused?|stopped|ended)\b/i;


const EXISTING_STATE_RX =
    /\b(?:already|currently|still|remain(?:ing)?|keep(?:ing)?|previously)\b.{0,70}\bactive\b/i;


const ACTIVE_CONFIRMATION_RX =
    /\b(?:now|currently|still|already|officially|remains?)\b.{0,50}\bactive\b/i;


const REACTIVATION_RX =
    /\b(?:reactivated|re-activated|reactivate|reactivation)\b/i;


const RENEWAL_RX =
    /\b(?:renewed|renew|renewal)\b/i;


// ==========================================
// FALSE-POSITIVE SAFETY
// ==========================================

const SETUP_CALL_RX =
    /\bset\s*up\b.{0,40}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/i;


const SOLD_BUSINESS_RX =
    /\b(?:sold|sell)\b.{0,25}\b(?:resto|restaurant|business|company|location)\b/i;


const SCHEDULING_AGREEMENT_RX =
    /\b(?:agreed|decided|confirmed)\b.{0,50}\b(?:call|meeting|follow[- ]?up|appointment)\b/i;


// ==========================================
// TYPO NORMALIZATION
// ==========================================

const NORMALIZATION_REPLACEMENTS = [

    [/\bsponsorlisting\b/gi, 'sponsored listing'],

    [/\bsponsored\s+linsting\b/gi, 'sponsored listing'],

    [/\bsponsored\s+listen\b/gi, 'sponsored listing'],

    [/\bsponsored\s+slitting\b/gi, 'sponsored listing'],

    [/\bsponsore\s+listing\b/gi, 'sponsored listing'],

    [/\bpormos?\b/gi, 'promos'],

    [/\bpromotons?\b/gi, 'promotions'],

    [/\bproms\b/gi, 'promos'],

    [/\badvertisment\b/gi, 'advertisement'],

    [/\badverticemnt\b/gi, 'advertisement'],

    [/\bacivate\b/gi, 'activate'],

    [/\bactivaet\b/gi, 'activate']
];


// ==========================================
// NORMALIZE ONLY FOR DETECTION
//
// IMPORTANT:
// Preserve newline characters.
// Preserve emojis.
// Preserve bullet characters.
//
// We only normalize things that improve matching.
// ==========================================

function normalizeConversionText(value) {

    let text =
        String(value || '')
            .normalize('NFKC')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[’‘]/g, "'");


    /*
        Normalize tabs, but NEVER normalize
        newlines into spaces.
    */

    text =
        text.replace(
            /[ \t]+/g,
            ' '
        );


    /*
        Normalize excessive blank lines,
        but preserve meaningful line breaks.
    */

    text =
        text.replace(
            /\n[ \t]*\n[ \t]*\n+/g,
            '\n\n'
        );


    /*
        Typo normalization.
    */

    NORMALIZATION_REPLACEMENTS.forEach(
        ([regex, replacement]) => {

            text =
                text.replace(
                    regex,
                    replacement
                );
        }
    );


    return text.trim();
}


// ==========================================
// STRUCTURED NOTE SECTIONS
//
// Handles headings even when preceded by:
// emojis
// bullets
// numbers
// spaces
// ==========================================

function splitNoteSections(note) {

    const normalized =
        String(note || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');


    const headingRx =
        /(?:^|\n)\s*(?:[^\nA-Za-z0-9]{0,10}\s*)?(reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:/gi;


    const matches =
        [
            ...normalized.matchAll(
                headingRx
            )
        ];


    if (!matches.length) {

        return [
            {
                type: 'freeform',
                text: normalized
            }
        ];
    }


    const sections = [];


    const firstMatchStart =
        matches[0].index ?? 0;


    if (firstMatchStart > 0) {

        sections.push({

            type:
                'summary',

            text:
                normalized
                    .slice(
                        0,
                        firstMatchStart
                    )
                    .trim()
        });
    }


    matches.forEach(
        (match, index) => {

            const start =
                match.index +
                match[0].length;


            const end =
                index + 1 <
                matches.length

                    ? matches[index + 1].index

                    : normalized.length;


            sections.push({

                type:
                    match[1]
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase(),

                text:
                    normalized
                        .slice(
                            start,
                            end
                        )
                        .trim()
            });
        }
    );


    return sections;
}


// ==========================================
// FUTURE SECTION
// ==========================================

function isFutureSection(sectionType) {

    const type =
        String(sectionType || '')
            .toLowerCase();


    return (

        type.startsWith(
            'next step'
        ) ||

        type.startsWith(
            'follow up'
        )
    );
}


// ==========================================
// MATCH HELPERS
// ==========================================

function allMatches(
    regex,
    text
) {

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
            .matchAll(
                globalRegex
            )
    ];
}


function hasNearbyMatch(
    text,
    productRegex,
    actionRegex,
    maxDistance = 120
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
                        Math.abs(
                            p - a
                        ) <=
                        maxDistance
                    );
                }
            )
    );
}


// ==========================================
// PRODUCT DETECTOR
// ==========================================

function detectProducts(
    text
) {

    const products = [];


    if (
        CONVERSION_PRODUCT_RX
            .sponsored
            .test(text)
    ) {

        products.push(
            'sponsored'
        );
    }


    if (
        CONVERSION_PRODUCT_RX
            .promotion
            .test(text)
    ) {

        products.push(
            'promotion'
        );
    }


    if (
        CONVERSION_PRODUCT_RX
            .smartCampaign
            .test(text)
    ) {

        products.push(
            'smart_campaign'
        );
    }


    return products;
}


// ==========================================
// CLAUSE SPLITTER
//
// IMPORTANT:
// Newline characters are deliberately
// treated as boundaries.
// Emojis are preserved.
// ==========================================

function splitIntoClauses(
    text
) {

    return String(text || '')

        /*
            Newlines are hard boundaries.
        */

        .split(
            /\n+/
        )

        .flatMap(
            line =>
                line.split(
                    /[•▪◦●◆■]+/
                )
        )

        .flatMap(
            line =>
                line.split(
                    /(?<=[.!?])\s+/
                )
        )

        .flatMap(
            line =>
                line.split(
                    /(?:\s*;\s*)/
                )
        )

        .map(
            clause =>
                clause.trim()
        )

        .filter(
            Boolean
        );
}


// ==========================================
// CLASSIFY CONVERSION
// ==========================================

function classifyConversion(
    rawNote
) {

    const note =
        normalizeConversionText(
            rawNote
        );


    if (!note) {

        return {

            status:
                'none',

            categories:
                [],

            reason:
                'empty_note',

            evidence:
                ''
        };
    }


    const sections =
        splitNoteSections(
            note
        );


    const result = {

        status:
            'none',

        categories:
            new Set(),

        reason:
            null,

        evidence:
            ''
    };


    for (
        const section
        of sections
    ) {

        const canProveConversion =
            !isFutureSection(
                section.type
            );


        const clauses =
            splitIntoClauses(
                section.text
            );


        for (
            const clause
            of clauses
        ) {

            const products =
                detectProducts(
                    clause
                );


            if (
                !products.length
            ) {

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

                    120
                );


            /*
                STRICT CONVERSION
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

                    /*
                        Keep the normalized evidence
                        for auditing.
                    */

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
                COMMITMENT
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
                EXISTING ACTIVE
            */

            if (
                hasExisting
            ) {

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
                DECLINED
            */

            if (
                hasNegative
            ) {

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
            [
                ...result.categories
            ]
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

        String(
            disposition || ''
        )
            .toLowerCase()
            .trim()

    );
}


// ==========================================
// CLASSIFICATION ACCESS
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
// MAIN METRICS
// ==========================================

window.AppMetrics = {

    getDecisionMakerConnectRate:

        function(
            startDate,
            endDate,
            searchRep,
            selectedTeam
        ) {

            let totalDMCalls =
                0;


            let connectedDMCalls =
                0;


            let convertedCalls =
                0;


            let committedCalls =
                0;


            let ambiguousCalls =
                0;


            let reactivatedCalls =
                0;


            let renewedCalls =
                0;


            let existingActiveCalls =
                0;


            let confirmationOnlyCalls =
                0;


            let futurePendingCalls =
                0;


            let declinedCalls =
                0;


            let sponsoredConversions =
                0;


            let promotionConversions =
                0;


            let smartOnlyConversions =
                0;


            let multiProductConversions =
                0;


            /*
                Exact converted call records
                for drill-down.
            */

            const convertedRecords =
                [];


            const normalizedSearchRep =
                normalizeName(
                    searchRep
                );


            window.AppState
                .rawCallData
                .forEach(
                    call => {

                        const normalizedCallRep =
                            normalizeName(
                                call.rep
                            );


                        const repMatches =

                            !searchRep ||

                            normalizedCallRep ===
                                normalizedSearchRep;


                        if (

                            call.date <
                                startDate ||

                            call.date >
                                endDate ||

                            !repMatches ||

                            !isRepInTeam(
                                call.rep,
                                selectedTeam
                            )

                        ) {

                            return;
                        }


                        if (

                            !call.purpose ||

                            call.purpose
                                .trim()
                                .toLowerCase() !==
                                'decision maker call'

                        ) {

                            return;
                        }


                        totalDMCalls++;


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
                        */

                        if (

                            classification.status ===
                                'converted'

                        ) {

                            const qualifies =

                                hasSponsored ||
                                hasPromotion;


                            if (
                                qualifies
                            ) {

                                convertedCalls++;


                                if (
                                    hasSponsored
                                ) {

                                    sponsoredConversions++;
                                }


                                if (
                                    hasPromotion
                                ) {

                                    promotionConversions++;
                                }


                                if (
                                    hasSponsored &&
                                    hasPromotion
                                ) {

                                    multiProductConversions++;
                                }


                                /*
                                    THE EXACT SOURCE CALL
                                */

                                convertedRecords
                                    .push(call);

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

                convertedRecords:
                    convertedRecords,

                conversionRate:
                    conversionRate
            };
        }
};
