// ==========================================
// js/ui.js
// METRICS UI + CONVERSION DRILL-DOWN
// ==========================================

window.AppUI = {

    convertedCallCache: {},


    // ==========================================
    // ESCAPE HTML
    // ==========================================

    escapeHtml:
        function(value) {

            return String(
                value ?? ''
            )
                .replace(
                    /&/g,
                    '&amp;'
                )
                .replace(
                    /</g,
                    '&lt;'
                )
                .replace(
                    />/g,
                    '&gt;'
                )
                .replace(
                    /"/g,
                    '&quot;'
                )
                .replace(
                    /'/g,
                    '&#039;'
                );
        },


    // ==========================================
    // DISPLAY RAW VALUE
    // ==========================================

    displayValue:
        function(value) {

            const raw =
                String(
                    value ?? ''
                );


            if (
                raw.trim() === ''
            ) {

                return 'No info';
            }


            return this.escapeHtml(
                raw
            );
        },


    // ==========================================
    // RAW DATE / TIME
    // ==========================================

    parseCreatedAt:
        function(createdAt) {

            const raw =
                String(
                    createdAt ?? ''
                );


            if (
                raw.trim() === ''
            ) {

                return {

                    date:
                        'No info',

                    time:
                        'No info'
                };
            }


            /*
                CSV source format:
                Jan 01 2026 01:54:28 PM PST
            */

            const match =
                raw.match(
                    /^(.+?\d{4})\s+(.+)$/
                );


            if (match) {

                return {

                    date:
                        match[1],

                    time:
                        match[2]
                };
            }


            return {

                date:
                    raw,

                time:
                    'No info'
            };
        },


    // ==========================================
    // CLOSE MODAL
    // ==========================================

    closeConvertedCalls:
        function() {

            const modal =
                document.getElementById(
                    'convertedCallsModal'
                );

            if (modal) {
                modal.remove();
            }
        },


    // ==========================================
    // DETAIL FIELD
    // ==========================================

    renderDetailField:
        function(
            label,
            value
        ) {

            return `

                <div
                    class="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-left"
                >

                    <div
                        class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-1.5"
                    >
                        ${this.escapeHtml(
                            label
                        )}
                    </div>

                    <div
                        class="text-sm text-gray-200 break-words"
                    >
                        ${this.displayValue(
                            value
                        )}
                    </div>

                </div>
            `;
        },


    // ==========================================
    // OPEN CONVERTED CALLS
    // ==========================================

    openConvertedCalls:
        function(encodedRep) {

            const rep =
                decodeURIComponent(
                    encodedRep
                );


            const calls =
                this.convertedCallCache[
                    rep
                ] || [];


            this.closeConvertedCalls();


            const modal =
                document.createElement(
                    'div'
                );


            modal.id =
                'convertedCallsModal';


            modal.className =
                'fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto';


            let cards =
                '';


            calls.forEach(
                (call, index) => {

                    const dateTime =
                        this.parseCreatedAt(
                            call.createdAt
                        );


                    const note =
                        call.originalNote;


                    cards += `

                        <article
                            class="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-xl text-left"
                        >

                            <!-- HEADER -->

                            <div
                                class="px-5 py-4 border-b border-gray-800 bg-gray-900/80"
                            >

                                <div
                                    class="flex flex-wrap items-center justify-between gap-3"
                                >

                                    <div>

                                        <div
                                            class="text-[10px] uppercase tracking-[0.18em] text-indigo-400 font-bold"
                                        >
                                            Converted Call ${index + 1}
                                        </div>

                                        <div
                                            class="text-sm font-semibold text-white mt-1"
                                        >
                                            Record ID:
                                            ${this.displayValue(
                                                call.id
                                            )}
                                        </div>

                                    </div>


                                    <span
                                        class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                                    >
                                        Converted
                                    </span>

                                </div>

                            </div>


                            <!-- DETAILS -->

                            <div
                                class="p-5 space-y-4"
                            >

                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                                >

                                    ${this.renderDetailField(
                                        'Date',
                                        dateTime.date
                                    )}

                                    ${this.renderDetailField(
                                        'Time',
                                        dateTime.time
                                    )}

                                    ${this.renderDetailField(
                                        'Direction',
                                        call.direction
                                    )}

                                    ${this.renderDetailField(
                                        'State',
                                        call.state
                                    )}

                                </div>


                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >

                                    ${this.renderDetailField(
                                        'Purpose',
                                        call.purpose
                                    )}

                                    ${this.renderDetailField(
                                        'Disposition',
                                        call.disposition
                                    )}

                                </div>


                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >

                                    ${this.renderDetailField(
                                        'User Full Name',
                                        call.userFullName
                                    )}

                                    ${this.renderDetailField(
                                        'To',
                                        call.to
                                    )}

                                </div>


                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >

                                    ${this.renderDetailField(
                                        'Prospect Full Name',
                                        call.prospectFullName
                                    )}

                                    ${this.renderDetailField(
                                        'Prospect Company',
                                        call.prospectCompany
                                    )}

                                </div>


                                <!-- ORIGINAL NOTE -->

                                <div
                                    class="pt-2"
                                >

                                    <div
                                        class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 text-left"
                                    >
                                        Note
                                    </div>


                                    <pre
                                        class="m-0 w-full rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-5 text-sm leading-7 text-gray-200 font-sans text-left whitespace-pre-wrap break-words overflow-x-auto"
                                    >${this.displayValue(note)}</pre>

                                </div>


                                ${
                                    call.conversionEvidence

                                    ?

                                    `

                                    <div>

                                        <div
                                            class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 text-left"
                                        >
                                            Detected Conversion Evidence
                                        </div>

                                        <pre
                                            class="m-0 w-full rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-4 text-sm leading-6 text-indigo-200 font-sans text-left whitespace-pre-wrap break-words"
                                        >${this.displayValue(
                                            call.conversionEvidence
                                        )}</pre>

                                    </div>

                                    `

                                    :

                                    ''
                                }

                            </div>

                        </article>

                    `;
                }
            );


            if (!cards) {

                cards = `

                    <div
                        class="rounded-2xl border border-gray-800 bg-gray-950 p-10 text-center text-gray-500"
                    >
                        No converted calls found.
                    </div>

                `;
            }


            modal.innerHTML = `

                <div
                    class="w-full max-w-6xl my-4"
                >

                    <div
                        class="rounded-3xl border border-gray-800 bg-gray-900 overflow-hidden shadow-2xl"
                    >

                        <div
                            class="px-6 py-5 border-b border-gray-800 bg-gray-950"
                        >

                            <div
                                class="flex flex-wrap items-center justify-between gap-4"
                            >

                                <div>

                                    <div
                                        class="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold"
                                    >
                                        Conversion Detail
                                    </div>

                                    <h2
                                        class="text-xl font-bold text-white mt-1"
                                    >
                                        Converted DM Calls
                                    </h2>

                                    <p
                                        class="text-sm text-gray-400 mt-1"
                                    >
                                        ${this.displayValue(
                                            rep
                                        )}

                                        &middot;

                                        ${calls.length}

                                        converted
                                        call${calls.length === 1 ? '' : 's'}
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onclick="AppUI.closeConvertedCalls()"
                                    class="h-10 w-10 rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition"
                                >
                                    &times;
                                </button>

                            </div>

                        </div>


                        <div
                            class="p-4 sm:p-6 space-y-4"
                        >

                            ${cards}

                        </div>

                    </div>

                </div>
            `;


            modal.addEventListener(
                'click',
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        this.closeConvertedCalls();
                    }
                }
            );


            document.body.appendChild(
                modal
            );


            const escapeHandler =
                event => {

                    if (
                        event.key ===
                        'Escape'
                    ) {

                        this.closeConvertedCalls();

                        document.removeEventListener(
                            'keydown',
                            escapeHandler
                        );
                    }
                };


            document.addEventListener(
                'keydown',
                escapeHandler
            );
        },


    // ==========================================
    // METRICS TABLE
    // ==========================================

    renderMetricsTab:
        function(
            startDateStr,
            endDateStr,
            searchRep,
            selectedTeam
        ) {

            const thead =
                document.getElementById(
                    'metricsTableHead'
                );

            const tbody =
                document.getElementById(
                    'metricsTableBody'
                );


            document.getElementById(
                'metricsDateRange'
            ).textContent =
                `Strict Conversion: Sponsored Listings + Promotions | Date Range: ${startDateStr} to ${endDateStr}`;


            thead.innerHTML = `

                <tr>

                    <th
                        class="py-3 px-4 sticky-col"
                    >
                        Rep Name
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Total DM Calls
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Connected DM Calls
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Connect Rate %
                    </th>

                    <th
                        class="py-3 px-4 text-center border-l border-gray-800"
                    >
                        Converted DM Calls
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Committed
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Ambiguous
                    </th>

                    <th
                        class="py-3 px-4 text-center"
                    >
                        Conversion Rate %
                    </th>

                </tr>
            `;


            this.convertedCallCache =
                {};


            let bodyHTML =
                '';


            const sortedReps =
                Array.from(
                    window.AppState
                        .allKnownReps
                ).sort();


            let hasData =
                false;


            sortedReps.forEach(
                rep => {

                    if (

                        rep
                            .toLowerCase()
                            .includes(
                                searchRep.toLowerCase()
                            ) &&

                        isRepInTeam(
                            rep,
                            selectedTeam
                        )

                    ) {

                        const metrics =
                            window.AppMetrics
                                .getDecisionMakerConnectRate(
                                    startDateStr,
                                    endDateStr,
                                    rep,
                                    selectedTeam
                                );


                        if (
                            metrics.total > 0
                        ) {

                            hasData =
                                true;


                            this.convertedCallCache[
                                rep
                            ] =
                                metrics.convertedRecords ||
                                [];


                            const rateColor =

                                metrics.rate >= 15

                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'

                                    : metrics.rate >= 10

                                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'

                                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20';


                            const convColor =

                                metrics.conversionRate >= 10

                                    ? 'text-emerald-400 font-bold'

                                    : metrics.conversionRate > 0

                                        ? 'text-amber-400 font-bold'

                                        : 'text-gray-500';


                            const convertedLink =

                                metrics.convertedCalls > 0

                                    ? `

                                        <a
                                            href="#"
                                            onclick="AppUI.openConvertedCalls('${encodeURIComponent(rep)}'); return false;"
                                            class="inline-flex items-center gap-1 mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                                        >
                                            View
                                            ${metrics.convertedCalls === 1
                                                ? 'call'
                                                : 'calls'}
                                        </a>
                                    `

                                    :

                                    `

                                        <span
                                            class="block mt-1 text-[11px] text-gray-600"
                                        >
                                            No converted calls
                                        </span>
                                    `;


                            bodyHTML += `

                                <tr
                                    class="hover:bg-gray-800/30 transition"
                                >

                                    <td
                                        class="py-3 px-4 font-sans font-medium text-gray-200 sticky-col"
                                    >
                                        ${this.displayValue(rep)}
                                    </td>


                                    <td
                                        class="py-3 px-4 text-center text-gray-400"
                                    >
                                        ${metrics.total}
                                    </td>


                                    <td
                                        class="py-3 px-4 text-center text-gray-300 font-bold"
                                    >
                                        ${metrics.connected}
                                    </td>


                                    <td
                                        class="py-3 px-4 text-center"
                                    >

                                        <span
                                            class="px-2.5 py-1 rounded font-bold ${rateColor} border"
                                        >
                                            ${metrics.rate}%
                                        </span>

                                    </td>


                                    <td
                                        class="py-3 px-4 text-center border-l border-gray-800/50"
                                    >

                                        <div
                                            class="text-indigo-300 font-bold"
                                        >
                                            ${metrics.convertedCalls}
                                        </div>

                                        ${convertedLink}

                                    </td>


                                    <td
                                        class="py-3 px-4 text-center text-amber-300 font-bold"
                                    >
                                        ${metrics.committedCalls}
                                    </td>


                                    <td
                                        class="py-3 px-4 text-center text-yellow-300 font-bold"
                                    >
                                        ${metrics.ambiguousCalls}
                                    </td>


                                    <td
                                        class="py-3 px-4 text-center ${convColor}"
                                    >
                                        ${metrics.conversionRate}%
                                    </td>

                                </tr>
                            `;
                        }
                    }
                }
            );


            if (!hasData) {

                bodyHTML = `

                    <tr>

                        <td
                            colspan="8"
                            class="py-8 text-center text-gray-500 font-sans"
                        >
                            No Decision Maker calls logged for this criteria.
                        </td>

                    </tr>

                `;
            }


            tbody.innerHTML =
                bodyHTML;
        }
};
