// ==========================================
// js/report-export.js
// REPORT EXPORTS (PNG + PRINT-OPTIMIZED PDF)
// ==========================================

window.AppReportExport = {
    buildReportClone() {
        const source = document.getElementById('matrixTableSection');
        if (!source) throw new Error('DTT report section was not found.');

        const clone = source.cloneNode(true);
        clone.classList.remove('hidden');
        clone.classList.add('dtt-export-report');

        // The live table uses sticky positioning and a constrained scroll wrapper.
        // For exports we remove those constraints so every rep/date column is rendered.
        const scrollWrapper = clone.querySelector('#tableScrollWrapper');
        if (scrollWrapper) {
            scrollWrapper.style.maxHeight = 'none';
            scrollWrapper.style.overflow = 'visible';
            scrollWrapper.style.position = 'static';
        }

        clone.querySelectorAll('.sticky-col, .sticky-header').forEach(el => {
            el.style.position = 'static';
            el.style.zIndex = 'auto';
        });

        clone.querySelectorAll('.dtt-export-hide').forEach(el => el.remove());

        const title = document.createElement('div');
        title.className = 'dtt-export-title';
        title.innerHTML = `
            <div>
                <div class="dtt-export-kicker">DOORDASH · DTT ANALYTICS</div>
                <div class="dtt-export-heading">DTT Performance Report</div>
                <div class="dtt-export-subheading">${escapeHtml(document.getElementById('reportSubtitle')?.textContent || '')}</div>
            </div>
            <div class="dtt-export-meta">${escapeHtml(document.getElementById('reportHeaderTitle')?.textContent || '')}</div>
        `;
        clone.insertBefore(title, clone.firstChild);

        return clone;
    },

    async exportPng() {
        if (!window.html2canvas) {
            throw new Error('PNG export library is not available.');
        }

        const clone = this.buildReportClone();
        this.mountOffscreen(clone);

        try {
            const canvas = await window.html2canvas(clone, {
                backgroundColor: '#090d16',
                scale: Math.min(2, window.devicePixelRatio || 1),
                useCORS: true,
                logging: false,
                width: clone.scrollWidth,
                height: clone.scrollHeight,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight
            });

            const link = document.createElement('a');
            link.download = this.fileName('png');
            link.href = canvas.toDataURL('image/png');
            link.click();
        } finally {
            clone.remove();
        }
    },

    printPdf() {
        const clone = this.buildReportClone();
        this.mountOffscreen(clone);

        const printWindow = window.open('', '_blank', 'noopener,noreferrer');
        if (!printWindow) {
            clone.remove();
            throw new Error('The browser blocked the report window. Please allow pop-ups for this site.');
        }

        const styles = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules || []).map(rule => rule.cssText).join('\\n');
                } catch {
                    return '';
                }
            })
            .join('\\n');

        printWindow.document.open();
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(this.fileName('pdf').replace(/\.pdf$/i, ''))}</title><style>${styles}${this.pdfStyles()}</style></head><body>${clone.outerHTML}</body></html>`);
        printWindow.document.close();

        clone.remove();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 350);
    },

    mountOffscreen(element) {
        element.style.position = 'fixed';
        element.style.left = '-100000px';
        element.style.top = '0';
        element.style.width = `${Math.max(document.documentElement.clientWidth, element.scrollWidth || 1200)}px`;
        element.style.maxWidth = 'none';
        element.style.overflow = 'visible';
        element.style.background = '#090d16';
        document.body.appendChild(element);
    },

    fileName(extension) {
        const mode = window.AppState?.currentMode || 'report';
        const team = window.AppState?.selectedTeam && window.AppState.selectedTeam !== 'ALL'
            ? `_${window.AppState.selectedTeam.replace(/[^a-z0-9]+/gi, '_')}`
            : '';
        return `DTT_Performance_${mode}${team}.${extension}`;
    },

    pdfStyles() {
        return `
            @page { size: landscape; margin: 0.28in; }
            html, body { margin: 0; padding: 0; background: #090d16; color: #f3f4f6; font-family: Arial, Helvetica, sans-serif; }
            .dtt-export-report { width: max-content; min-width: 100%; background: #090d16; padding: 16px; box-sizing: border-box; }
            .dtt-export-title { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; border-bottom:1px solid #263247; padding:0 0 12px; margin-bottom:12px; }
            .dtt-export-kicker { font-size:9px; letter-spacing:.16em; color:#93a4bd; font-weight:700; }
            .dtt-export-heading { font-size:20px; font-weight:800; margin-top:3px; color:#fff; }
            .dtt-export-subheading, .dtt-export-meta { font-size:10px; color:#9aa8bb; }
            .dtt-export-meta { text-align:right; max-width:38%; }
            .dtt-export-report table { width:max-content; min-width:100%; border-collapse:collapse; table-layout:auto; }
            .dtt-export-report th { background:#111827 !important; color:#d6deea !important; font-weight:700; font-size:9px; white-space:nowrap; padding:7px 8px !important; border:1px solid #273246 !important; }
            .dtt-export-report td { background:#0d1322 !important; color:#e7edf5 !important; font-size:9px; white-space:nowrap; padding:6px 8px !important; border:1px solid #273246 !important; }
            .dtt-export-report tr { break-inside:avoid; page-break-inside:avoid; }
            .dtt-export-report .heat-red { background:rgba(239,68,68,.22) !important; color:#fecaca !important; }
            .dtt-export-report .heat-yellow { background:rgba(245,158,11,.22) !important; color:#fde68a !important; }
            .dtt-export-report .heat-green { background:rgba(16,185,129,.22) !important; color:#a7f3d0 !important; }
            .dtt-export-report .rounded-2xl, .dtt-export-report .rounded-xl { border-radius:0 !important; }
            .dtt-export-report > :not(.dtt-export-title) { max-height:none !important; }
            .dtt-export-report section { border:1px solid #273246 !important; }
            .dtt-export-report .bg-gray-900\\/90, .dtt-export-report .bg-gray-900\\/40, .dtt-export-report .bg-gray-900\\/50 { background:#111827 !important; }
            .dtt-export-report .shadow, .dtt-export-report .shadow-lg, .dtt-export-report .shadow-xl, .dtt-export-report .shadow-2xl { box-shadow:none !important; }
            .dtt-export-report .print-header { display:flex !important; }
        `;
    }
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
