// ==========================================
// js/report-export.js
// FIXED-GRID REPORT EXPORTS (PNG + PDF)
// ==========================================

window.AppReportExport = {
    getReportData() {
        const table = document.getElementById('dttTable');

        if (!table) {
            throw new Error('DTT report table was not found.');
        }

        const headers = Array.from(
            table.querySelectorAll('thead th')
        ).map(th => th.textContent.trim());

        const rows = Array.from(
            table.querySelectorAll('tbody tr')
        )
            .map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => ({
                    text: td.textContent.trim(),
                    heat:
                        td.querySelector('.heat-green') ? 'green' :
                        td.querySelector('.heat-yellow') ? 'yellow' :
                        td.querySelector('.heat-red') ? 'red' :
                        ''
                }))
            )
            .filter(row => row.length);

        const footer = Array.from(
            table.querySelectorAll('tfoot td')
        ).map(td => td.textContent.trim());

        return { headers, rows, footer };
    },

    buildReport() {
        const { headers, rows, footer } = this.getReportData();

        const title =
            document.getElementById('reportHeaderTitle')?.textContent ||
            'DTT Performance Summary';

        const subtitle =
            document.getElementById('reportSubtitle')?.textContent ||
            '';

        const report = document.createElement('div');
        report.className = 'dtt-export-sheet';

        // Fixed widths prevent the browser from squeezing columns unevenly.
        const repColumnWidth = 250;
        const numericColumnWidth = 92;

        const totalWidth =
            repColumnWidth +
            ((headers.length - 1) * numericColumnWidth);

        report.style.width = `${totalWidth}px`;

        const headerHtml = headers
            .map((header, index) => `
                <th class="${index === 0 ? 'rep-col' : 'num-col'}">
                    ${escapeReportHtml(header)}
                </th>
            `)
            .join('');

        const bodyHtml = rows
            .map(row => `
                <tr>
                    ${row.map((cell, index) => `
                        <td class="${index === 0 ? 'rep-col' : 'num-col'}">
                            ${
                                cell.heat
                                    ? `<span class="value-pill heat-${cell.heat}">${escapeReportHtml(cell.text)}</span>`
                                    : escapeReportHtml(cell.text)
                            }
                        </td>
                    `).join('')}
                </tr>
            `)
            .join('');

        const footerHtml = footer.length
            ? `
                <tfoot>
                    <tr>
                        ${footer.map((value, index) => `
                            <td class="${index === 0 ? 'rep-col' : 'num-col'}">
                                ${escapeReportHtml(value)}
                            </td>
                        `).join('')}
                    </tr>
                </tfoot>
            `
            : '';

        report.innerHTML = `
            <style>
                ${this.reportStyles()}
            </style>

            <div class="report-top">
                <div>
                    <div class="report-kicker">
                        DOORDASH · DTT ANALYTICS
                    </div>

                    <h1>
                        ${escapeReportHtml(title)}
                    </h1>

                    <div class="report-subtitle">
                        ${escapeReportHtml(subtitle)}
                    </div>
                </div>

                <div class="report-legend">
                    <span class="legend red">&lt; 50m</span>
                    <span class="legend yellow">50m - 69m</span>
                    <span class="legend green">&ge; 70m</span>
                    <span class="target">Target: 350m/week</span>
                </div>
            </div>

            <table class="export-table">
                <colgroup>
                    <col style="width:${repColumnWidth}px">

                    ${headers
                        .slice(1)
                        .map(
                            () =>
                                `<col style="width:${numericColumnWidth}px">`
                        )
                        .join('')}
                </colgroup>

                <thead>
                    <tr>
                        ${headerHtml}
                    </tr>
                </thead>

                <tbody>
                    ${bodyHtml}
                </tbody>

                ${footerHtml}
            </table>
        `;

        return report;
    },

    async exportPng() {
        if (!window.html2canvas) {
            throw new Error(
                'PNG export library is not available.'
            );
        }

        const report = this.buildReport();

        this.mount(report);

        try {
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            const canvas =
                await window.html2canvas(report, {
                    backgroundColor: '#090d16',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: report.offsetWidth,
                    height: report.offsetHeight,
                    windowWidth: report.offsetWidth,
                    windowHeight: report.offsetHeight,
                    scrollX: 0,
                    scrollY: 0
                });

            const link = document.createElement('a');

            link.download = this.fileName('png');
            link.href = canvas.toDataURL('image/png');

            link.click();
        } finally {
            report.remove();
        }
    },

    printPdf() {
        const report = this.buildReport();

        const printWindow =
            window.open('', '_blank');

        if (!printWindow) {
            throw new Error(
                'The browser blocked the report window. Please allow pop-ups for this site.'
            );
        }

        printWindow.document.open();

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>
                        ${escapeReportHtml(
                            this.fileName('pdf')
                        )}
                    </title>

                    <style>
                        ${this.reportStyles()}

                        @page {
                            size: landscape;
                            margin: 0.25in;
                        }

                        html,
                        body {
                            margin: 0;
                            padding: 0;
                            background: #090d16;
                        }

                        .dtt-export-sheet {
                            width: 100% !important;
                            padding: 12px !important;
                        }

                        .export-table {
                            width: 100% !important;
                        }

                        thead {
                            display: table-header-group;
                        }

                        tfoot {
                            display: table-footer-group;
                        }

                        tr {
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }
                    </style>
                </head>

                <body>
                    ${report.outerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 300);
    },

    mount(report) {
        report.style.position = 'absolute';
        report.style.left = '-100000px';
        report.style.top = '0';

        document.body.appendChild(report);
    },

    fileName(extension) {
        const mode =
            window.AppState?.currentMode ||
            'report';

        const team =
            window.AppState?.selectedTeam &&
            window.AppState.selectedTeam !== 'ALL'
                ? `_${window.AppState.selectedTeam.replace(
                    /[^a-z0-9]+/gi,
                    '_'
                )}`
                : '';

        return `DTT_Performance_${mode}${team}.${extension}`;
    },

    reportStyles() {
        return `
            * {
                box-sizing: border-box;
            }

            .dtt-export-sheet {
                background: #090d16;
                color: #e5e7eb;
                padding: 24px;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
            }

            .report-top {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 24px;

                padding: 0 2px 16px;
                margin-bottom: 14px;

                border-bottom:
                    1px solid #263247;
            }

            .report-kicker {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.18em;
                color: #818cf8;
                margin-bottom: 5px;
            }

            .report-top h1 {
                margin: 0 0 5px;

                font-size: 22px;
                line-height: 1.15;
                font-weight: 800;

                color: #ffffff;
            }

            .report-subtitle {
                font-size: 11px;
                color: #9ca3af;
            }

            .report-legend {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 7px;

                white-space: nowrap;
            }

            .legend {
                font-size: 9px;
                font-weight: 700;

                border-radius: 5px;
                padding: 5px 8px;

                border: 1px solid;
            }

            .legend.red {
                color: #fecaca;
                background: #7f1d2d;
                border-color: #9f2940;
            }

            .legend.yellow {
                color: #fef3c7;
                background: #73550b;
                border-color: #92700c;
            }

            .legend.green {
                color: #d1fae5;
                background: #065f46;
                border-color: #08775a;
            }

            .target {
                font-size: 9px;
                color: #9ca3af;
                margin-left: 4px;
            }

            .export-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;

                background: #0d1322;

                border:
                    1px solid #263247;
            }

            .export-table th,
            .export-table td {
                height: 34px;

                border:
                    1px solid #202b3d;

                padding: 5px 8px;

                vertical-align: middle;
            }

            .export-table th {
                height: 38px;

                background: #111827;

                color: #cbd5e1;

                font-size: 9px;
                font-weight: 800;

                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .export-table td {
                font-size: 10px;
            }

            .rep-col {
                text-align: left !important;
                white-space: nowrap;

                overflow: hidden;
                text-overflow: ellipsis;
            }

            .export-table td.rep-col {
                font-weight: 600;
                color: #e5e7eb;
            }

            .num-col {
                text-align: center !important;

                font-variant-numeric:
                    tabular-nums;
            }

            .value-pill {
                display: inline-flex;

                align-items: center;
                justify-content: center;

                min-width: 50px;
                height: 21px;

                padding: 0 7px;

                border-radius: 5px;

                font-size: 9px;
                font-weight: 700;
            }

            .heat-red {
                background: #57202c;
                color: #fda4af;
                border: 1px solid #783142;
            }

            .heat-yellow {
                background: #58430f;
                color: #fde68a;
                border: 1px solid #725817;
            }

            .heat-green {
                background: #064e3b;
                color: #6ee7b7;
                border: 1px solid #087158;
            }

            .export-table tfoot td {
                height: 38px;

                background: #111827;

                color: #dbeafe;

                font-weight: 800;

                border-top:
                    2px solid #334155;
            }

            .export-table tfoot td:last-child {
                color: #818cf8;
            }
        `;
    }
};

function escapeReportHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
