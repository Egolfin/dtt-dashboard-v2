// ==========================================
// js/app.js
// MAIN APPLICATION CONTROLLER
// ==========================================

window.app = {

    activeTab: 'matrix',


    // ==========================================
    // INIT
    // ==========================================

    init:
        function() {

            this.setupDragAndDrop();

            this.setupEventListeners();

            this.loadStateAndRender();
        },


    // ==========================================
    // DRAG / DROP
    // ==========================================

    setupDragAndDrop:
        function() {

            const dropZone =
                document.getElementById(
                    'dropZone'
                );

            const fileInput =
                document.getElementById(
                    'csvFileInput'
                );


            if (
                !dropZone ||
                !fileInput
            ) {
                return;
            }


            dropZone.addEventListener(
                'click',
                () =>
                    fileInput.click()
            );


            dropZone.addEventListener(
                'dragover',
                event =>
                    event.preventDefault()
            );


            dropZone.addEventListener(
                'drop',
                event => {

                    event.preventDefault();

                    if (
                        event.dataTransfer
                            .files.length
                    ) {

                        this.handleFile(
                            event.dataTransfer
                                .files[0]
                        );
                    }
                }
            );


            fileInput.addEventListener(
                'change',
                event => {

                    if (
                        event.target.files.length
                    ) {

                        this.handleFile(
                            event.target.files[0]
                        );
                    }
                }
            );
        },


    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners:
        function() {

            /*
                Manual DTT form
            */

            document
                .getElementById(
                    'manualDTTForm'
                )
                ?.addEventListener(
                    'submit',
                    event => {

                        event.preventDefault();

                        this.addManualRecord(

                            document
                                .getElementById(
                                    'manualRepInput'
                                ).value,

                            document
                                .getElementById(
                                    'manualDateInput'
                                ).value,

                            document
                                .getElementById(
                                    'manualMinutesInput'
                                ).value,

                            event.target
                        );
                    }
                );


            /*
                Manual tab form
            */

            document
                .getElementById(
                    'manualDTTFormTab'
                )
                ?.addEventListener(
                    'submit',
                    event => {

                        event.preventDefault();

                        this.addManualRecord(

                            document
                                .getElementById(
                                    'manualRepInputTab'
                                ).value,

                            document
                                .getElementById(
                                    'manualDateInputTab'
                                ).value,

                            document
                                .getElementById(
                                    'manualMinutesInputTab'
                                ).value,

                            event.target
                        );
                    }
                );


            /*
                Exports
            */

            document
                .getElementById(
                    'exportBtn'
                )
                ?.addEventListener(
                    'click',
                    () => {

                        const tableId =
                            this.activeTab ===
                            'metrics'

                                ? 'metricsTable'

                                : 'dttTable';


                        const sheetName =
                            this.activeTab ===
                            'metrics'

                                ? 'DM_Connect_Rate'

                                : 'DTT_Report';


                        const fileName =
                            this.activeTab ===
                            'metrics'

                                ? 'Decision_Maker_Connect_Rate.xlsx'

                                : 'DTT_Performance_Summary.xlsx';


                        const table =
                            document.getElementById(
                                tableId
                            );


                        const wb =
                            XLSX.utils
                                .table_to_book(
                                    table,
                                    {
                                        sheet:
                                            sheetName
                                    }
                                );


                        XLSX.writeFile(
                            wb,
                            fileName
                        );
                    }
                );


            document
                .getElementById(
                    'exportPdfBtn'
                )
                ?.addEventListener(
                    'click',
                    () =>
                        window.print()
                );
        },


    // ==========================================
    // HANDLE CSV
    // ==========================================

    handleFile:
        function(file) {

            /*
                IMPORTANT:

                Every new CSV upload completely replaces
                the stored CSV-derived data.
            */

            window.AppState.rawCallData =
                [];

            window.AppState.parsedDates =
                [];

            window.AppState.fileName =
                file.name;

            window.AppState.schemaVersion =
                DATA_SCHEMA_VERSION;


            const fileNameDisplay =
                document.getElementById(
                    'fileNameDisplay'
                );


            if (
                fileNameDisplay
            ) {

                fileNameDisplay.textContent =
                    `File: ${file.name}`;

                fileNameDisplay
                    .classList
                    .remove(
                        'hidden'
                    );
            }


            /*
                Explicit UTF-8 support.

                PapaParse also preserves quoted multiline
                CSV fields such as Note.
            */

            Papa.parse(
                file,
                {

                    header:
                        true,

                    skipEmptyLines:
                        'greedy',

                    encoding:
                        'UTF-8',

                    dynamicTyping:
                        false,

                    worker:
                        false,

                    complete:
                        results => {

                            /*
                                Parse the actual CSV rows.
                            */

                            processCSVData(
                                results.data
                            );


                            /*
                                Show the application.
                            */

                            document
                                .getElementById(
                                    'appControls'
                                )
                                .classList
                                .remove(
                                    'hidden'
                                );


                            document
                                .getElementById(
                                    'matrixTableSection'
                                )
                                .classList
                                .remove(
                                    'hidden'
                                );


                            this.setPresetPeriod(
                                'weekly'
                            );


                            /*
                                Make sure the metrics tab
                                is also available after upload.
                            */

                            if (
                                this.activeTab ===
                                'metrics'
                            ) {

                                document
                                    .getElementById(
                                        'metricsTableSection'
                                    )
                                    .classList
                                    .remove(
                                        'hidden'
                                    );
                            }
                        },


                    error:
                        error => {

                            console.error(
                                'CSV parsing error:',
                                error
                            );


                            alert(
                                `CSV parsing failed: ${error?.message || error}`
                            );
                        }
                }
            );
        },


    // ==========================================
    // LOAD SAVED STATE
    // ==========================================

    async loadStateAndRender() {

        try {

            const db =
                await openDB();


            const tx =
                db.transaction(
                    'app_state',
                    'readonly'
                );


            const store =
                tx.objectStore(
                    'app_state'
                );


            const request =
                store.get(
                    'current_data'
                );


            request.onsuccess =
                () => {

                    const savedState =
                        request.result;


                    /*
                        IMPORTANT FIX:

                        Old data does not have the
                        full source fields.

                        We DO NOT restore it.

                        We preserve manual DTT entries,
                        but force a fresh CSV upload.
                    */

                    if (
                        !savedState ||
                        savedState.schemaVersion !==
                            DATA_SCHEMA_VERSION ||
                        !this.hasCompleteCallSchema(
                            savedState
                        )
                    ) {

                        console.info(
                            'Legacy CSV state detected. Fresh CSV import required.'
                        );


                        if (
                            savedState?.manualEntries
                        ) {

                            window.AppState
                                .manualEntries =
                                savedState
                                    .manualEntries;
                        }


                        window.AppState.schemaVersion =
                            DATA_SCHEMA_VERSION;


                        window.AppState.rawCallData =
                            [];


                        window.AppState.allKnownReps =
                            new Set(
                                window.AppState
                                    .manualEntries
                                    .map(
                                        entry =>
                                            entry.rep
                                    )
                            );


                        this.showFreshImportMessage();

                        return;
                    }


                    /*
                        Valid modern state.
                    */

                    window.AppState =
                        savedState;


                    window.AppState
                        .allKnownReps =
                        new Set(
                            savedState
                                .allKnownReps ||
                            []
                        );


                    window.AppState.schemaVersion =
                        DATA_SCHEMA_VERSION;


                    const badge =
                        document.getElementById(
                            'manualBadgeCount'
                        );


                    if (badge) {

                        badge.textContent =
                            window.AppState
                                .manualEntries
                                .length;
                    }


                    if (
                        window.AppState
                            .rawCallData
                            .length > 0
                    ) {

                        const name =
                            document.getElementById(
                                'fileNameDisplay'
                            );


                        name.textContent =
                            `File: ${window.AppState.fileName} (Restored)`;


                        name.classList
                            .remove(
                                'hidden'
                            );


                        document
                            .getElementById(
                                'appControls'
                            )
                            .classList
                            .remove(
                                'hidden'
                            );


                        document
                            .getElementById(
                                'matrixTableSection'
                            )
                            .classList
                            .remove(
                                'hidden'
                            );


                        document
                            .getElementById(
                                'teamSelect'
                            )
                            .value =
                            window.AppState
                                .selectedTeam ||
                            'ALL';


                        this.setPresetPeriod(
                            window.AppState
                                .currentMode ||
                            'weekly'
                        );
                    }
                };

        } catch (err) {

            console.warn(
                'No saved state found.',
                err
            );
        }
    },


    // ==========================================
    // VALIDATE SAVED CALL SCHEMA
    // ==========================================

    hasCompleteCallSchema:
        function(state) {

            if (
                !state ||
                !Array.isArray(
                    state.rawCallData
                ) ||
                state.rawCallData.length === 0
            ) {

                return false;
            }


            const sample =
                state.rawCallData
                    .find(Boolean);


            if (!sample) {
                return false;
            }


            /*
                These fields MUST exist in the
                new schema.
            */

            const requiredFields = [

                'id',

                'createdAt',

                'direction',

                'to',

                'state',

                'originalNote',

                'userFullName',

                'prospectFullName',

                'prospectCompany'

            ];


            return requiredFields.every(
                field =>
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            sample,
                            field
                        )
            );
        },


    // ==========================================
    // FRESH IMPORT MESSAGE
    // ==========================================

    showFreshImportMessage:
        function() {

            const appControls =
                document.getElementById(
                    'appControls'
                );

            const matrix =
                document.getElementById(
                    'matrixTableSection'
                );


            if (appControls) {

                appControls
                    .classList
                    .add(
                        'hidden'
                    );
            }


            if (matrix) {

                matrix
                    .classList
                    .add(
                        'hidden'
                    );
            }


            const name =
                document.getElementById(
                    'fileNameDisplay'
                );


            if (name) {

                name.textContent =
                    'Previous CSV data was outdated. Please upload the CSV again.';

                name.classList
                    .remove(
                        'hidden'
                    );
            }


            /*
                Badge.
            */

            const badge =
                document.getElementById(
                    'manualBadgeCount'
                );


            if (badge) {

                badge.textContent =
                    window.AppState
                        .manualEntries
                        .length;
            }
        },


    // ==========================================
    // TAB SWITCHING
    // ==========================================

    switchTab:
        function(tab) {

            this.activeTab =
                tab;


            document
                .querySelectorAll(
                    '.tab-btn'
                )
                .forEach(
                    button => {

                        button.classList
                            .remove(
                                'active',
                                'text-gray-300',
                                'border-indigo-500'
                            );

                        button.classList
                            .add(
                                'text-gray-400',
                                'border-transparent'
                            );
                    }
                );


            const activeButton =
                document.getElementById(
                    `tab-${tab}`
                );


            if (activeButton) {

                activeButton.classList
                    .remove(
                        'text-gray-400',
                        'border-transparent'
                    );

                activeButton.classList
                    .add(
                        'active',
                        'text-gray-300',
                        'border-indigo-500'
                    );
            }


            document
                .getElementById(
                    'sharedTopSection'
                )
                .classList
                .add(
                    'hidden'
                );

            document
                .getElementById(
                    'matrixTableSection'
                )
                .classList
                .add(
                    'hidden'
                );

            document
                .getElementById(
                    'metricsTableSection'
                )
                .classList
                .add(
                    'hidden'
                );

            document
                .getElementById(
                    'manualTabView'
                )
                .classList
                .add(
                    'hidden'
                );


            if (
                tab === 'matrix'
            ) {

                document
                    .getElementById(
                        'sharedTopSection'
                    )
                    .classList
                    .remove(
                        'hidden'
                    );


                if (
                    window.AppState
                        .rawCallData
                        .length > 0
                ) {

                    document
                        .getElementById(
                            'matrixTableSection'
                        )
                        .classList
                        .remove(
                            'hidden'
                        );
                }

            } else if (
                tab === 'metrics'
            ) {

                document
                    .getElementById(
                        'sharedTopSection'
                    )
                    .classList
                    .remove(
                        'hidden'
                    );


                if (
                    window.AppState
                        .rawCallData
                        .length > 0
                ) {

                    document
                        .getElementById(
                            'metricsTableSection'
                        )
                        .classList
                        .remove(
                            'hidden'
                        );
                }

            } else if (
                tab === 'manual'
            ) {

                document
                    .getElementById(
                        'manualTabView'
                    )
                    .classList
                    .remove(
                        'hidden'
                    );
            }


            this.renderActiveTab();
        },


    // ==========================================
    // PERIOD
    // ==========================================

    setPresetPeriod:
        function(mode) {

            window.AppState.currentMode =
                mode;


            document
                .querySelectorAll(
                    '.btn-period'
                )
                .forEach(
                    button =>
                        button.classList
                            .remove(
                                'active'
                            )
                );


            const btnMap = {

                weekly:
                    'btnWeekly',

                monthly:
                    'btnMonthly',

                qtd:
                    'btnQTD',

                custom:
                    'btnCustom'
            };


            if (
                btnMap[mode]
            ) {

                document
                    .getElementById(
                        btnMap[mode]
                    )
                    ?.classList
                    .add(
                        'active'
                    );
            }


            const customSec =
                document.getElementById(
                    'customDateSection'
                );

            const qtdSec =
                document.getElementById(
                    'qtdSection'
                );


            if (
                mode ===
                'custom'
            ) {

                customSec
                    .classList
                    .remove(
                        'hidden'
                    );

                qtdSec
                    .classList
                    .add(
                        'hidden'
                    );

            } else if (
                mode ===
                'qtd'
            ) {

                customSec
                    .classList
                    .add(
                        'hidden'
                    );

                qtdSec
                    .classList
                    .remove(
                        'hidden'
                    );

            } else {

                customSec
                    .classList
                    .add(
                        'hidden'
                    );

                qtdSec
                    .classList
                    .add(
                        'hidden'
                    );
            }


            if (
                window.AppState
                    .parsedDates
                    .length === 0
            ) {

                return;
            }


            const maxDateStr =
                window.AppState
                    .parsedDates[
                        window.AppState
                            .parsedDates
                            .length - 1
                    ];


            let startStr =
                maxDateStr;

            let endStr =
                maxDateStr;


            if (
                mode ===
                'weekly'
            ) {

                const parts =
                    maxDateStr
                        .split('-');


                const d =
                    new Date(
                        parseInt(
                            parts[0],
                            10
                        ),
                        parseInt(
                            parts[1],
                            10
                        ) - 1,
                        parseInt(
                            parts[2],
                            10
                        )
                    );


                const diffToMon =
                    d.getDay() === 0

                        ? -6

                        : 1 - d.getDay();


                startStr =
                    addDaysToStringDate(
                        maxDateStr,
                        diffToMon
                    );

            } else if (
                mode ===
                'monthly'
            ) {

                const parts =
                    maxDateStr.split('-');


                startStr =
                    `${parts[0]}-${parts[1]}-01`;


                const lastDay =
                    new Date(
                        parseInt(
                            parts[0],
                            10
                        ),
                        parseInt(
                            parts[1],
                            10
                        ),
                        0
                    ).getDate();


                endStr =
                    `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`;

            } else if (
                mode ===
                'qtd'
            ) {

                const y =
                    maxDateStr.split('-')[0];


                const q =
                    parseInt(
                        document
                            .getElementById(
                                'quarterSelect'
                            )
                            .value,
                        10
                    );


                if (q === 1) {

                    startStr =
                        `${y}-01-01`;

                    endStr =
                        `${y}-03-31`;

                } else if (
                    q === 2
                ) {

                    startStr =
                        `${y}-04-01`;

                    endStr =
                        `${y}-06-30`;

                } else if (
                    q === 3
                ) {

                    startStr =
                        `${y}-07-01`;

                    endStr =
                        `${y}-09-30`;

                } else if (
                    q === 4
                ) {

                    startStr =
                        `${y}-10-01`;

                    endStr =
                        `${y}-12-31`;
                }
            }


            if (
                mode !==
                'custom'
            ) {

                document
                    .getElementById(
                        'startDate'
                    )
                    .value =
                    startStr;


                document
                    .getElementById(
                        'endDate'
                    )
                    .value =
                    endStr;
            }


            window.AppState.startDateStr =
                document
                    .getElementById(
                        'startDate'
                    )
                    .value;


            window.AppState.endDateStr =
                document
                    .getElementById(
                        'endDate'
                    )
                    .value;


            this.renderActiveTab();

            saveAppState();
        },


    // ==========================================
    // RENDER ACTIVE TAB
    // ==========================================

    renderActiveTab:
        function() {

            if (
                !window.AppState
                    .rawCallData ||
                window.AppState
                    .rawCallData
                    .length === 0
            ) {

                return;
            }


            const start =
                document
                    .getElementById(
                        'startDate'
                    )
                    .value;


            const end =
                document
                    .getElementById(
                        'endDate'
                    )
                    .value;


            const search =
                document
                    .getElementById(
                        'searchRep'
                    )
                    ?.value ||
                '';


            const team =
                document
                    .getElementById(
                        'teamSelect'
                    )
                    ?.value ||
                'ALL';


            if (
                this.activeTab ===
                'matrix'
            ) {

                this.renderMatrixTab(
                    start,
                    end,
                    search,
                    team
                );

            } else if (
                this.activeTab ===
                'metrics'
            ) {

                window.AppUI
                    .renderMetricsTab(
                        start,
                        end,
                        search,
                        team
                    );

            } else if (
                this.activeTab ===
                'manual'
            ) {

                this.renderManualTab();
            }
        },


    // ==========================================
    // MATRIX
    // ==========================================

    renderMatrixTab:
        function(
            startDateStr,
            endDateStr,
            searchRep,
            selectedTeam
        ) {

            /*
                Keep the existing matrix implementation.
                This feature does not alter DTT calculations.
            */

            const thead =
                document.getElementById(
                    'tableHead'
                );

            const tbody =
                document.getElementById(
                    'tableBody'
                );

            const tfoot =
                document.getElementById(
                    'tableFoot'
                );


            if (
                !startDateStr ||
                !endDateStr
            ) {

                thead.innerHTML =
                    '';

                tfoot.innerHTML =
                    '';

                tbody.innerHTML =
                    `
                    <tr>
                        <td class="py-8 text-center text-rose-500 font-sans">
                            Error: Invalid Date Range.
                        </td>
                    </tr>
                    `;

                return;
            }


            const teamLabel =
                selectedTeam === 'ALL'
                    ? ''
                    : ` - Team: ${selectedTeam}`;


            document
                .getElementById(
                    'reportHeaderTitle'
                )
                .textContent =
                `DTT Performance Summary (${window.AppState.currentMode.toUpperCase()}${teamLabel})`;


            document
                .getElementById(
                    'reportSubtitle'
                )
                .textContent =
                `Range: ${startDateStr} to ${endDateStr} - Formula: (Duration/60) + 1 min`;


            let activeDates = [];

            let currStr =
                startDateStr;

            let loopGuard =
                0;


            while (
                currStr <=
                    endDateStr &&
                loopGuard < 1000
            ) {

                activeDates.push(
                    currStr
                );

                currStr =
                    addDaysToStringDate(
                        currStr,
                        1
                    );

                loopGuard++;
            }


            const aggregated = {};
            const repTotals = {};


            const processItem =
                item => {

                    if (

                        item.date >= startDateStr &&

                        item.date <= endDateStr &&

                        item.rep
                            .toLowerCase()
                            .includes(
                                searchRep.toLowerCase()
                            ) &&

                        isRepInTeam(
                            item.rep,
                            selectedTeam
                        )

                    ) {

                        if (
                            !aggregated[
                                item.rep
                            ]
                        ) {

                            aggregated[
                                item.rep
                            ] = {};
                        }


                        if (
                            !aggregated[
                                item.rep
                            ][item.date]
                        ) {

                            aggregated[
                                item.rep
                            ][item.date] =
                                0;
                        }


                        aggregated[
                            item.rep
                        ][item.date] +=
                            item.dtt;


                        repTotals[
                            item.rep
                        ] =
                            (
                                repTotals[
                                    item.rep
                                ] || 0
                            ) +
                            item.dtt;
                    }
                };


            window.AppState
                .rawCallData
                .forEach(
                    processItem
                );


            window.AppState
                .manualEntries
                .forEach(
                    processItem
                );


            const sortedReps =
                Object.keys(
                    aggregated
                ).sort();


            let headerHTML =
                `
                <tr>
                    <th class="py-3 px-4 text-left border-b border-gray-800 text-gray-300 sticky-col">
                        Rep Name
                    </th>
                `;


            activeDates.forEach(
                d => {

                    const parts =
                        d.split('-');


                    headerHTML +=
                        `
                        <th class="py-3 px-3 text-center border-b border-gray-800 min-w-[50px]">
                            ${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}
                        </th>
                        `;
                }
            );


            headerHTML +=
                `
                <th class="py-3 px-4 text-center border-b border-gray-800 bg-gray-900/90 text-gray-200">
                    Total
                </th>
                </tr>
                `;


            thead.innerHTML =
                headerHTML;


            let bodyHTML =
                '';


            const dateDailyTotals =
                {};


            activeDates.forEach(
                d =>
                    dateDailyTotals[d] =
                        0
            );


            let overallGrandTotal =
                0;


            sortedReps.forEach(
                rep => {

                    bodyHTML +=
                        `
                        <tr class="hover:bg-gray-800/30 transition">

                            <td class="py-2.5 px-4 font-sans font-medium text-gray-200 sticky-col">
                                ${rep}
                            </td>
                        `;


                    activeDates.forEach(
                        d => {

                            const val =
                                aggregated[
                                    rep
                                ][d] || 0;


                            dateDailyTotals[
                                d
                            ] += val;


                            const heatClass =
                                val < 50
                                    ? 'heat-red'
                                    : val < 70
                                        ? 'heat-yellow'
                                        : 'heat-green';


                            bodyHTML +=
                                `
                                <td class="py-2.5 px-3 text-center">
                                    <span class="px-2 py-0.5 rounded ${heatClass}">
                                        ${val.toFixed(1)}
                                    </span>
                                </td>
                                `;
                        }
                    );


                    const repTotal =
                        repTotals[
                            rep
                        ] || 0;


                    overallGrandTotal +=
                        repTotal;


                    bodyHTML +=
                        `
                            <td class="py-2.5 px-4 text-center bg-gray-900/50">
                                <span class="px-2 py-0.5 rounded font-bold heat-green">
                                    ${repTotal.toFixed(1)}
                                </span>
                            </td>

                        </tr>
                        `;
                }
            );


            tbody.innerHTML =
                bodyHTML ||
                `
                <tr>
                    <td
                        colspan="${activeDates.length + 2}"
                        class="py-8 text-center text-gray-500 font-sans"
                    >
                        No matching rep records found.
                    </td>
                </tr>
                `;


            let footHTML =
                `
                <tr>
                    <td
                        class="py-3 px-4 font-sans uppercase tracking-wider text-[11px] text-gray-400 sticky-col"
                    >
                        Total DTT
                    </td>
                `;


            activeDates.forEach(
                d => {

                    footHTML +=
                        `
                        <td class="py-3 px-3 text-center text-gray-300">
                            ${dateDailyTotals[d].toFixed(1)}
                        </td>
                        `;
                }
            );


            footHTML +=
                `
                    <td
                        class="py-3 px-4 text-center text-indigo-400 font-bold bg-gray-900"
                    >
                        ${overallGrandTotal.toFixed(1)}
                    </td>
                </tr>
                `;


            tfoot.innerHTML =
                footHTML;
        },


    // ==========================================
    // MANUAL TAB
    // ==========================================

    renderManualTab:
        function() {

            const tbody =
                document.getElementById(
                    'manualRecordsTableBody'
                );


            document
                .getElementById(
                    'manualTableCount'
                )
                .textContent =
                `Total Records: ${window.AppState.manualEntries.length}`;


            if (
                window.AppState
                    .manualEntries
                    .length === 0
            ) {

                tbody.innerHTML =
                    `
                    <tr>
                        <td colspan="5" class="py-8 text-center text-gray-500 font-sans">
                            No manual DTT records added yet.
                        </td>
                    </tr>
                    `;

                return;
            }


            let html =
                '';


            const sorted =
                [
                    ...window.AppState
                        .manualEntries
                ]
                    .sort(
                        (a, b) =>
                            b.date.localeCompare(
                                a.date
                            )
                    );


            sorted.forEach(
                entry => {

                    html +=
                        `
                        <tr class="hover:bg-gray-800/30 transition">

                            <td class="py-3 px-4 font-sans font-medium text-gray-200">
                                ${entry.rep}
                            </td>

                            <td class="py-3 px-4 text-gray-300">
                                ${entry.date}
                            </td>

                            <td class="py-3 px-4 text-center">
                                <span class="px-2.5 py-1 rounded font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                                    +${entry.dtt}m
                                </span>
                            </td>

                            <td class="py-3 px-4 text-center text-gray-500 text-[11px]">
                                ${entry.timestamp || '-'}
                            </td>

                            <td class="py-3 px-4 text-right">

                                <button
                                    onclick="app.removeManualEntry(${entry.id})"
                                    class="text-rose-400 hover:text-rose-300 font-sans text-xs bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>
                        `;
                }
            );


            tbody.innerHTML =
                html;
        }
};
