// ==========================================
// js/metrics.js
// STRICT CONVERSION DETECTION + METRICS
// ==========================================

/*
    STRICT KPI DEFINITION
    ---------------------
    A call counts as a conversion ONLY when the note contains:

      1. A recognizable Sponsored Listings / Promotions product signal, AND
      2. A completed-adoption signal tied to that product, AND
      3. No future/conditional intent, negative response, or mere pitch/offer
         language invalidates the completed action.

    The classifier deliberately does NOT count these as conversions:
      - should/will/can/could activate
      - wants/plans/needs to activate
      - activate after/once/until/pending
      - offered/presented/explained/discussed/recommended
      - already/currently/now active
      - generic campaign language with no product family
      - scheduled follow-up / send-link language

    Strong completed-action examples include:
      - SL activated
      - Sponsored Listings activated
      - Promo activated
      - Promo sold
      - Ad sold
      - close deal / close sale
      - we set up the SL
      - we took the SL
      - mx activate ad and promo
*/


// ==========================================
// PRODUCT VOCABULARY
// ==========================================

const CONVERSION_PRODUCT_RX = {

    sponsored:
        /\b(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|sl|ads?|advertis(?:ing|ement|ment)|advertisment|adverticemnt|spon)\b/iu,

    promotion:
        /\b(?:promos?|promotions?|proms?|pormos?|promotons?|bogos?|bogo|b1g1|buy\s+one\s+get\s+one|sxgy|spend\s+x\s+get\s+y|happy\s+hour|free\s+delivery|co[- ]?fund(?:ed|ing)?|cofund(?:ed|ing)?)\b/iu,

    smartCampaign:
        /\b(?:smart\s+campaigns?|sc)\b/iu
};


// ==========================================
// COMPLETED ACTIONS
// ==========================================

/*
    NOTE:
    Bare "activate" is intentionally NOT here.

    This prevents phrases like:
      "should be activated"
      "can activate"
      "will activate"
      "plans to activate"

    from being treated as completed sales.
*/
const COMPLETED_ACTION_RX =
    /\b(?:activated|reactivated|re-activated|sold|won|launched|started|closed?\s+(?:the\s+)?(?:deal|sale)|set[ \t]+up)\b/iu;


/*
    The corpus also contains shorthand such as:
      "mx activate ad and promo"
      "he activate a SL"

    Those are accepted only when an actor/subject immediately precedes
    the activate verb. This preserves the documented shorthand without
    treating generic future recommendations as sales.
*/
const SHORTHAND_ACTIVATE_RX =
    /\b(?:mx|we|he|she|they|merchant|dm|rep)\s+activat(?:e|ed|ing)\b/iu;


/*
    "we took the SL" / "we took the SL and the SC"
*/
const TOOK_PRODUCT_RX =
    /\b(?:we|he|she|they|merchant|dm|rep)\s+took\b/iu;


// ==========================================
// FUTURE / CONDITIONAL INTENT
// ==========================================

const FUTURE_INTENT_RX =
    /\b(?:will|would|can|could|should|may|might|want(?:s)?\s+to|wants?\s+to|need(?:s)?\s+to|needs?\s+to|plan(?:s|ned)?\s+to|planning\s+to|going\s+to|try(?:ing)?\s+to|trying\s+to|almost|supposed\s+to)\b.{0,100}\b(?:activat\w*|start\w*|launch\w*|set[ \t]+up|run|take|use)\b/iu;


const CONDITIONAL_RX =
    /\b(?:if|once|after|until|pending|when|as\s+soon\s+as)\b.{0,100}\b(?:activat\w*|start\w*|launch\w*|run|take|use)\b/iu;


const FOLLOW_UP_ACTIVATION_RX =
    /\b(?:follow\s*up|callback|call\s+back|next\s+step|next\s+action)\b.{0,100}\b(?:activat\w*|activation|set[ \t]+up|launch\w*|run)\b/iu;


// ==========================================
// NEGATIVE / REJECTION LANGUAGE
// ==========================================

