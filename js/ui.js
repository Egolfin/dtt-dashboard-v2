// ==========================================
// js/ui.js
// METRICS UI + CONVERSION DRILL-DOWN
// ==========================================

window.AppUI = {
    convertedCallCache: {},

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    displayValue(value) {
        const raw = String(value ?? '');
        return raw.trim() === '' ? 'No info' : this.escapeHtml(raw);
    },

    getRawField(call, header, fallback = '') {
        const fromRaw = call?.raw?.[header];
        if (fromRaw !== undefined && fromRaw !== null && String(fromRaw) !== '') {
            return String(fromRaw);
        }
        return fallback;
    },

    formatNoteForDisplay(note) {
        let text = String(note ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // If the exporter flattened the structured note into one line,
        // visually restore the major headings without changing the source data.
        text = text.replace(
            /\s+(?=[^\p{L}\p{N}]{0,12}\s*(?:Reason\s+of\s+Call|Key\s+Points?\s*\/?\s*Concerns?|Actions?\s+Taken|Next\s+Steps?|Follow\s*Up)\s*:)/giu,
            '\n\n'
        );

        text = text.replace(
            /\s+(?=[•▪◦●◆■➜➤→]\s*)/gu,
            '\n'
        );

        return text;
    },

    parseCreatedAt(createdAt) {
        const raw = String(createdAt ?? '');
        if (!raw.trim()) return { date: 'No info', time: 'No info' };

        const match = raw.match(/^(.+?\d{4})\s+(.+)$/);
        return match
            ? { date: match[1], time: match[2] }
            : { date: raw, time: 'No info' };
    },

    closeConvertedCalls() {
        document.getElementById('convertedCallsModal')?.remove();
    },

    renderDetailField(label, value) {
        return `
            <div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-left">
                <div class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-1.5">
                    ${this.escapeHtml(label)}
                </div>
                <div class="text-sm text-gray-200 break-words">
                    ${this.displayValue(value)}
                </div>
            </div>
        `;
    },

    openConvertedCalls(encodedRep) {
        const rep = decodeURIComponent(encodedRep);
        const calls = this.convertedCallCache[rep] || [];

        this.closeConvertedCalls();

        const modal = document.createElement('div');
        modal.id = 'convertedCallsModal';
        modal.className = 'fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto';

        let cards = '';

        calls.forEach((call, index) => {
            const createdAt = this.getRawField(call, 'Created At', call.createdAt);
            const dateTime = this.parseCreatedAt(createdAt);

            const direction = this.getRawField(call, 'Direction', call.direction);
            const state = this.getRawField(call, 'State', call.state);
            const to = this.getRawField(call, 'To', call.to);
            const purpose = this.getRawField(call, 'Purpose', call.purpose);
            const disposition = this.getRawField(call, 'Disposition', call.disposition);
            const userFullName = [
                this.getRawField(call, 'User First Name', call.userFirstName),
                this.getRawField(call, 'User Last Name', call.userLastName)
            ].filter(Boolean).join(' ') || call.userFullName || '';
            const prospectFullName = [
                this.getRawField(call, 'Prospect First Name', call.prospectFirstName),
                this.getRawField(call, 'Prospect Last Name', call.prospectLastName)
            ].filter(Boolean).join(' ') || call.prospectFullName || '';
            const prospectCompany = this.getRawField(call, 'Prospect Company', call.prospectCompany);
            const note = this.getRawField(call, 'Note', call.originalNote);

            cards += `
                <article class="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-xl text-left">
                    <div class="px-5 py-4 border-b border-gray-800 bg-gray-900/80">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="text-[10px] uppercase tracking-[0.18em] text-indigo-400 font-bold">
                                    Converted Call ${index + 1}
                                </div>
                                <div class="text-sm font-semibold text-white mt-1">
                                    Record ID: ${this.displayValue(this.getRawField(call, 'Id', call.id))}
                                </div>
                            </div>
                            <span class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                                Converted
                            </span>
                        </div>
                    </div>

                    <div class="p-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            ${this.renderDetailField('Date', dateTime.date)}
                            ${this.renderDetailField('Time', dateTime.time)}
                            ${this.renderDetailField('Direction', direction)}
                            ${this.renderDetailField('State', state)}
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${this.renderDetailField('Purpose', purpose)}
                            ${this.renderDetailField('Disposition', disposition)}
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${this.renderDetailField('User Full Name', userFullName)}
                            ${this.renderDetailField('To', to)}
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${this.renderDetailField('Prospect Full Name', prospectFullName)}
                            ${this.renderDetailField('Prospect Company', prospectCompany)}
                        </div>

                        <div class="pt-2">
                            <div class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 text-left">
                                Note
                            </div>
                            <pre class="m-0 w-full rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-5 text-sm leading-7 text-gray-200 font-sans text-left whitespace-pre-wrap break-words overflow-x-auto">${this.escapeHtml(this.formatNoteForDisplay(note))}</pre>
                        </div>

                        ${
                            call.conversionEvidence
                            ? `
                                <div>
                                    <div class="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 text-left">
                                        Detected Conversion Evidence
                                    </div>
                                    <pre class="m-0 w-full rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-4 text-sm leading-6 text-indigo-200 font-sans text-left whitespace-pre-wrap break-words">${this.escapeHtml(call.conversionEvidence)}</pre>
                                </div>
                            `
                            : ''
                        }
                    </div>
                </article>
            `;
        });

        if (!cards) {
            cards = `
                <div class="rounded-2xl border border-gray-800 bg-gray-950 p-10 text-center text-gray-500">
                    No converted calls found.
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="w-full max-w-6xl my-4">
                <div class="rounded-3xl border border-gray-800 bg-gray-900 overflow-hidden shadow-2xl">
                    <div class="px-6 py-5 border-b border-gray-800 bg-gray-950">
                        <div class="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div class="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">
                                    Conversion Detail
                                </div>
                                <h2 class="text-xl font-bold text-white mt-1">Converted DM Calls</h2>
                                <p class="text-sm text-gray-400 mt-1">
                                    ${this.displayValue(rep)} &middot; ${calls.length} converted call${calls.length === 1 ? '' : 's'}
                                </p>
                            </div>
                            <button type="button" onclick="AppUI.closeConvertedCalls()" class="h-10 w-10 rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition">
                                &times;
                            </button>
                        </div>
                    </div>

                    <div class="p-4 sm:p-6 space-y-4">
                        ${cards}
                    </div>
                </div>
            </div>
        `;

        modal.addEventListener('click', (event) => {
            if (event.target === modal) this.closeConvertedCalls();
        });

        document.body.appendChild(modal);
    },

    renderMetricsTab(startDateStr, endDateStr, searchRep, selectedTeam) {
        const thead = document.getElementById('metricsTableHead');
        const tbody = document.getElementById('metricsTableBody');

        document.getElementById('metricsDateRange').textContent =
            `Strict Conversion: Sponsored Listings + Promotions | ${startDateStr} to ${endDateStr}`;

        thead.innerHTML = `
            <tr>
                <th class="py-3 px-4 sticky-col">Rep Name</th>
                <th class="py-3 px-4 text-center">Total DM Calls</th>
                <th class="py-3 px-4 text-center">Connected DM Calls</th>
                <th class="py-3 px-4 text-center">Connect Rate %</th>
                <th class="py-3 px-4 text-center border-l border-gray-800">Converted DM Calls</th>
                <th class="py-3 px-4 text-center">Committed</th>
                <th class="py-3 px-4 text-center">Ambiguous</th>
                <th class="py-3 px-4 text-center">Conversion Rate %</th>
            </tr>
        `;

        this.convertedCallCache = {};
        let bodyHTML = '';
        let hasData = false;

        Array.from(window.AppState.allKnownReps).sort().forEach(rep => {
            if (!rep.toLowerCase().includes(searchRep.toLowerCase())) return;
            if (!isRepInTeam(rep, selectedTeam)) return;

            const metrics = window.AppMetrics.getDecisionMakerConnectRate(
                startDateStr,
                endDateStr,
                rep,
                selectedTeam
            );

            if (metrics.total <= 0) return;

            hasData = true;
            this.convertedCallCache[rep] = metrics.convertedRecords || [];

            const rateColor = metrics.rate >= 15
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : metrics.rate >= 10
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

            const convColor = metrics.conversionRate >= 10
                ? 'text-emerald-400 font-bold'
                : metrics.conversionRate > 0
                    ? 'text-amber-400 font-bold'
                    : 'text-gray-500';

            const link = metrics.convertedCalls > 0
                ? `<a href="#" onclick="AppUI.openConvertedCalls('${encodeURIComponent(rep)}'); return false;" class="inline-flex items-center gap-1 mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2">View ${metrics.convertedCalls === 1 ? 'call' : 'calls'}</a>`
                : `<span class="block mt-1 text-[11px] text-gray-600">No converted calls</span>`;

            bodyHTML += `
                <tr class="hover:bg-gray-800/30 transition">
                    <td class="py-3 px-4 font-sans font-medium text-gray-200 sticky-col">${this.displayValue(rep)}</td>
                    <td class="py-3 px-4 text-center text-gray-400">${metrics.total}</td>
                    <td class="py-3 px-4 text-center text-gray-300 font-bold">${metrics.connected}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded font-bold ${rateColor} border">${metrics.rate}%</span>
                    </td>
                    <td class="py-3 px-4 text-center border-l border-gray-800/50">
                        <div class="text-indigo-300 font-bold">${metrics.convertedCalls}</div>
                        ${link}
                    </td>
                    <td class="py-3 px-4 text-center text-amber-300 font-bold">${metrics.committedCalls}</td>
                    <td class="py-3 px-4 text-center text-yellow-300 font-bold">${metrics.ambiguousCalls}</td>
                    <td class="py-3 px-4 text-center ${convColor}">${metrics.conversionRate}%</td>
                </tr>
            `;
        });

        if (!hasData) {
            bodyHTML = `<tr><td colspan="8" class="py-8 text-center text-gray-500 font-sans">No Decision Maker calls logged for this criteria.</td></tr>`;
        }

        tbody.innerHTML = bodyHTML;
    }
};
