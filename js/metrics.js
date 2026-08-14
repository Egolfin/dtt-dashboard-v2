// ==========================================
// js/metrics.js
// CONVERSION DETECTION + METRICS
// ==========================================


// ==========================================
// PRODUCT TERMS
// ==========================================

const CONVERSION_PRODUCT_RX = {

    sponsored:
        /\b(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|sl|ads?|advertis(?:ing|ement|ment)|advertisment|adverticemnt|spon)\b/i,

    promotion:
        /\b(?:promos?|promotions?|proms?|pormos?|promotons?|bogo|bogos|b1g1|buy\s+one\s+get\s+one|sxgy|spend\s+x\s+get\s+y|happy\s+hour|free\s+delivery|co[- ]?fund(?:ed|ing)?|cofund(?:ed|ing)?)\b/i,

    smartCampaign:
        /\b(?:smart\s+campaigns?|sc)\b/i
};


// ==========================================
// ACTIONS
// ==========================================

const COMPLETED_ACTION_RX =
    /\b(?:activated|activate|reactivated|re-activated|sold|won|launched|started|closed?\s+(?:the\s+)?(?:deal|sale)|set\s*up)\b/i;

const COMMITMENT_RX =
    /\b(?:agreed|decided|confirmed|approved)\b.{0,60}\b(?:activate|start|run|use|take|set\s*up|continue\s+with)\b/i;

const FUTURE_ACTION_RX =
    /\b(?:will|would|wants?|want|willing|ready|going|needs?|plans?|trying|almost|should|supposed|planning)\b.{0,60}\b(?:activate|start|launch|set\s*up|run)\b/i;

const CONDITIONAL_RX =
    /\b(?:if|once|after|until|pending|when)\b/i;

const NEGATIVE_RX =
    /\b(?:not\s+interested|declined?|refused?|doesn['’]?t\s+want|didn['’]?t\s+want|cancel(?:led)?|deactivat\w*|paused?|stopped|ended)\b/i;

const EXISTING_STATE_RX =
    /\b(?:already|currently|still|remain(?:ing)?|previously)\b.{0,70}\bactive\b/i;

const ACTIVE_CONFIRMATION_RX =
    /\b(?:now|currently|already|officially|remains?)\b.{0,50}\bactive\b/i;

const REACTIVATION_RX =
    /\b(?:reactivated|re-activated|reactivation)\b/i;

const RENEWAL_RX =
    /\b(?:renewed|renewal|renew)\b/i;


// ==========================================
// FALSE-POSITIVE CONTEXT
// ==========================================

const SETUP_CALL_RX =
    /\bset\s*up\b.{0,45}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/i;

const SOLD_BUSINESS_RX =
    /\b(?:sold|sell)\b.{0,30}\b(?:resto|restaurant|business|company|location)\b/i;

const SCHEDULING_AGREEMENT_RX =
    /\b(?:agreed|decided|confirmed)\b.{0,60}\b(?:call|meeting|follow[- ]?up|appointment)\b/i;


// ==========================================
// TYPO NORMALIZATION
//
// IMPORTANT:
// This only affects the detection copy.
// It never changes the displayed note.
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
// NORMALIZE FOR DETECTION
//
// NEVER destroy newlines.
// NEVER remove emojis.
// ==========================================

function normalizeConversionText(value) {

    let text =
        String(value || '')
            .normalize('NFKC')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[’‘]/g, "'");


    /*
        Normalize spaces/tabs only.
    */

    text =
        text.replace(
            /[ \t]+/g,
            ' '
        );


    /*
        Normalize repeated blank lines
        without destroying line breaks.
    */

    text =
        text.replace(
            /\n[ \t]*\n[ \t]*\n+/g,
            '\n\n'
        );


    NORMALIZATION_REPLACEMENTS.forEach(
        ([rx, replacement]) => {

            text =
                text.replace(
                    rx,
                    replacement
                );
        }
    );


    return text.trim();
}


// ==========================================
// SECTION PARSER
//
// Supports:
// 📞 Reason of Call:
// ✅ Actions Taken:
// 📌 Next Steps:
// • Actions Taken:
// 1. Actions Taken:
// ==========================================

