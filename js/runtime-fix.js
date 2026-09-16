// DTT runtime hardening: source-field integrity, stale-state invalidation, and readable notes.
(function () {
    const REQUIRED = ['id','createdAt','direction','to','state','originalNote','userFullName','prospectFullName','prospectCompany'];

    function hasFullSchema(state) {
        if (!state || !Array.isArray(state.rawCallData) || !state.rawCallData.length) return false;
        const sample = state.rawCallData.find(Boolean);
        return !!sample && REQUIRED.every(k => Object.prototype.hasOwnProperty.call(sample, k));
    }

    function formatStructuredNote(raw) {
        let text = String(raw ?? '').replace(/\r\n?/g, '\n');
        if (!text.trim()) return text;
        // If the CSV already contains real line breaks, preserve them. Otherwise make common note headings readable.
        text = text.replace(/\s+(?=(?:📞|☎️|✅|📌|🔜|📝|🎯|⚠️|•)?\s*(?:reason\s+of\s+call|key\s+points?\s*\/?\s*concerns?|actions?\s+taken|next\s+steps?|follow\s*up)\s*:)/giu, '\n\n');
        text = text.replace(/\s+(?=[•▪◦●◆■➜➤→]\s*)/gu, '\n');
        return text;
    }

    const originalProcessCSVData = window.processCSVData;
    if (typeof originalProcessCSVData === 'function') {
        window.processCSVData = function (rows) {
            originalProcessCSVData(rows);
            window.AppState.rawCallData.forEach(call => {
                call.rawOriginalNote = call.originalNote;
                call.originalNote = formatStructuredNote(call.originalNote);
            });
            saveAppState();
        };
    }

    if (window.app) {
        window.app.hasCompleteCallSchema = hasFullSchema;

        window.app.loadStateAndRender = async function () {
            try {
                const db = await openDB();
                const tx = db.transaction('app_state', 'readonly');
                const request = tx.objectStore('app_state').get('current_data');
                request.onsuccess = () => {
                    const saved = request.result;
                    if (!hasFullSchema(saved)) {
                        const manual = Array.isArray(saved?.manualEntries) ? saved.manualEntries : [];
                        const wipe = db.transaction('app_state', 'readwrite');
                        wipe.objectStore('app_state').delete('current_data');
                        window.AppState.rawCallData = [];
                        window.AppState.manualEntries = manual;
                        window.AppState.allKnownReps = new Set(manual.map(x => x.rep));
                        window.AppState.parsedDates = [];
                        const label = document.getElementById('fileNameDisplay');
                        if (label) {
                            label.textContent = 'Data schema updated — upload the CSV once to rebuild call details.';
                            label.classList.remove('hidden');
                        }
                        document.getElementById('manualBadgeCount').textContent = manual.length;
                        return;
                    }

                    window.AppState = saved;
                    window.AppState.allKnownReps = new Set(saved.allKnownReps || []);
                    window.AppState.rawCallData.forEach(call => {
                        if (!Object.prototype.hasOwnProperty.call(call, 'rawOriginalNote')) call.rawOriginalNote = call.originalNote;
                        call.originalNote = formatStructuredNote(call.rawOriginalNote || call.originalNote);
                    });
                    document.getElementById('manualBadgeCount').textContent = (window.AppState.manualEntries || []).length;
                    if (window.AppState.rawCallData.length) {
                        const label = document.getElementById('fileNameDisplay');
                        label.textContent = `File: ${window.AppState.fileName} (Restored)`;
                        label.classList.remove('hidden');
                        document.getElementById('appControls').classList.remove('hidden');
                        document.getElementById('matrixTableSection').classList.remove('hidden');
                        document.getElementById('teamSelect').value = window.AppState.selectedTeam || 'ALL';
                        this.setPresetPeriod(window.AppState.currentMode || 'weekly');
                    }
                };
            } catch (err) {
                console.warn('Saved-state validation failed.', err);
            }
        };
    }
})();