const NEGATIVE_RX =
    /\b(?:not\s+interested|declined?|refused?|reject(?:ed)?|doesn['’]?t\s+want|didn['’]?t\s+want|won['’]?t\s+do|cancel(?:led)?|deactivat\w*|paused?|stopped|ended)\b/iu;


// ==========================================
// PITCH / OFFER / DISCUSSION LANGUAGE
// ==========================================

const PITCH_OR_OFFER_RX =
    /\b(?:offered?|offer(?:ing)?|presented?|present(?:ing)?|explained?|explain(?:ing)?|discussed?|discuss(?:ing)?|reviewed?|review(?:ing)?|pitched?|pitch(?:ing)?|recommended?|recommend(?:ing)?|proposed?|propos(?:ing)?|introduced?|introduc(?:ing)?|covered|talk(?:ed|ing)?\s+about|walked\s+through|sent|sending|email(?:ed|ing)?|shared|sharing)\b/iu;


// ==========================================
// EXISTING / CURRENT ACTIVE STATE
// ==========================================

const EXISTING_ACTIVE_RX =
    /\b(?:already\s+has|already\s+have|currently\s+has|currently\s+have|already\s+active|currently\s+active|still\s+active|remain(?:s|ing)?\s+active|is\s+active|are\s+active|campaign\s+is\s+active|campaigns?\s+are\s+active|live\s+and\s+running|currently\s+running|already\s+running)\b/iu;


const CURRENT_CONFIRMATION_RX =
    /\b(?:active|activated|live|running|currently|now)\b/iu;


// ==========================================
// REACTIVATION / RENEWAL
// ==========================================

const REACTIVATION_RX =
    /\b(?:reactivated|re-activated|reactivation)\b/iu;


const RENEWAL_RX =
    /\b(?:renewed|renewal|renew)\b/iu;


// ==========================================
// OTHER FALSE-POSITIVE CONTEXT
// ==========================================

const SETUP_CALL_RX =
    /\bset\s*up\b.{0,45}\b(?:a\s+)?(?:call|meeting|follow[- ]?up|appointment)\b/iu;


const SOLD_BUSINESS_RX =
    /\b(?:sold|sell)\b.{0,30}\b(?:resto|restaurant|business|company|location)\b/iu;


const SCHEDULING_AGREEMENT_RX =
    /\b(?:agreed|decided|confirmed)\b.{0,60}\b(?:call|meeting|follow[- ]?up|appointment|callback)\b/iu;


// ==========================================
// TYPO NORMALIZATION
// ==========================================

const NORMALIZATION_REPLACEMENTS = [
    [/\bsponsorlisting\b/giu, 'sponsored listing'],
    [/\bsponsored\s+linsting\b/giu, 'sponsored listing'],
    [/\bsponsored\s+listen\b/giu, 'sponsored listing'],
    [/\bsponsored\s+slitting\b/giu, 'sponsored listing'],
    [/\bsponsore\s+listing\b/giu, 'sponsored listing'],
    [/\bpormos?\b/giu, 'promos'],
    [/\bpromotons?\b/giu, 'promotions'],
    [/\bproms\b/giu, 'promos'],
    [/\bprommo\b/giu, 'promo'],
    [/\bpromtion\b/giu, 'promotion'],
    [/\badvertisment\b/giu, 'advertisement'],
    [/\badverticemnt\b/giu, 'advertisement'],
    [/\bacivate\b/giu, 'activate'],
    [/\bactivaet\b/giu, 'activate']
];


// ==========================================
// NORMALIZATION FOR DETECTION ONLY
// ==========================================

function normalizeConversionText(value) {

    let text =
        String(value || '')
            .normalize('NFKC')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[’‘]/g, "'");


    /*
        If the CSV flattened structured note headings onto one line,
        restore boundaries before classification.

        Emojis are preserved.
    */
    text = text.replace(
        /(^|\n|\s+)([^\p{L}\p{N}\n]{0,12})\s*(Reason\s+of\s+Call|Key\s+Points?\s*\/?\s*Concerns?|Actions?\s+Taken|Next\s+Steps?|Follow\s*Up)\s*:/giu,
        (_m, _prefix, marks, heading) =>
            `\n${marks}${heading}:`
    );


    /*
        Normalize spaces and tabs only.
        Newlines remain meaningful.
    */
    text = text.replace(/[ \t]+/g, ' ');


    NORMALIZATION_REPLACEMENTS.forEach(
        ([rx, replacement]) => {
            text = text.replace(rx, replacement);
        }
    );


    return text.trim();
}


// ==========================================
// SECTION PARSER
// ==========================================

function splitNoteSections(note) {

    const normalized =
        normalizeConversionText(note);


    const matches = [
        ...normalized.matchAll(
            /(?:^|\n)\s*(?:[^\p{L}\p{N}\n]{0,12}\s*)?(reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:/giu
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


    if ((matches[0].index ?? 0) > 0) {
        sections.push({
            type: 'summary',
            text: normalized.slice(0, matches[0].index).trim()
        });
    }


    for (let i = 0; i < matches.length; i++) {

        const start =
            (matches[i].index ?? 0) +
            matches[i][0].length;

        const end =
            i + 1 < matches.length
                ? (matches[i + 1].index ?? normalized.length)
                : normalized.length;


        sections.push({
            type: String(matches[i][1])
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase(),
            text: normalized.slice(start, end).trim()
        });
    }


    return sections;
}


function isFutureSection(sectionType) {
    const type = String(sectionType || '').toLowerCase();
    return (
        type.startsWith('next step') ||
        type.startsWith('follow up')
    );
}


// ==========================================
// CLAUSE SPLITTER
// ==========================================

function splitIntoClauses(text) {

    return String(text || '')
        .split(/\n+/)
        .map(value => value.trim())
        .map(value =>
            value.replace(
                /^[•▪◦●◆■➜➤→\-]+\s*/u,
                ''
            )
        )
        .flatMap(value =>
            value.split(/(?<=[.!?])\s+/u)
        )
        .map(value => value.trim())
        .filter(Boolean);
}


function allMatches(regex, text) {
    const flags = regex.flags.includes('g')
        ? regex.flags
        : `${regex.flags}g`;

    return [
        ...String(text || '').matchAll(
            new RegExp(regex.source, flags)
        )
    ];
}


function hasNearbyMatch(text, productRegex, actionRegex, maxDistance = 120) {

    const products = allMatches(productRegex, text);
    const actions = allMatches(actionRegex, text);

    return products.some(product =>
        actions.some(action =>
            Math.abs(
                (product.index ?? 0) -
                (action.index ?? 0)
            ) <= maxDistance
        )
    );
}


// ==========================================
// PRODUCT DETECTION
// ==========================================

function detectProducts(text) {

    const categories = [];

    if (CONVERSION_PRODUCT_RX.sponsored.test(text)) {
        categories.push('sponsored');
    }

    if (CONVERSION_PRODUCT_RX.promotion.test(text)) {
        categories.push('promotion');
    }

    if (CONVERSION_PRODUCT_RX.smartCampaign.test(text)) {
        categories.push('smart_campaign');
    }

    return categories;
}


function hasCompletedProductAction(clause) {

    const explicitCompleted =
        hasNearbyMatch(
            clause,
            /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*|\bprom\w*|\bbogo\w*|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*|\bsxgy\b|happy\s+hour|free\s+delivery|smart\s+campaigns?|\bsc\b)/iu,
            COMPLETED_ACTION_RX,
            120
        );


    if (explicitCompleted) {
        return true;
    }


    const shorthandActivate =
        SHORTHAND_ACTIVATE_RX.test(clause) &&
        hasNearbyMatch(
            clause,
            /(?:sponsored?\s+(?:listings?|listen|slitting|linsting)|sponsor\s*listing|sponsorlisting|\bsl\b|\bads?\b|advertis\w*|\bspon\w*|\bprom\w*|\bbogo\w*|\bb1g1\b|co[- ]?fund\w*|\bcofund\w*|\bsxgy\b|happy\s+hour|free\s+delivery|smart\s+campaigns?|\bsc\b)/iu,
            /\bactivat(?:e|ed|ing)\b/iu,
            100
        );


    if (shorthandActivate) {
        return true;
    }


    const tookProduct =
        TOOK_PRODUCT_RX.test(clause) &&
        CONVERSION_PRODUCT_RX.sponsored.test(clause) ||
        TOOK_PRODUCT_RX.test(clause) &&
        (
            CONVERSION_PRODUCT_RX.promotion.test(clause) ||
            CONVERSION_PRODUCT_RX.smartCampaign.test(clause)
        );


    return Boolean(tookProduct);
}


// ==========================================
// CLASSIFY ONE NOTE
// ==========================================

function classifyConversion(rawNote) {

    const normalizedNote =
        normalizeConversionText(rawNote);


    if (!normalizedNote) {
        return {
            status: 'none',
            categories: [],
            reason: 'empty_note',
            evidence: ''
        };
    }


    const result = {
        status: 'none',
        categories: new Set(),
        reason: null,
        evidence: ''
    };


    for (const section of splitNoteSections(normalizedNote)) {

        const canProveConversion =
            !isFutureSection(section.type);


        for (const clause of splitIntoClauses(section.text)) {

            const products =
                detectProducts(clause);


            if (!products.length) {
                continue;
            }


            products.forEach(product =>
                result.categories.add(product)
            );


            const hasNegative =
                NEGATIVE_RX.test(clause);


            const hasFuture =
                FUTURE_INTENT_RX.test(clause) ||
                CONDITIONAL_RX.test(clause) ||
                FOLLOW_UP_ACTIVATION_RX.test(clause);


            const hasExisting =
                EXISTING_ACTIVE_RX.test(clause);


            const hasCurrentConfirmation =
                CURRENT_CONFIRMATION_RX.test(clause);


            const hasPitchOrOffer =
                PITCH_OR_OFFER_RX.test(clause);


            const hasReactivate =
                REACTIVATION_RX.test(clause);


            const hasRenewal =
                RENEWAL_RX.test(clause);


            const setupIsForCall =
                SETUP_CALL_RX.test(clause);


            const soldBusiness =
                SOLD_BUSINESS_RX.test(clause);


            const schedulingAgreement =
                SCHEDULING_AGREEMENT_RX.test(clause);


            const hasCompleted =
                hasCompletedProductAction(clause);


            /*
                1. Explicit rejection always prevents a conversion
                   when there is no completed product action.
            */
            if (
                hasNegative &&
                !hasCompleted
            ) {
                result.status = 'declined';
                result.reason = 'merchant_declined_or_rejected';
                result.evidence = clause;
                continue;
            }


            /*
                2. Future / conditional intent is never a strict conversion.
            */
            if (
                hasFuture ||
                !canProveConversion
            ) {

                if (result.status === 'none') {
                    result.status = 'future_pending';
                    result.reason = 'future_or_pending';
                    result.evidence = clause;
                }

                continue;
            }


            /*
                3. A pitch, offer, presentation, email, or discussion is not
                   a conversion unless the same clause also contains a clear
                   completed product action.
            */
            if (
                hasPitchOrOffer &&
                !hasCompleted
            ) {

                if (result.status === 'none') {
                    result.status = 'pitched';
                    result.reason = 'product_presented_not_completed';
                    result.evidence = clause;
                }

                continue;
            }


            /*
                4. Existing/current adoption is not a same-call sale unless
                   the same clause also proves a new completed action.
            */
            if (
                hasExisting &&
                !hasCompleted
            ) {

                if (result.status === 'none') {
                    result.status = 'existing_active';
                    result.reason = 'existing_campaign_not_same_call_sale';
                    result.evidence = clause;
                }

                continue;
            }


            /*
                5. Strict conversion.

                Completed action must be present and the context must not be
                scheduling, business-sale language, or a pure pitch.
            */
            if (
                canProveConversion &&
                hasCompleted &&
                !setupIsForCall &&
                !soldBusiness &&
                !schedulingAgreement
            ) {

                return {
                    status: 'converted',
                    categories: [...result.categories],
                    reason: 'completed_product_action',
                    evidence: clause
                };
            }


            /*
                6. Reactivation / renewal are adoption events, but they count
                   only when explicitly completed.
            */
            if (
                canProveConversion &&
                (hasReactivate || hasRenewal) &&
                hasCompleted
            ) {

                return {
                    status: hasReactivate ? 'reactivated' : 'renewed',
                    categories: [...result.categories],
                    reason: hasReactivate
                        ? 'reactivation_completed'
                        : 'renewal_completed',
                    evidence: clause
                };
            }


            /*
                7. Explicit commitment is retained for audit purposes but does
                   NOT become a conversion.
            */
            const hasCommitment =
                /\b(?:agreed|decided|confirmed|approved)\b.{0,80}\b(?:activate|activated|start|started|run|use|take|set[ \t]+up|continue\s+with)\b/iu.test(clause) &&
                !hasFuture &&
                !hasNegative &&
                !schedulingAgreement;


            if (
                canProveConversion &&
                hasCommitment
            ) {
                if (result.status === 'none') {
                    result.status = 'committed';
                    result.reason = 'explicit_commitment_not_completed_sale';
                    result.evidence = clause;
                }
                continue;
            }


            /*
                8. Current-state confirmation is useful evidence but not a
                   same-call conversion.
            */
            if (
                hasCurrentConfirmation &&
                !hasCompleted
            ) {
                if (result.status === 'none') {
                    result.status = 'confirmation_only';
                    result.reason = 'current_adoption_confirmation';
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
// CONNECTED CALL
// ==========================================

function isConnectedDisposition(disposition) {

    const value =
        String(disposition || '')
            .trim()
            .toLowerCase();


    const nonConnects = new Set([
        'left voicemail',
        'no answer',
        'left message',
        'incorrect phone number',
        ''
    ]);


    return !nonConnects.has(value);
}


// ==========================================
// CLASSIFICATION ACCESSOR
// ==========================================

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

    getDecisionMakerConnectRate(
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
        let pitchedCalls = 0;
        let sponsoredConversions = 0;
        let promotionConversions = 0;
        let smartOnlyConversions = 0;
        let multiProductConversions = 0;


        const convertedRecords = [];
        const normalizedSearchRep = normalizeName(searchRep);


        window.AppState.rawCallData.forEach(call => {

            const repMatches =
                !searchRep ||
                normalizeName(call.rep) === normalizedSearchRep;


            if (
                call.date < startDate ||
                call.date > endDate ||
                !repMatches ||
                !isRepInTeam(call.rep, selectedTeam)
            ) {
                return;
            }


            if (
                String(call.purpose || '')
                    .trim()
                    .toLowerCase() !==
                'decision maker call'
            ) {
                return;
            }


            totalDMCalls++;


            if (!isConnectedDisposition(call.disposition)) {
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
                classification.status === 'converted'
            ) {

                if (
                    hasSponsored ||
                    hasPromotion
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

                    convertedRecords.push(call);

                } else if (hasSmart) {
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

                case 'pitched':
                    pitchedCalls++;
                    break;
            }
        });


        const connectRate = totalDMCalls > 0
            ? Number(
                ((connectedDMCalls / totalDMCalls) * 100).toFixed(1)
            )
            : 0;


        const conversionRate = connectedDMCalls > 0
            ? Number(
                ((convertedCalls / connectedDMCalls) * 100).toFixed(1)
            )
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
            pitchedCalls,
            sponsoredConversions,
            promotionConversions,
            smartOnlyConversions,
            multiProductConversions,
            convertedRecords,
            conversionRate
        };
    }
};