function splitNoteSections(note) {

    const normalized =
        String(note || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');


    const headingRx =
        /(?:^|\n)\s*(?:[^\p{L}\p{N}\n]{0,12}\s*)?(reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:/giu;


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


    /*
        Text before the first known heading.
    */

    if (
        matches[0].index > 0
    ) {

        sections.push({

            type:
                'summary',

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

        const headingStart =
            matches[i].index;


        const contentStart =
            headingStart +
            matches[i][0].length;


        const contentEnd =

            i + 1 < matches.length

                ? matches[i + 1].index

                : normalized.length;


        sections.push({

            type:

                matches[i][1]
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim()
                    .toLowerCase(),

            text:

                normalized
                    .slice(
                        contentStart,
                        contentEnd
                    )
                    .trim()
        });
    }


    return sections;
}


// ==========================================
// FUTURE SECTION
// ==========================================

function isFutureSection(
    sectionType
) {

    const type =
        String(
            sectionType || ''
        ).toLowerCase();


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
// SPLIT CLAUSES
// ==========================================

function splitIntoClauses(
    text
) {

    return String(text || '')

        /*
            Preserve line breaks as
            separate semantic units.
        */

        .split(/\n+/)

        /*
            Preserve emoji content.
            Only strip decorative bullets from
            the boundaries of the clause.
        */

        .map(
            value =>
                value.trim()
        )

        .map(
            value =>
                value.replace(
                    /^[•▪◦●◆■➜➤→\-]+\s*/u,
                    ''
                )
        )

        /*
            Then separate sentence endings.
        */

        .flatMap(
            value =>
                value.split(
                    /(?<=[.!?])\s+/u
                )
        )

        .map(
            value =>
                value.trim()
        )

        .filter(
            Boolean
        );
}


// ==========================================
// REGEX MATCHES
// ==========================================

function allMatches(
    regex,
    text
) {

    const flags =
        regex.flags.includes('g')
            ? regex.flags
            : `${regex.flags}g`;


    const rx =
        new RegExp(
            regex.source,
            flags
        );


    return [
        ...String(
            text || ''
        ).matchAll(rx)
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
// PRODUCTS
// ==========================================

function detectProducts(
    text
) {

    const categories = [];


    if (
        CONVERSION_PRODUCT_RX
            .sponsored
            .test(text)
    ) {

        categories.push(
            'sponsored'
        );
    }


    if (
        CONVERSION_PRODUCT_RX
            .promotion
            .test(text)
    ) {

        categories.push(
            'promotion'
        );
    }


    if (
        CONVERSION_PRODUCT_RX
            .smartCampaign
            .test(text)
    ) {

        categories.push(
            'smart_campaign'
        );
    }


    return categories;
}


// ==========================================
// MAIN CLASSIFIER
// ==========================================

function classifyConversion(
    rawNote
) {

    const normalizedNote =
        normalizeConversionText(
            rawNote
        );


    if (!normalizedNote) {

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
            normalizedNote
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


            const hasFuture =
                FUTURE_ACTION_RX.test(
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

                    /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*\b|\bprom\w*\b|\bbogo\w*\b|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*\b|\bsxgy\b|happy\s+hour|free\s+delivery)/iu,

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
                        [...result.categories],

                    reason:
                        'product_and_completed_action_same_clause',

                    evidence:
                        clause
                };
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
                REACTIVATION
            */

            if (

                canProveConversion &&

                hasReactivate &&

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
                CONFIRMATION
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
            [...result.categories]
    };
}


// ==========================================
// CONNECTED DISPOSITION
// ==========================================

function isConnectedDisposition(
    disposition
) {

    const value =
        String(
            disposition || ''
        )
            .trim()
            .toLowerCase();


    const nonConnects =
        new Set([

            'left voicemail',

            'no answer',

            'left message',

            'incorrect phone number',

            ''
        ]);


    return !nonConnects.has(
        value
    );
}


// ==========================================
// CLASSIFICATION ACCESSOR
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


                        if (

                            String(
                                call.purpose ||
                                ''
                            )
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
                            classification
                                .categories ||
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


                        if (

                            classification.status ===
                            'converted'

                        ) {

                            if (
                                hasSponsored ||
                                hasPromotion
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


                                convertedRecords
                                    .push(
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
