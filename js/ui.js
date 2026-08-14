// ==========================================
// js/ui.js
// ADVANCED METRICS UI + CONVERSION DRILL-DOWN
// ==========================================

window.AppUI = {

    /*
        Stores the converted records for each rep currently
        displayed in the metrics table.

        Example:
        convertedCallCache["Esteban Golfin"]
            = [call1, call2, call3]
    */

    convertedCallCache: {},


    // ==========================================
    // HTML SAFETY
    // ==========================================

    escapeHtml: function(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },


    getDisplayValue: function(value) {

        const cleaned =
            String(value ?? '').trim();

        return cleaned
            ? this.escapeHtml(cleaned)
            : 'No info';
    },


    // ==========================================
    // DATE / TIME
    // ==========================================

    /*
        CSV example:

        Jan 08 2026 09:30:31 AM PST

        We intentionally preserve the source timezone/time
        rather than converting it to the browser's timezone.
    */

    splitCreatedAt:
        function(
            createdAt,
            fallbackDate
        ) {

            const value =
                String(
                    createdAt || ''
                ).trim();


            if (!value) {

                return {

                    date:
                        fallbackDate ||
                        'No info',

                    time:
                        'No info'
                };
            }


            const match =
                value.match(
                    /^([A-Za-z]{3}\s+\d{1,2}\s+\d{4})\s+(.+)$/
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
                    fallbackDate ||
                    value,

                time:
                    value
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
                'fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto';


            const total =
                calls.length;


            let cards = '';


            calls.forEach(
                (call, index) => {

                    const dateTime =
                        this.splitCreatedAt(
                            call.createdAt,
                            call.date
                        );


                    const prospectName =
                        call.prospectFullName?.trim() ||
                        'No info';


                    const prospectCompany =
                        call.prospectCompany?.trim() ||
                        'No info';


                    const userName =
                        call.userFullName?.trim() ||
                        call.rep ||
                        'No info';


                    const note =
                        call.originalNote ||
                        call.note ||
                        'No info';


                    cards += `

                        <article
                            class="rounded-2xl border border-gray-800 bg-gray-950/80 shadow-xl overflow-hidden"
                        >

                            <!-- CALL HEADER -->

                            <div
                                class="px-5 py-4 border-b border-gray-800 bg-gray-900/70 flex flex-wrap items-center justify-between gap-3"
                            >

                                <div>

                                    <div
                                        class="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold"
                                    >
                                        Converted Call ${index + 1}
                                    </div>

                                    <div
                                        class="text-sm font-semibold text-white mt-1"
                                    >
                                        Record
                                        ${this.getDisplayValue(
                                            call.id || 'No info'
                                        )}
                                    </div>

                                </div>


                                <span
                                    class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                >
                                    Converted
                                </span>

                            </div>


                            <!-- CALL DETAILS -->

                            <div
                                class="p-5 space-y-5"
                            >

                                <!-- DATE / TIME / DIRECTION / STATE -->

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


                                <!-- PURPOSE / DISPOSITION -->

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


                                <!-- PEOPLE / PHONE -->

                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >

                                    ${this.renderDetailField(
                                        'User Full Name',
                                        userName
                                    )}

                                    ${this.renderDetailField(
                                        'To',
                                        call.to
                                    )}

                                    ${this.renderDetailField(
                                        'Prospect Full Name',
                                        prospectName
                                    )}

                                    ${this.renderDetailField(
                                        'Prospect Company',
                                        prospectCompany
                                    )}

                                </div>


                                <!-- NOTE -->

                                <div>

                                    <div
                                        class="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold mb-2"
                                    >
                                        Note
                                    </div>

                                    <div
                                        class="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-4 text-sm leading-6 text-gray-300 whitespace-pre-wrap break-words"
                                    >
                                        ${this.getDisplayValue(
                                            note
                                        )}
                                    </div>

                                </div>

                            </div>

                        </article>
                    `;
                }
            );


            if (!cards) {

                cards = `

                    <div
                        class="rounded-2xl border border-gray-800 bg-gray-950/80 p-8 text-center text-gray-500"
                    >
                        No converted calls found for this selection.
                    </div>

                `;
            }


            modal.innerHTML = `

                <div
                    class="w-full max-w-6xl my-4"
                >

                    <div
                        class="rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden"
                    >

                        <!-- MODAL HEADER -->

                        <div
                            class="px-6 py-5 border-b border-gray-800 bg-gray-950/80 flex flex-wrap items-center justify-between gap-4"
                        >

                            <div>

                                <div
                                    class="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-semibold"
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
                                    ${this.getDisplayValue(
                                        rep
                                    )}

                                    ·

                                    ${total}

                                    converted
                                    call${total === 1 ? '' : 's'}
                                </p>

                            </div>


                            <button
                                type="button"
                                onclick="AppUI.closeConvertedCalls()"
                                class="h-10 w-10 rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700 transition"
                                aria-label="Close"
                            >
                                <span
                                    class="text-xl leading-none"
                                >
                                    &times;
                                </span>
                            </button>

                        </div>


                        <!-- MODAL CONTENT -->

                        <div
                            class="p-4 sm:p-6 space-y-4"
                        >
                            ${cards}
                        </div>

                    </div>

                </div>

            `;


            /*
                Close when user clicks the dark backdrop.
            */

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


            /*
                Escape key support.
            */

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
    // DETAIL FIELD
    // ==========================================

    renderDetailField:
        function(
            label,
            value
        ) {

            return `

                <div
                    class="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                >

                    <div
                        class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold"
                    >
                        ${this.escapeHtml(
                            label
                        )}
                    </div>

                    <div
                        class="text-sm text-gray-200 mt-1 break-words"
                    >
                        ${this.getDisplayValue(
                            value
                        )}
                    </div>

                </div>

            `;
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


            /*
                Reset the clickable-call cache.
            */

            this.convertedCallCache =
                {};


            let bodyHTML = '';


            const sortedReps =
                Array.from(
                    window.AppState
                        .allKnownReps
                ).sort();


            let hasData = false;


            sortedReps.forEach(
                rep => {

                    if (

                        rep
                            .toLowerCase()
                            .includes(
                                searchRep
                                    .toLowerCase()
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

                            hasData = true;


                            /*
                                Store exact records for
                                this rep and current filters.
                            */

                            this.convertedCallCache[
                                rep
                            ] =
                                metrics
                                    .convertedRecords ||
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


                            /*
                                Hyperlink displayed directly
                                under the Converted DM Calls number.
                            */

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

                                    : `

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
                                        ${this.getDisplayValue(
                                            rep
                                        )}
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
