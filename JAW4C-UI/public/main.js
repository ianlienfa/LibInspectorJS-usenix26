// Polyfill for requestIdleCallback
window.requestIdleCallback = window.requestIdleCallback || function(cb, options) {
    const start = Date.now();
    return setTimeout(() => {
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
        });
    }, 1);
};

window.cancelIdleCallback = window.cancelIdleCallback || function(id) {
    clearTimeout(id);
};

function toggleDetails(hash) {
    const details = document.getElementById(`details-${hash}`);
    const icon = document.getElementById(`icon-${hash}`);

    if (details.classList.contains('open')) {
        // Collapsing - clear DOM content to free memory
        details.classList.remove('open');
        icon.textContent = '+';

        // Clear file content from DOM
        const codeEl = document.getElementById(`code-${hash}`);
        const wrapperEl = document.getElementById(`wrapper-${hash}`);
        if (codeEl) {
            codeEl.textContent = ''; // Clear content
        }
        if (wrapperEl) {
            wrapperEl.style.display = 'none'; // Hide wrapper
        }

        // Clear current file indicator
        const currentFileEl = document.getElementById(`current-file-${hash}`);
        if (currentFileEl) {
            currentFileEl.textContent = '';
        }

        console.log(`[Memory] Cleared content for ${hash}`);
    } else {
        details.classList.add('open');
        icon.textContent = '-';
    }
}

function toggleJsFiles(hash) {
    const dropdown = document.getElementById(`js-files-${hash}`);
    const icon = document.getElementById(`js-icon-${hash}`);

    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        icon.textContent = '▼';
    } else {
        // Collapsing JS files dropdown - clear file content if displayed
        dropdown.style.display = 'none';
        icon.textContent = '▶';

        // Clear file content from DOM to save memory
        const codeEl = document.getElementById(`code-${hash}`);
        const wrapperEl = document.getElementById(`wrapper-${hash}`);
        if (codeEl) {
            codeEl.textContent = ''; // Clear content
        }
        if (wrapperEl) {
            wrapperEl.style.display = 'none'; // Hide wrapper
        }

        console.log(`[Memory] Cleared JS file content for ${hash}`);
    }
}

// Store current file data for toggling
const fileCache = {};

// POC flow review state
const flowEntriesCache = {};
const pocReviewInFlight = new Set();
const pocStatusCounts = {
    vulnerableFunc: { true: 0, false: 0 },
    pocMatch: { true: 0, false: 0 },
    dataflow: { true: 0, false: 0 },
    origin: { cdn: 0, bundle: 0 }
};
window.pocStatusCounts = pocStatusCounts;

// Chunked file loading for large files
async function loadFileChunked(hash, file) {
    const contentEl = document.getElementById(`content-${hash}`);
    const codeEl = document.getElementById(`code-${hash}`);
    const currentFileEl = document.getElementById(`current-file-${hash}`);

    try {
        // Show loading state
        codeEl.textContent = 'Loading large file...';

        // Update current file display
        currentFileEl.textContent = file;

        const response = await fetch(`/api/file-stream?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fileSize = parseInt(response.headers.get('X-File-Size') || '0', 10);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let receivedLength = 0;
        let chunks = [];
        let pendingText = '';

        // Setup for progressive rendering
        codeEl.textContent = '';

        // Batch DOM updates with requestAnimationFrame
        let updateScheduled = false;
        const scheduleUpdate = () => {
            if (!updateScheduled) {
                updateScheduled = true;
                requestAnimationFrame(() => {
                    if (pendingText) {
                        codeEl.textContent += pendingText;
                        pendingText = '';
                    }
                    updateScheduled = false;
                });
            }
        };

        // Read chunks
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            receivedLength += value.length;
            const chunk = decoder.decode(value, { stream: true });
            chunks.push(chunk);
            pendingText += chunk;

            // Update progress in loading text
            const progress = fileSize > 0 ? Math.round((receivedLength / fileSize) * 100) : 0;
            scheduleUpdate();

            // Log progress every 10%
            if (progress % 10 === 0) {
                console.log(`Loading ${file}: ${progress}%`);
            }
        }

        // Final flush
        if (pendingText) {
            codeEl.textContent += pendingText;
        }

        // Complete message
        const fullContent = chunks.join('');
        codeEl.textContent = fullContent;

        // Store in cache
        const cacheKey = `${hash}-${file}`;
        fileCache[cacheKey] = {
            formattedContent: fullContent,
            rawContent: fullContent,
            type: 'text',
            file: file,
            currentView: 'formatted',
            hasTableView: false
        };

        console.log(`Loaded ${file}: ${(receivedLength / 1024).toFixed(2)} KB`);

    } catch (error) {
        codeEl.textContent = `Error loading file: ${error.message || error}`;
        console.error('Chunked loading error:', error);
    }
}

async function loadFile(hash, file) {
    const contentEl = document.getElementById(`content-${hash}`);
    const codeEl = document.getElementById(`code-${hash}`);
    const wrapperEl = document.getElementById(`wrapper-${hash}`);
    const currentFileEl = document.getElementById(`current-file-${hash}`);
    const toggleBtn = document.getElementById(`toggle-${hash}`);
    const details = document.getElementById(`details-${hash}`);
    const icon = document.getElementById(`icon-${hash}`);

    // Check if clicking the same file while wrapper is visible - toggle it closed
    const isWrapperVisible = wrapperEl.style.display === 'block';
    const isSameFile = currentFileEl.textContent === file;

    if (isWrapperVisible && isSameFile) {
        // Hide the file content wrapper and clear content to free memory
        wrapperEl.style.display = 'none';
        codeEl.textContent = ''; // Clear content from DOM
        currentFileEl.textContent = '';
        console.log(`[Memory] Cleared content for ${file} in ${hash}`);
        return;
    }

    // Ensure details are open when loading a file
    if (!details.classList.contains('open')) {
        details.classList.add('open');
        icon.textContent = '-';
    }

    codeEl.textContent = 'Checking file size...';
    wrapperEl.style.display = 'block';

    try {
        // Check file size first
        const infoResponse = await fetch(`/api/file-info?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`);
        if (!infoResponse.ok) {
            throw new Error(`HTTP error! status: ${infoResponse.status}`);
        }
        const fileInfo = await infoResponse.json();

        // For large files, use chunked streaming
        if (fileInfo.shouldChunk) {
            console.log(`File ${file} is large (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB), using chunked loading`);
            await loadFileChunked(hash, file);
            toggleBtn.style.display = 'none';
            if (file === 'sink.flows.out') {
                await initFlowReviewUI(hash);
            } else {
                resetFlowReviewUI(hash);
            }
            return;
        }

        // For smaller files, use regular loading
        codeEl.textContent = 'Loading...';

        const response = await fetch(`/api/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Handle large file response
        if (data.type === 'large-file' && data.shouldStream) {
            console.log(`File ${file} requires streaming (${(data.size / 1024 / 1024).toFixed(2)} MB)`);
            await loadFileChunked(hash, file);
            toggleBtn.style.display = 'none';
            if (file === 'sink.flows.out') {
                await initFlowReviewUI(hash);
            } else {
                resetFlowReviewUI(hash);
            }
            return;
        }

        // Store in cache
        const cacheKey = `${hash}-${file}`;
        fileCache[cacheKey] = {
            formattedContent: data.content,
            rawContent: data.rawContent,
            type: data.type,
            file: file,
            currentView: 'formatted',
            hasTableView: data.hasTableView
        };

        // Update current file display
        currentFileEl.textContent = file;

        // Display content
        if (data.type === 'html' && data.hasTableView) {
            // For HTML table views, use innerHTML
            codeEl.innerHTML = data.content;
            if (file === 'vuln.out') {
                initVulnMismatchFilter(hash);
            }
        } else {
            // For code files, display as text
            codeEl.textContent = data.content;
        }

        // Show/hide toggle button
        if (data.hasTableView) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = 'Switch to Raw View';
        } else {
            toggleBtn.style.display = 'none';
        }

        if (file === 'sink.flows.out') {
            await initFlowReviewUI(hash);
        } else {
            resetFlowReviewUI(hash);
        }
    } catch (error) {
        codeEl.textContent = `Error loading file: ${error.message || error}`;
        toggleBtn.style.display = 'none';
    }
}

function resetFlowReviewUI(hash) {
    const container = document.getElementById(`file-container-${hash}`);
    const sidebar = document.getElementById(`flow-sidebar-${hash}`);
    if (!container || !sidebar) return;
    container.classList.remove('flow-split');
    sidebar.style.display = 'none';
    sidebar.innerHTML = '';
    delete flowEntriesCache[hash];
}

async function initVulnMismatchFilter(hash) {
    const contentEl = document.getElementById(`content-${hash}`);
    if (!contentEl) return;
    const toggle = contentEl.querySelector('.vuln-mismatch-toggle');
    if (!toggle || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    const globalMismatchFilter = document.getElementById('filter-vuln-poc-mismatch');
    if (globalMismatchFilter?.checked) {
        toggle.checked = true;
    }

    let mismatchSet = null;
    const loadMismatchSet = async () => {
        if (mismatchSet) return mismatchSet;
        try {
            const response = await fetch(`/api/vuln-poc-location-mismatch?hash=${encodeURIComponent(hash)}`);
            if (!response.ok) return new Set();
            const data = await response.json();
            const mismatches = data?.site?.mismatches || [];
            mismatchSet = new Set(
                mismatches.map(m => `${String(m.libname || '').toLowerCase()}|${String(m.location || '').toLowerCase()}`)
            );
        } catch (e) {
            mismatchSet = new Set();
        }
        return mismatchSet;
    };

    const applyFilter = async () => {
        const blocks = contentEl.querySelectorAll('.vuln-lib-block');
        if (!toggle.checked) {
            blocks.forEach(block => { block.style.display = ''; });
            return;
        }
        const set = await loadMismatchSet();
        blocks.forEach(block => {
            const lib = String(block.dataset.libname || '').toLowerCase();
            const loc = String(block.dataset.location || '').toLowerCase();
            const key = `${lib}|${loc}`;
            block.style.display = set.has(key) ? '' : 'none';
        });
    };

    toggle.addEventListener('change', applyFilter);
    applyFilter();
}

function scrollToFlowLine(hash, line) {
    const contentEl = document.getElementById(`content-${hash}`);
    const codeEl = document.getElementById(`code-${hash}`);
    if (!contentEl || !codeEl) return;
    const lineNumberSpan = contentEl.querySelector(`.line-numbers-rows > span:nth-child(${line})`);
    if (lineNumberSpan) {
        contentEl.scrollTop = Math.max(0, lineNumberSpan.offsetTop);
        contentEl.scrollLeft = 0;
        return;
    }
    const style = getComputedStyle(codeEl);
    let lineHeight = parseFloat(style.lineHeight);
    if (!lineHeight || Number.isNaN(lineHeight)) {
        const fontSize = parseFloat(style.fontSize) || 11;
        lineHeight = fontSize * 1.4;
    }
    contentEl.scrollTop = Math.max(0, (line - 1) * lineHeight);
    contentEl.scrollLeft = 0;
}

function scrollToFlowEntry(hash, headerHash, fallbackLine) {
    const contentEl = document.getElementById(`content-${hash}`);
    const codeEl = document.getElementById(`code-${hash}`);
    if (!contentEl || !codeEl) return;
    const cache = flowEntriesCache[hash];
    const entry = cache?.entries?.find(item => item.headerHash === headerHash);
    const headerText = entry?.headerText;
    let targetLine = fallbackLine;

    if (headerText) {
        const contentText = codeEl.textContent || '';
        const idx = contentText.indexOf(headerText);
        if (idx >= 0) {
            targetLine = contentText.slice(0, idx).split('\n').length;
        }
    }

    requestAnimationFrame(() => {
        scrollToFlowLine(hash, targetLine);
    });
}

function applyStatusButtonState(button, state) {
    button.dataset.state = state;
    button.classList.remove('state-none', 'state-true', 'state-false', 'state-origin', 'state-cdn', 'state-bundle');
    button.classList.add(`state-${state}`);
    if (button.dataset.key === 'origin') {
        const label = state === 'cdn' ? 'CDN' : state === 'bundle' ? 'Bundle' : 'Origin';
        button.textContent = label;
    }
}

function cycleStatusState(state) {
    if (state === 'none') return 'true';
    if (state === 'true') return 'false';
    return 'none';
}

function cycleOriginState(state) {
    if (state === 'origin') return 'cdn';
    if (state === 'cdn') return 'bundle';
    return 'origin';
}

function recomputePocStatusCounts(entries) {
    pocStatusCounts.vulnerableFunc.true = 0;
    pocStatusCounts.vulnerableFunc.false = 0;
    pocStatusCounts.pocMatch.true = 0;
    pocStatusCounts.pocMatch.false = 0;
    pocStatusCounts.dataflow.true = 0;
    pocStatusCounts.dataflow.false = 0;
    pocStatusCounts.origin.cdn = 0;
    pocStatusCounts.origin.bundle = 0;

    entries.forEach(entry => {
        const status = entry.status || {};
        ['vulnerableFunc', 'pocMatch', 'dataflow'].forEach(key => {
            if (status[key] === 'true') {
                pocStatusCounts[key].true += 1;
            } else if (status[key] === 'false') {
                pocStatusCounts[key].false += 1;
            }
        });
        if (status.origin === 'cdn') {
            pocStatusCounts.origin.cdn += 1;
        } else if (status.origin === 'bundle') {
            pocStatusCounts.origin.bundle += 1;
        }
    });
    updateGlobalPocStatusSummary();
}

async function initFlowReviewUI(hash) {
    const container = document.getElementById(`file-container-${hash}`);
    const sidebar = document.getElementById(`flow-sidebar-${hash}`);
    if (!container || !sidebar) return;

    container.classList.add('flow-split');
    sidebar.style.display = 'block';
    sidebar.innerHTML = '<div class="flow-sidebar-loading">Loading POC matches...</div>';

    try {
        const response = await fetch(`/api/flow-entries?hash=${encodeURIComponent(hash)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const entries = data.entries || [];
        const uniqueTags = Array.from(new Set(entries.flatMap(entry => entry.tags || []))).sort();
        flowEntriesCache[hash] = { entries, selectedTags: new Set(), uniqueTags };
        recomputePocStatusCounts(entries);

        if (entries.length === 0) {
            sidebar.innerHTML = '<div class="flow-sidebar-empty">No POC matches found.</div>';
            return;
        }

        renderFlowSidebar(hash);
        bindFlowSidebarHandlers(hash);
    } catch (error) {
        sidebar.innerHTML = `<div class="flow-sidebar-empty">Failed to load POC matches.</div>`;
        console.error('Flow entries load error:', error);
    }
}

function bindFlowSidebarHandlers(hash) {
    const sidebar = document.getElementById(`flow-sidebar-${hash}`);
    const cache = flowEntriesCache[hash];
    if (!sidebar || !cache) return;
    if (sidebar.dataset.bound === 'true') return;
    sidebar.dataset.bound = 'true';

    sidebar.addEventListener('click', async (event) => {
        const clearBtn = event.target.closest('.flow-filter-clear');
        if (clearBtn) {
            cache.selectedTags.clear();
            renderFlowSidebar(hash);
            return;
        }

        const titleBtn = event.target.closest('.flow-entry-title');
        if (titleBtn) {
            const entryEl = titleBtn.closest('.flow-entry');
            const headerHash = entryEl?.dataset.headerHash;
            const entry = cache.entries.find(item => item.headerHash === headerHash);
            if (entry) {
                scrollToFlowEntry(hash, entry.headerHash, entry.line);
            }
            return;
        }

        const statusBtn = event.target.closest('.flow-toggle');
        if (statusBtn) {
            const entryEl = statusBtn.closest('.flow-entry');
            const headerHash = entryEl?.dataset.headerHash;
            const entry = cache.entries.find(item => item.headerHash === headerHash);
            if (!entry) return;

            const key = statusBtn.dataset.key;
            const nextState = key === 'origin'
                ? cycleOriginState(statusBtn.dataset.state || 'origin')
                : cycleStatusState(statusBtn.dataset.state || 'none');
            applyStatusButtonState(statusBtn, nextState);
            entry.status = entry.status || {};
            entry.status[key] = nextState;
            recomputePocStatusCounts(cache.entries);
            await updatePocReview(hash, entry, { statusKey: key, statusValue: nextState });
        }
    });

    sidebar.addEventListener('change', (event) => {
        const input = event.target;
        if (!input || !input.matches('.flow-filter-tag input')) return;
        if (input.checked) {
            cache.selectedTags.add(input.value);
        } else {
            cache.selectedTags.delete(input.value);
        }
        renderFlowSidebar(hash);
    });

    sidebar.addEventListener('focusin', (event) => {
        const noteEl = event.target;
        if (!noteEl || !noteEl.classList.contains('flow-note')) return;
        noteEl.dataset.lastValue = noteEl.value;
    });

    sidebar.addEventListener('focusout', async (event) => {
        const noteEl = event.target;
        if (!noteEl || !noteEl.classList.contains('flow-note')) return;
        const noteValue = noteEl.value;
        const lastValue = noteEl.dataset.lastValue || '';
        if (noteValue === lastValue) {
            return;
        }
        noteEl.dataset.lastValue = noteValue;
        const entryEl = noteEl.closest('.flow-entry');
        const headerHash = entryEl?.dataset.headerHash;
        const entry = cache.entries.find(item => item.headerHash === headerHash);
        if (!entry) return;
        entry.note = noteValue;
        await updatePocReview(hash, entry, { note: noteValue });
    });
}

function renderFlowSidebar(hash) {
    const sidebar = document.getElementById(`flow-sidebar-${hash}`);
    const cache = flowEntriesCache[hash];
    if (!sidebar || !cache) return;

    const { entries, selectedTags, uniqueTags } = cache;
    const activeTags = new Set(selectedTags);
    const filtered = activeTags.size === 0
        ? entries
        : entries.filter(entry => entry.tags && entry.tags.some(tag => activeTags.has(tag)));

    const filterHTML = `
        <div class="flow-filter">
            <div class="flow-filter-header">
                <span>Filter by tag</span>
                <button type="button" class="flow-filter-clear">Clear</button>
            </div>
            <div class="flow-filter-tags">
                ${uniqueTags.map(tag => `
                    <label class="flow-filter-tag">
                        <input type="checkbox" value="${escapeHtml(tag)}" ${activeTags.has(tag) ? 'checked' : ''}>
                        <span>${escapeHtml(tag)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    const entriesHTML = filtered.length === 0
        ? '<div class="flow-sidebar-empty">No entries match the selected tags.</div>'
        : filtered.map(entry => `
            <div class="flow-entry" data-header-hash="${entry.headerHash}">
                <button class="flow-entry-title" type="button" data-header-hash="${entry.headerHash}" data-line="${entry.line}">
                    ${escapeHtml(entry.title)}
                </button>
                <div class="flow-entry-meta">
                    <span>Line ${entry.line}</span>
                    ${entry.location ? `<span>Loc ${escapeHtml(entry.location)}</span>` : ''}
                    ${entry.tags && entry.tags.length ? `<span>${escapeHtml(entry.tags.join(', '))}</span>` : ''}
                </div>
                <div class="flow-entry-actions">
                    <button class="flow-toggle state-none" data-key="vulnerableFunc" type="button">Vulnerable func</button>
                    <button class="flow-toggle state-none" data-key="pocMatch" type="button">POC match</button>
                    <button class="flow-toggle state-none" data-key="dataflow" type="button">Dataflow</button>
                    <button class="flow-toggle state-origin" data-key="origin" type="button">Origin</button>
                </div>
                <textarea class="flow-note" placeholder="Add note...">${escapeHtml(entry.note || '')}</textarea>
            </div>
        `).join('');

    sidebar.innerHTML = filterHTML + entriesHTML;

    filtered.forEach(entry => {
        const entryEl = sidebar.querySelector(`.flow-entry[data-header-hash="${entry.headerHash}"]`);
        if (!entryEl) return;

            const status = entry.status || {};
            entryEl.querySelectorAll('.flow-toggle').forEach(button => {
                const key = button.dataset.key;
                const state = key === 'origin' ? (status.origin || 'origin') : (status[key] || 'none');
                applyStatusButtonState(button, state);
            });
        });
}

async function updatePocReview(hash, entry, updates) {
    const statusKey = updates.statusKey || '';
    const statusValue = updates.statusValue || '';
    const noteValue = updates.note !== undefined ? String(updates.note) : '';
    const dedupeKey = `${hash}|${entry.headerHash}|${statusKey}|${statusValue}|${noteValue}`;
    if (pocReviewInFlight.has(dedupeKey)) {
        return;
    }
    pocReviewInFlight.add(dedupeKey);
    try {
        const payload = {
            hash,
            headerHash: entry.headerHash,
            headerText: entry.headerText,
            ...updates
        };
        const response = await fetch('/api/update-poc-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.memo !== undefined) {
            const memoEl = document.getElementById(`memo-${hash}`);
            if (memoEl) {
                memoEl.value = result.memo;
                const siteItem = memoEl.closest('.site-item');
                if (siteItem) {
                    siteItem.dataset.hasNotes = result.memo && result.memo.trim() ? 'true' : 'false';
                }
            }
        }
    } catch (error) {
        console.error('Error updating POC review:', error);
    } finally {
        pocReviewInFlight.delete(dedupeKey);
    }
}

function formatRateLine(trueCount, falseCount) {
    const total = trueCount + falseCount;
    if (total === 0) {
        return 'TP: 0 (0%) | FP: 0 (0%)';
    }
    const tpRate = Math.round((trueCount / total) * 100);
    const fpRate = Math.round((falseCount / total) * 100);
    return `TP: ${trueCount} (${tpRate}%) | FP: ${falseCount} (${fpRate}%)`;
}

function updateGlobalPocStatusSummary() {
    const mappings = [
        { key: 'vulnerableFunc', id: 'poc-status-vuln-func' },
        { key: 'pocMatch', id: 'poc-status-poc-match' },
        { key: 'dataflow', id: 'poc-status-dataflow' }
    ];

    mappings.forEach(({ key, id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const counts = pocStatusCounts[key];
        el.textContent = formatRateLine(counts.true, counts.false);
    });

    const originEl = document.getElementById('poc-status-origin');
    if (originEl) {
        const cdn = pocStatusCounts.origin.cdn;
        const bundle = pocStatusCounts.origin.bundle;
        const total = cdn + bundle;
        const cdnRate = total ? Math.round((cdn / total) * 100) : 0;
        const bundleRate = total ? Math.round((bundle / total) * 100) : 0;
        originEl.textContent = `cdn: ${cdn} (${cdnRate}%) | bundle: ${bundle} (${bundleRate}%)`;
    }
}

async function toggleView(hash) {
    const contentEl = document.getElementById(`content-${hash}`);
    const codeEl = document.getElementById(`code-${hash}`);
    const currentFileEl = document.getElementById(`current-file-${hash}`);
    const toggleBtn = document.getElementById(`toggle-${hash}`);

    const file = currentFileEl.textContent;
    const cacheKey = `${hash}-${file}`;
    const cached = fileCache[cacheKey];

    if (!cached) return;

    if (cached.currentView === 'formatted') {
        // Switch to raw view - request raw content from server
        try {
            const response = await fetch(`/api/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}&view=raw`);
            const data = await response.json();

            // For raw view, display as text
            codeEl.textContent = data.content;

            toggleBtn.textContent = 'Switch to Table View';
            cached.currentView = 'raw';
        } catch (error) {
            codeEl.textContent = `Error loading raw view: ${error.message}`;
        }
    } else {
        // Switch back to formatted view
        if (cached.type === 'html') {
            codeEl.innerHTML = cached.formattedContent;
        } else {
            codeEl.textContent = cached.formattedContent;
        }
        toggleBtn.textContent = 'Switch to Raw View';
        cached.currentView = 'formatted';
    }
}

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply file content search results (no longer needed - using server-side filtering)
function applyFileContentFilter() {
    // This function is deprecated - file content search now works like URL/Hash search
    // with server-side filtering and proper pagination
}

// Update visible count (used after loading)
function updateVisibleCount() {
    const siteItems = document.querySelectorAll('.site-item:not(.hidden)');
    document.getElementById('visible-count').textContent = siteItems.length;
}

// Search mode handling
let currentSearchMode = 'url';
let fileContentSearchResults = new Set(); // Store hashes that match file content search
let searchSpinnerActive = false;

function setSearchButtonLoading(isLoading, labelText) {
    const searchBtn = document.getElementById('search-btn');
    if (!searchBtn) return;
    const labelEl = searchBtn.querySelector('.btn-label');
    const defaultLabel = labelEl ? labelEl.textContent : searchBtn.textContent;
    if (!searchBtn.dataset.defaultLabel) {
        searchBtn.dataset.defaultLabel = defaultLabel;
    }
    searchBtn.classList.toggle('is-loading', isLoading);
    searchBtn.disabled = isLoading;
    if (labelEl) {
        labelEl.textContent = isLoading ? (labelText || 'Searching...') : searchBtn.dataset.defaultLabel;
    } else {
        searchBtn.textContent = isLoading ? (labelText || 'Searching...') : searchBtn.dataset.defaultLabel;
    }
}

function switchSearchMode() {
    const mode = document.querySelector('input[name="search-mode"]:checked').value;
    currentSearchMode = mode;

    const searchInput = document.getElementById('search-input');
    const searchOptions = document.getElementById('search-options');

    if (mode === 'content') {
        // Switch to file content search mode
        searchInput.placeholder = 'Enter regex pattern to search in files...';
        searchOptions.style.display = 'flex';
    } else {
        // Switch to URL/hash search mode
        searchInput.placeholder = 'Search by URL or hash...';
        searchOptions.style.display = 'none';

        // Clear file content search results
        fileContentSearchResults.clear();
    }
}

// Handle Enter key in search input
function handleSearchKeydown(event) {
    if (event.key === 'Enter') {
        executeSearch();
    }
}

// Execute search based on current mode
function executeSearch() {
    if (currentSearchMode === 'content') {
        executeFileContentSearch();
    } else {
        // URL/Hash search - update query and reload from page 1
        const searchInput = document.getElementById('search-input');
        currentSearchQuery = searchInput.value.trim();
        searchSpinnerActive = true;
        setSearchButtonLoading(true);
        loadPage(1);
    }
}

async function executeFileContentSearch() {
    const pattern = document.getElementById('search-input').value.trim();
    const filePattern = document.getElementById('file-pattern').value.trim();
    const isRegex = document.getElementById('regex-mode').checked;
    const caseSensitive = document.getElementById('case-sensitive').checked;

    if (!pattern) {
        alert('Please enter a search pattern');
        return;
    }

    // Show loading indicator
    setSearchButtonLoading(true);

    try {
        const response = await fetch('/api/search-file-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pattern,
                filePattern,
                isRegex,
                caseSensitive
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Store matching hashes
        fileContentSearchResults = new Set(data.matches.map(m => m.hash));

        // Reload from page 1 with matching results (same as URL/Hash search)
        loadPage(1);

    } catch (error) {
        console.error('File content search error:', error);
        alert('Error performing file content search: ' + error.message);
    } finally {
        setSearchButtonLoading(false);
    }
}

function clearSelections() {
    document.getElementById('filter-flows').checked = false;
    document.getElementById('filter-lib-detection').checked = false;
    document.getElementById('filter-sink-flows').checked = false;
    document.getElementById('filter-vuln-out').checked = false;
    document.getElementById('filter-error-log').checked = false;
    document.getElementById('filter-warning-log').checked = false;
    document.getElementById('filter-reviewed').checked = false;
    document.getElementById('filter-unreviewed').checked = false;
    document.getElementById('filter-vulnerable').checked = false;
    document.getElementById('filter-has-notes').checked = false;
    document.getElementById('filter-vuln-poc-mismatch').checked = false;
    document.getElementById('search-input').value = '';
    document.getElementById('time-start').value = '';
    document.getElementById('time-end').value = '';
    const hashStartEl = document.getElementById('hash-start');
    const hashEndEl = document.getElementById('hash-end');
    if (hashStartEl) hashStartEl.value = '';
    if (hashEndEl) hashEndEl.value = '';
    const rangeError = document.getElementById('hash-range-error');
    if (rangeError) {
        rangeError.style.display = 'none';
        rangeError.textContent = '';
    }
    currentSearchQuery = '';
    fileContentSearchResults.clear();

    // Reset to URL search mode
    currentSearchMode = 'url';
    const urlRadio = document.querySelector('input[name="search-mode"][value="url"]');
    if (urlRadio) urlRadio.checked = true;
    switchSearchMode(); // Update UI to reflect URL mode

    loadPage(1); // Reload from page 1 with no selections
}

// Time-based selection functions
function applyTimeSelection() {
    loadPage(1); // Reload from page 1 with time selection applied
}

function clearTimeSelection() {
    document.getElementById('time-start').value = '';
    document.getElementById('time-end').value = '';
    loadPage(1); // Reload without time filter
}

function formatForDatetimeLocal(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + 'T' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
}

function swapTimeRange() {
    const startEl = document.getElementById('time-start');
    const endEl = document.getElementById('time-end');
    if (!startEl || !endEl) {
        return;
    }
    const tmp = startEl.value;
    startEl.value = endEl.value;
    endEl.value = tmp;
    loadPage(1);
}

// Set time from clicking a site's timestamp
function setTimeEnd(timestamp) {
    document.getElementById('time-end').value = formatForDatetimeLocal(timestamp);
}

function switchRangeMode(mode) {
    const timePanel = document.getElementById('time-range-panel');
    const hashPanel = document.getElementById('hash-range-panel');
    const timeBtn = document.getElementById('range-time-btn');
    const hashBtn = document.getElementById('range-hash-btn');
    const rangeError = document.getElementById('hash-range-error');
    if (!timePanel || !hashPanel || !timeBtn || !hashBtn) {
        return;
    }
    const isTime = mode === 'time';
    currentRangeMode = isTime ? 'time' : 'hash';
    timePanel.classList.toggle('hidden', !isTime);
    hashPanel.classList.toggle('hidden', isTime);
    timeBtn.classList.toggle('active', isTime);
    hashBtn.classList.toggle('active', !isTime);
    if (rangeError) {
        rangeError.style.display = 'none';
        rangeError.textContent = '';
    }
}

function applyHashRange() {
    const startInput = document.getElementById('hash-start');
    const endInput = document.getElementById('hash-end');
    const rangeError = document.getElementById('hash-range-error');
    if (!startInput || !endInput) {
        return;
    }

    const startHash = startInput.value.trim();
    const endHash = endInput.value.trim();
    if (!startHash || !endHash) {
        if (rangeError) {
            rangeError.textContent = 'Please enter both start and end hashes.';
            rangeError.style.display = 'block';
        }
        return;
    }

    if (rangeError) {
        rangeError.style.display = 'none';
        rangeError.textContent = '';
    }
    loadPage(1);
}

function clearHashRange() {
    const startInput = document.getElementById('hash-start');
    const endInput = document.getElementById('hash-end');
    const rangeError = document.getElementById('hash-range-error');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (rangeError) {
        rangeError.style.display = 'none';
        rangeError.textContent = '';
    }
    loadPage(1);
}

// View mode switching
let currentView = 'normal';
let currentRangeMode = 'time';

function updateNotesVisibility(view) {
    const noteElements = document.querySelectorAll('.site-note-inline');
    noteElements.forEach(note => {
        note.style.display = view === 'notes' ? 'block' : 'none';
    });
}

function switchView(view) {
    currentView = view;

    // Update button states
    document.getElementById('view-normal-btn').classList.toggle('active', view === 'normal');
    document.getElementById('view-notes-btn').classList.toggle('active', view === 'notes');

    // Toggle inline notes visibility
    updateNotesVisibility(view);

    // In notes view, auto-enable the "Has Notes" filter and reload
    if (view === 'notes') {
        document.getElementById('filter-has-notes').checked = true;
        reloadWithFilters();
    } else if (document.getElementById('filter-has-notes').checked) {
        // When switching back to normal, turn off the filter
        document.getElementById('filter-has-notes').checked = false;
        reloadWithFilters();
    }
}

function applySorting() {
    const sortValue = document.getElementById('sort-select').value;
    const siteList = document.querySelector('.site-list');
    const siteItems = Array.from(document.querySelectorAll('.site-item'));

    siteItems.sort((a, b) => {
        switch(sortValue) {
            // Modified Time
            case 'modified-desc':
                return parseInt(b.dataset.modifiedTime) - parseInt(a.dataset.modifiedTime);
            case 'modified-asc':
                return parseInt(a.dataset.modifiedTime) - parseInt(b.dataset.modifiedTime);

            // Name
            case 'name-asc':
                return a.dataset.name.localeCompare(b.dataset.name);
            case 'name-desc':
                return b.dataset.name.localeCompare(a.dataset.name);

            // Flows
            case 'flows-desc':
                return parseInt(b.dataset.flows) - parseInt(a.dataset.flows);
            case 'flows-asc':
                return parseInt(a.dataset.flows) - parseInt(b.dataset.flows);

            // Vulnerable Libraries
            case 'vulns-desc':
                return parseInt(b.dataset.vulns) - parseInt(a.dataset.vulns);
            case 'vulns-asc':
                return parseInt(a.dataset.vulns) - parseInt(b.dataset.vulns);

            // POC Matches
            case 'pocs-desc':
                return parseInt(b.dataset.pocs) - parseInt(a.dataset.pocs);
            case 'pocs-asc':
                return parseInt(a.dataset.pocs) - parseInt(b.dataset.pocs);

            // JS File Count
            case 'js-count-desc':
                return parseInt(b.dataset.jsCount) - parseInt(a.dataset.jsCount);
            case 'js-count-asc':
                return parseInt(a.dataset.jsCount) - parseInt(b.dataset.jsCount);

            default:
                return 0; // Keep original order
        }
    });

    // Re-append sorted items
    siteItems.forEach(item => siteList.appendChild(item));
}

// Review functions
async function updateReview(hash, field, value) {
    try {
        const response = await fetch('/api/update-review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hash, field, value }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            // Update the data attribute for filtering
            const siteItem = document.querySelector(`[data-search-text*="${hash.toLowerCase()}"]`);
            if (siteItem) {
                siteItem.dataset[field] = value;
                // Update hasNotes attribute when memo field changes
                if (field === 'memo') {
                    siteItem.dataset.hasNotes = value && value.trim() ? 'true' : 'false';
                }
            }
        } else {
            console.error('Failed to update review');
        }
    } catch (error) {
        console.error('Error updating review:', error);
        alert('Failed to update review. Please try again.');
    }
}

// NOTE: DOMContentLoaded listener moved to bottom of file (dynamic loading section)
// This duplicate was removed to prevent timing issues with dynamic site loading

// Filter sites with flows when clicking the stat card
function filterSitesWithFlows() {
    const filterFlowsCheckbox = document.getElementById('filter-flows');
    filterFlowsCheckbox.checked = true;
    reloadWithFilters();

    // Smooth scroll to the filter section
    const filterSection = document.querySelector('.filter-section');
    filterSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Library Detection Modal Functions
let libDetectionCharts = {};

async function openLibDetectionModal() {
    const modal = document.getElementById('lib-detection-modal');
    modal.classList.add('show');

    // Show loading state
    document.getElementById('total-detected-libs').textContent = '...';
    document.getElementById('unique-detected-libs').textContent = '...';
    document.getElementById('sites-with-detections').textContent = '...';
    document.getElementById('avg-libs-per-site').textContent = '...';
    document.getElementById('total-tags').textContent = '...';
    document.getElementById('unique-tags').textContent = '...';
    document.getElementById('sites-with-tags').textContent = '...';
    document.getElementById('avg-tags-per-site').textContent = '...';

    try {
        const response = await fetch('/api/lib-detection-stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();

        // Update stats boxes
        document.getElementById('total-detected-libs').textContent = stats.totalDetectedLibs;
        document.getElementById('unique-detected-libs').textContent = stats.uniqueLibs;
        document.getElementById('sites-with-detections').textContent = stats.sitesWithDetections;
        document.getElementById('avg-libs-per-site').textContent = stats.avgLibsPerSite;

        // Destroy existing charts
        Object.values(libDetectionCharts).forEach(chart => {
            if (chart) chart.destroy();
        });
        libDetectionCharts = {};

        // Create charts
        createTopDetectedLibsChart(stats.topLibs);
        createDetectionMethodChart(stats.detectionMethods);
        createDetectedVersionsChart(stats.versions);
        createAccuracyChart(stats.accuracyStats);
        createLibUsageByRankingChart(stats.libUsageByRanking || []);

        // Fetch and display tag statistics
        const tagResponse = await fetch('/api/tag-stats');
        if (tagResponse.ok) {
            const tagStats = await tagResponse.json();

            // Update tag stats boxes
            document.getElementById('total-tags').textContent = tagStats.totalTags;
            document.getElementById('unique-tags').textContent = tagStats.uniqueTags;
            document.getElementById('sites-with-tags').textContent = tagStats.sitesWithTags;
            document.getElementById('avg-tags-per-site').textContent = tagStats.avgTagsPerSite;

            // Create tag distribution chart
            createTagDistributionChart(tagStats.topTags);
        }

    } catch (error) {
        console.error('Error loading library detection stats:', error);
        alert('Failed to load library detection statistics. Please try again.');
    }
}

function closeLibDetectionModal() {
    const modal = document.getElementById('lib-detection-modal');
    modal.classList.remove('show');
}

function createTopDetectedLibsChart(topLibs) {
    const ctx = document.getElementById('top-detected-libs-chart').getContext('2d');

    libDetectionCharts.topLibs = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topLibs.map(lib => lib.name),
            datasets: [{
                label: 'Occurrences',
                data: topLibs.map(lib => lib.count),
                backgroundColor: 'rgba(6, 182, 212, 0.7)',
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createDetectionMethodChart(detectionMethods) {
    const ctx = document.getElementById('detection-method-chart').getContext('2d');

    const sortedMethods = Object.entries(detectionMethods).sort((a, b) => b[1] - a[1]);
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#9333ea',
        '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'
    ];

    libDetectionCharts.methods = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedMethods.map(([method]) => method),
            datasets: [{
                data: sortedMethods.map(([, count]) => count),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createDetectedVersionsChart(versions) {
    const ctx = document.getElementById('detected-versions-chart').getContext('2d');

    libDetectionCharts.versions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: versions.map(v => v.name),
            datasets: [{
                label: 'Occurrences',
                data: versions.map(v => v.count),
                backgroundColor: 'rgba(147, 51, 234, 0.7)',
                borderColor: 'rgba(147, 51, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createAccuracyChart(accuracyStats) {
    const ctx = document.getElementById('accuracy-chart').getContext('2d');

    libDetectionCharts.accuracy = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Accurate', 'Inaccurate'],
            datasets: [{
                data: [accuracyStats.accurate, accuracyStats.inaccurate],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createLibUsageByRankingChart(buckets) {
    const ctx = document.getElementById('lib-usage-ranking-chart').getContext('2d');
    const labels = buckets.map(b => b.bucket);
    const values = buckets.map(b => b.avgLibsPerSite ?? 0);

    libDetectionCharts.libUsageByRanking = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Avg Libraries per Site',
                data: values,
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const bucket = buckets[index];
                            if (!bucket) return '';
                            let result = `\nSites: ${bucket.siteCount ?? 0}`;
                            result += `\nTotal libs: ${bucket.totalLibs ?? 0}`;
                            result += `\nAvg libs/site: ${(bucket.avgLibsPerSite ?? 0).toFixed(2)}`;
                            return result;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Avg Libraries per Site'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Site Ranking Bucket'
                    }
                }
            }
        }
    });
}

function createTagDistributionChart(topTags) {
    const ctx = document.getElementById('tag-distribution-chart').getContext('2d');

    libDetectionCharts.tagDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topTags.map(tag => tag.name),
            datasets: [{
                label: 'Occurrences',
                data: topTags.map(tag => tag.count),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Vulnerable Libraries Modal Functions
let vulnCharts = {};

async function openVulnLibModal() {
    const modal = document.getElementById('vuln-lib-modal');
    modal.classList.add('show');

    // Show loading state
    document.getElementById('total-vuln-libs').textContent = '...';
    document.getElementById('unique-libs').textContent = '...';
    document.getElementById('sites-with-vulns').textContent = '...';
    document.getElementById('avg-vulns-per-site').textContent = '...';

    try {
        const vulnResponse = await fetch('/api/vuln-stats');
        if (!vulnResponse.ok) {
            throw new Error('HTTP error while fetching stats');
        }

        const stats = await vulnResponse.json();

        // Update stats boxes
        document.getElementById('total-vuln-libs').textContent = stats.totalVulnLibs;
        document.getElementById('unique-libs').textContent = stats.uniqueLibs;
        document.getElementById('sites-with-vulns').textContent = stats.sitesWithVulns;
        document.getElementById('avg-vulns-per-site').textContent = stats.avgVulnsPerSite;

        // Destroy existing charts
        Object.values(vulnCharts).forEach(chart => {
            if (chart) chart.destroy();
        });
        vulnCharts = {};

        // Create charts
        createTopLibsChart(stats.topLibs);
        createVulnTypesChart(stats.vulnTypes);
        createVersionsChart(stats.versions);
    } catch (error) {
        console.error('Error loading vulnerability stats:', error);
        alert('Failed to load vulnerability statistics. Please try again.');
    }
}

function closeVulnLibModal() {
    const modal = document.getElementById('vuln-lib-modal');
    modal.classList.remove('show');
}

// POC Matches Modal Functions
let pocMatchesCharts = {};
let pocRankingBuckets = [];
let selectedPocBucket = null;
let activePocSourceTab = 'urls';
let pocSourcePanelInitialized = false;
let pocStatsMode = 'all';
let pocModeToggleInitialized = false;

async function openPocMatchesModal() {
    const modal = document.getElementById('poc-matches-modal');
    modal.classList.add('show');

    initPocModeToggle();

    // Show loading state
    document.getElementById('total-poc-matches').textContent = '...';
    document.getElementById('sites-with-poc-matches').textContent = '...';
    document.getElementById('unique-poc-functions').textContent = '...';
    document.getElementById('ranked-sites-with-pocs').textContent = '...';
    document.getElementById('total-poc-matches-label').textContent =
        pocStatsMode === 'withFlows'
            ? 'Total POC Matches (with flows)'
            : 'Total POC Matches (incl. NON-REACH)';
    document.getElementById('sites-with-poc-matches-label').textContent =
        pocStatsMode === 'withFlows'
            ? 'Sites with POC Flows'
            : 'Sites with POC Matches';
    selectedPocBucket = null;
    activePocSourceTab = 'urls';
    document.querySelectorAll('.poc-source-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === activePocSourceTab);
    });
    document.querySelectorAll('.poc-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === pocStatsMode);
    });

    try {
        const response = await fetch(`/api/poc-match-stats?mode=${encodeURIComponent(pocStatsMode)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();

        // Update stats boxes
        document.getElementById('total-poc-matches').textContent = stats.totalPocMatchesIncludingNonReach;
        document.getElementById('sites-with-poc-matches').textContent = stats.sitesWithPocMatches;
        document.getElementById('unique-poc-functions').textContent = stats.uniquePocFunctions;

        // Count ranked POCs (exclude Unranked bucket)
        const rankedBuckets = stats.rankingBuckets.filter(b => b.bucket !== 'Unranked');
        const rankedPocCount = rankedBuckets.reduce((sum, b) => sum + b.pocCount, 0);
        document.getElementById('ranked-sites-with-pocs').textContent = rankedPocCount;

        // Destroy existing charts
        Object.values(pocMatchesCharts).forEach(chart => {
            if (chart) chart.destroy();
        });
        pocMatchesCharts = {};

        // Create charts
        pocRankingBuckets = stats.rankingBuckets || [];
        createPocByRankingChart(pocRankingBuckets);
        createTopPocFunctionsChart(stats.topPocFunctions);
        initPocSourcePanel();

    } catch (error) {
        console.error('Error loading POC match stats:', error);
        alert('Failed to load POC match statistics. Please try again.');
    }
}

function closePocMatchesModal() {
    const modal = document.getElementById('poc-matches-modal');
    modal.classList.remove('show');
}

function initPocSourcePanel() {
    if (!pocSourcePanelInitialized) {
        const tabs = document.querySelectorAll('.poc-source-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                activePocSourceTab = tab.dataset.tab;
                tabs.forEach(btn => btn.classList.toggle('active', btn === tab));
                if (selectedPocBucket) {
                    renderPocSourceList(selectedPocBucket);
                }
            });
        });
        pocSourcePanelInitialized = true;
    }
    setPocSourceEmptyState();
}

function initPocModeToggle() {
    if (pocModeToggleInitialized) return;
    const buttons = document.querySelectorAll('.poc-mode-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            const nextMode = button.dataset.mode || 'all';
            if (nextMode === pocStatsMode) return;
            pocStatsMode = nextMode;
            buttons.forEach(btn => btn.classList.toggle('active', btn === button));
            selectedPocBucket = null;
            setPocSourceEmptyState();
            await openPocMatchesModal();
        });
    });
    pocModeToggleInitialized = true;
}

function setPocSourceEmptyState() {
    const title = document.getElementById('poc-source-title');
    const subtitle = document.getElementById('poc-source-subtitle');
    const meta = document.getElementById('poc-source-meta');
    const empty = document.getElementById('poc-source-empty');
    const list = document.getElementById('poc-source-list');
    title.textContent = 'POC Sources';
    subtitle.textContent = 'Click a ranking bar to see exactly where matches come from.';
    meta.textContent = '';
    empty.style.display = 'block';
    list.style.display = 'none';
    list.innerHTML = '';
}

function showPocBucketSources(bucket) {
    selectedPocBucket = bucket;
    const title = document.getElementById('poc-source-title');
    const subtitle = document.getElementById('poc-source-subtitle');
    const meta = document.getElementById('poc-source-meta');

    title.textContent = `POC Sources: ${bucket.bucket}`;
    subtitle.textContent = 'Sources reflect POC matches within this ranking bucket.';
    meta.innerHTML = `
        <span>POC Matches: ${bucket.pocCount}</span>
        <span>Unique URLs: ${bucket.uniqueUrls || 0}</span>
        <span>Unique Files: ${bucket.uniqueFiles || 0}</span>
    `;

    renderPocSourceList(bucket);
}

function renderPocSourceList(bucket) {
    const list = document.getElementById('poc-source-list');
    const empty = document.getElementById('poc-source-empty');
    const items = activePocSourceTab === 'files' ? bucket.topFiles : bucket.topUrls;

    if (!items || items.length === 0) {
        empty.textContent = activePocSourceTab === 'files'
            ? 'No file paths recorded for this bucket.'
            : 'No navigation URLs recorded for this bucket.';
        empty.style.display = 'block';
        list.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    list.style.display = 'flex';
    list.innerHTML = items.map(item => `
        <div class="poc-source-item">
            <div class="poc-source-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="poc-source-count">${item.count}</div>
        </div>
    `).join('');
}

function createPocByRankingChart(rankingBuckets) {
    const ctx = document.getElementById('poc-by-ranking-chart').getContext('2d');

    pocMatchesCharts.byRanking = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankingBuckets.map(b => b.bucket),
            datasets: [{
                label: 'POC Matches',
                data: rankingBuckets.map(b => b.avgPocPerSite ?? 0),
                backgroundColor: 'rgba(147, 51, 234, 0.7)',
                borderColor: 'rgba(147, 51, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const bucket = rankingBuckets[index];
                            if (!bucket || !bucket.functions) return '';

                            const functions = (bucket.functions || [])
                                .slice(0, 5);

                            if (functions.length === 0) return '';

                            let result = `\nSites: ${bucket.siteCount ?? 0}`;
                            result += `\nAvg POC/site: ${(bucket.avgPocPerSite ?? 0).toFixed(2)}`;
                            result += '\nTop Functions:';
                            functions.forEach((entry) => {
                                const label = entry.library ? `${entry.library} | ${entry.name}` : entry.name;
                                result += `\n  ${label}: ${entry.count}`;
                            });

                            const totalFunctions = (bucket.functions || []).length;
                            if (totalFunctions > 5) {
                                result += `\n  ... and ${totalFunctions - 5} more`;
                            }

                            return result;
                        },
                        footer: function() {
                            return 'Click bar to view sources';
                        }
                    }
                }
            },
            onClick: function(evt, elements) {
                if (!elements || elements.length === 0) return;
                const index = elements[0].index;
                const bucket = rankingBuckets[index];
                if (bucket) {
                    showPocBucketSources(bucket);
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Avg POC Matches per Site'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Site Ranking Bucket'
                    }
                }
            }
        }
    });
}

function createTopPocFunctionsChart(topPocFunctions) {
    const ctx = document.getElementById('top-poc-functions-chart').getContext('2d');

    pocMatchesCharts.topFunctions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPocFunctions.map(f => f.library ? `${f.library} | ${f.name}` : f.name),
            datasets: [{
                label: 'Occurrences',
                data: topPocFunctions.map(f => f.count),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            }
        }
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const vulnModal = document.getElementById('vuln-lib-modal');
    const libDetectionModal = document.getElementById('lib-detection-modal');
    const pocMatchesModal = document.getElementById('poc-matches-modal');

    if (event.target === vulnModal) {
        closeVulnLibModal();
    } else if (event.target === libDetectionModal) {
        closeLibDetectionModal();
    } else if (event.target === pocMatchesModal) {
        closePocMatchesModal();
    }
}

// Chart creation functions
function createTopLibsChart(topLibs) {
    const ctx = document.getElementById('top-libs-chart').getContext('2d');

    vulnCharts.topLibs = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topLibs.map(lib => lib.name),
            datasets: [{
                label: 'Occurrences',
                data: topLibs.map(lib => lib.count),
                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createVulnTypesChart(vulnTypes) {
    const ctx = document.getElementById('vuln-types-chart').getContext('2d');

    const sortedTypes = Object.entries(vulnTypes).sort((a, b) => b[1] - a[1]);
    const colors = [
        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#9333ea',
        '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'
    ];

    vulnCharts.vulnTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedTypes.map(([type]) => type.toUpperCase()),
            datasets: [{
                data: sortedTypes.map(([, count]) => count),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createVersionsChart(versions) {
    const ctx = document.getElementById('versions-chart').getContext('2d');

    vulnCharts.versions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: versions.map(v => v.name),
            datasets: [{
                label: 'Occurrences',
                data: versions.map(v => v.count),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Refresh statistics function
async function refreshStats() {
    const refreshBtn = document.getElementById('refresh-btn');
    const originalText = refreshBtn.innerHTML;

    // Show loading state
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="spin"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg> Refreshing...';

    try {
        const response = await fetch('/api/refresh-cache', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Wait a moment for cache to update, then reload
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error refreshing statistics:', error);
        alert('Failed to refresh statistics. Please try again.');
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalText;
    }
}

// ===== Pagination-based Site Loading =====

let allLoadedSites = []; // Store all loaded sites for filtering/sorting
let currentPage = 1;
let totalPages = 1;
let totalSites = 0;
const SITES_PER_PAGE = 50;
let isLoadingSites = false;
let currentSearchQuery = '';

// Format date/time for display
function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Function to create site item HTML from site data
function createSiteItemHTML(site) {
    const urlPathHTML = site.urlPath ? `<div class="site-path">${escapeHtml(site.urlPath)}</div>` : '';
    const noteDisplay = currentView === 'notes' ? 'block' : 'none';
    const noteHTML = (site.memo && site.memo.trim()) ? `
        <div class="site-note-inline" style="display: ${noteDisplay};">
            <div class="note-label">📝 Note:</div>
            <div class="note-content">${escapeHtml(site.memo)}</div>
        </div>
    ` : '';

    const badges = [];
    if (site.hasLibDetection) badges.push('<span class="badge badge-lib">LIB</span>');
    if (site.hasSinkFlows) badges.push('<span class="badge badge-flows">FLOWS</span>');
    if (site.hasVulnOut) badges.push('<span class="badge badge-vuln">VULN</span>');
    if (site.hasErrorLog) badges.push('<span class="badge badge-error">ERR</span>');
    if (site.hasWarningLog) badges.push('<span class="badge badge-warn">WARN</span>');

    const jsFilesHTML = site.jsFiles && site.jsFiles.length > 0 ? `
        <div class="js-files-section">
            <button class="toggle-js-files" onclick="toggleJsFiles('${site.hash}')">
                <span id="js-icon-${site.hash}">▶</span> JavaScript Files (${site.jsFiles.length})
            </button>
            <div id="js-files-${site.hash}" class="js-files-list" style="display: none;">
                ${site.jsFiles.map(file => `
                    <button class="js-file-btn" onclick="loadFile('${site.hash}', '${file}')">${file}</button>
                `).join('')}
            </div>
        </div>
    ` : '';

    const reviewCheckbox = site.reviewed ? 'checked' : '';
    const vulnerableCheckbox = site.vulnerable ? 'checked' : '';

    const availableFiles = site.files.filter(f => !site.jsFiles.includes(f) && !/^\d+\.js$/.test(f));
    const filesHTML = availableFiles.map(file => `
        <button class="file-btn" onclick="loadFile('${site.hash}', '${file}')">${file}</button>
    `).join('');

    const tagCountsHTML = Object.keys(site.tagCounts || {}).length > 0 ? `
        <p><strong>Tag Counts:</strong>
            ${Object.entries(site.tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => `${escapeHtml(tag)}: ${count}`)
                .join(', ')}
        </p>
    ` : '';

    return `
        <div class="site-item"
             data-modified-time="${site.modifiedTime}"
             data-reviewed="${site.reviewed}"
             data-vulnerable="${site.vulnerable}"
             data-has-lib-detection="${site.hasLibDetection}"
             data-has-sink-flows="${site.hasSinkFlows}"
             data-has-vuln-out="${site.hasVulnOut}"
             data-has-error-log="${site.hasErrorLog}"
             data-has-warning-log="${site.hasWarningLog}"
             data-has-notes="${site.memo && site.memo.trim() ? 'true' : 'false'}"
             data-search-text="${(site.domain + ' ' + site.urlPath + ' ' + site.originalUrl + ' ' + site.hash).toLowerCase()}"
             data-hash="${site.hash}"
             data-name="${site.domain}"
             data-flows="${site.hasFlows ? 1 : 0}"
             data-vulns="${site.vulnerableLibs}"
             data-pocs="${site.pocMatches}"
             data-js-count="${site.jsFiles ? site.jsFiles.length : 0}">
            <div class="site-header" onclick="toggleDetails('${site.hash}')">
                <div class="site-header-left">
                    <div class="site-domain" title="${escapeHtml(site.originalUrl)}">${escapeHtml(site.domain)}</div>
                    ${urlPathHTML}
                    <div class="file-badges">
                        ${badges.join('')}
                    </div>
                </div>
                <div class="site-header-right">
                    <span class="modified-time" title="Click to set as end time" onclick="event.stopPropagation(); setTimeEnd(${site.modifiedTime})">${formatDateTime(site.modifiedTime)}</span>
                    <div class="site-stats">
                        <span>Flows: <span class="indicator ${site.hasFlows ? 'yes' : 'no'}">${site.hasFlows ? 'Yes' : 'No'}</span></span>
                        <span class="stat-divider">|</span>
                        <span>Vuln Libs: ${site.vulnerableLibs}</span>
                        <span class="stat-divider">|</span>
                        <span>POCs: ${site.pocMatches}</span>
                    </div>
                </div>
                <span class="expand-icon" id="icon-${site.hash}">+</span>
            </div>
            ${noteHTML}
            <div class="site-details" id="details-${site.hash}">
                <p><strong>URL:</strong> <a href="${escapeHtml(site.originalUrl)}" target="_blank">${escapeHtml(site.originalUrl)}</a></p>
                <p><strong>Hash:</strong> ${escapeHtml(site.hash)}</p>
                ${tagCountsHTML}
                <div class="review-section">
                    <label class="review-checkbox">
                        <input type="checkbox" ${reviewCheckbox} onchange="updateReview('${site.hash}', 'reviewed', this.checked)">
                        <span>Reviewed</span>
                    </label>
                    <label class="review-checkbox">
                        <input type="checkbox" ${vulnerableCheckbox} onchange="updateReview('${site.hash}', 'vulnerable', this.checked)">
                        <span>Vulnerable</span>
                    </label>
                    <div class="memo-section">
                        <label>Notes:</label>
                        <textarea class="memo-input" id="memo-${site.hash}" placeholder="Add notes..." onblur="updateReview('${site.hash}', 'memo', this.value)">${escapeHtml(site.memo || '')}</textarea>
                    </div>
                </div>
                ${jsFilesHTML}
                <div class="file-list">
                    <h4>Available Files:</h4>
                    ${filesHTML}
                </div>
                <div class="file-content-wrapper" id="wrapper-${site.hash}" style="display: none;">
                    <div class="file-header">
                        <div>
                            <strong>File:</strong> <span id="current-file-${site.hash}"></span>
                        </div>
                        <div>
                            <button class="toggle-view-btn" id="toggle-${site.hash}" onclick="toggleView('${site.hash}')" style="display: none;">Switch to Raw View</button>
                        </div>
                    </div>
                    <div class="file-content-container" id="file-container-${site.hash}">
                        <div class="flow-sidebar" id="flow-sidebar-${site.hash}" style="display: none;"></div>
                        <pre class="file-content line-numbers" id="content-${site.hash}"><code class="language-javascript" id="code-${site.hash}"></code></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Build query string with current search and filters
function buildQueryParams() {
    const params = new URLSearchParams();

    // If in file content search mode, pass the matching hashes
    if (currentSearchMode === 'content' && fileContentSearchResults.size > 0) {
        params.set('hashes', Array.from(fileContentSearchResults).join(','));
    } else if (currentSearchQuery) {
        params.set('q', currentSearchQuery);
    }

    // Add filter parameters
    if (document.getElementById('filter-flows')?.checked) {
        params.set('hasFlows', 'true');
    }
    if (document.getElementById('filter-lib-detection')?.checked) {
        params.set('hasLibDetection', 'true');
    }
    if (document.getElementById('filter-sink-flows')?.checked) {
        params.set('hasSinkFlows', 'true');
    }
    if (document.getElementById('filter-vuln-out')?.checked) {
        params.set('hasVulnOut', 'true');
    }
    if (document.getElementById('filter-error-log')?.checked) {
        params.set('hasErrorLog', 'true');
    }
    if (document.getElementById('filter-warning-log')?.checked) {
        params.set('hasWarningLog', 'true');
    }
    if (document.getElementById('filter-reviewed')?.checked) {
        params.set('reviewed', 'true');
    }
    if (document.getElementById('filter-unreviewed')?.checked) {
        params.set('unreviewed', 'true');
    }
    if (document.getElementById('filter-vulnerable')?.checked) {
        params.set('vulnerable', 'true');
    }
    if (document.getElementById('filter-has-notes')?.checked) {
        params.set('hasNotes', 'true');
    }
    if (document.getElementById('filter-vuln-poc-mismatch')?.checked) {
        params.set('vulnPocLocationMismatch', 'true');
    }

    if (currentRangeMode === 'hash') {
        const hashStart = document.getElementById('hash-start')?.value?.trim();
        const hashEnd = document.getElementById('hash-end')?.value?.trim();
        if (hashStart) {
            params.set('hashStart', hashStart);
        }
        if (hashEnd) {
            params.set('hashEnd', hashEnd);
        }
    } else {
        // Add time range parameters
        const timeStart = document.getElementById('time-start')?.value;
        const timeEnd = document.getElementById('time-end')?.value;
        if (timeStart) {
            params.set('timeStart', new Date(timeStart).getTime().toString());
        }
        if (timeEnd) {
            params.set('timeEnd', new Date(timeEnd).getTime().toString());
        }
    }

    return params.toString();
}

// Reload from page 1 when filters change
function reloadWithFilters() {
    loadPage(1);
}

// Load sites for a specific page
async function loadPage(page) {
    if (isLoadingSites) return;

    isLoadingSites = true;
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'flex';

    try {
        // Build URL with pagination, search, and filter parameters
        const queryParams = buildQueryParams();
        const url = `/api/search?page=${page}&limit=${SITES_PER_PAGE}${queryParams ? '&' + queryParams : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (parseError) {
                // Ignore JSON parsing errors
            }
            const rangeError = document.getElementById('hash-range-error');
            if (rangeError && currentRangeMode === 'hash') {
                rangeError.textContent = errorMessage;
                rangeError.style.display = 'block';
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Update pagination state
        currentPage = data.page;
        totalPages = data.totalPages;
        totalSites = data.total;

        // Store sites
        allLoadedSites = data.sites;

        // Clear any hash range error on success
        const rangeError = document.getElementById('hash-range-error');
        if (rangeError) {
            rangeError.style.display = 'none';
            rangeError.textContent = '';
        }

        // Clear and render the sites
        const siteList = document.getElementById('site-list');
        siteList.innerHTML = '';
        data.sites.forEach(site => {
            const siteHTML = createSiteItemHTML(site);
            siteList.insertAdjacentHTML('beforeend', siteHTML);
        });

        // Update pagination UI
        updatePaginationUI();

        // Update visible count
        updateVisibleCount();

        // Ensure notes visibility matches current view after re-render
        updateNotesVisibility(currentView);

    } catch (error) {
        console.error('Error loading sites:', error);
    } finally {
        isLoadingSites = false;
        loadingIndicator.style.display = 'none';
        if (searchSpinnerActive) {
            setSearchButtonLoading(false);
            searchSpinnerActive = false;
        }
    }
}

// Generate page number buttons HTML
function generatePageNumbers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    const maxVisible = 7; // Max number of page buttons to show

    if (totalPages <= maxVisible) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-num ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
    } else {
        // Show first, last, current and nearby pages with ellipsis
        const pages = new Set();

        // Always include first and last
        pages.add(1);
        pages.add(totalPages);

        // Include current and neighbors
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            pages.add(i);
        }

        const sortedPages = Array.from(pages).sort((a, b) => a - b);
        let prev = 0;

        for (const page of sortedPages) {
            if (page - prev > 1) {
                html += '<span class="page-ellipsis">...</span>';
            }
            html += `<button class="page-num ${page === currentPage ? 'active' : ''}" onclick="goToPage(${page})">${page}</button>`;
            prev = page;
        }
    }

    container.innerHTML = html;
}

// Update pagination UI elements
function updatePaginationUI() {
    // Top pagination
    const pageInput = document.getElementById('page-input');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageRange = document.getElementById('page-range');

    // Bottom pagination
    const prevBtnBottom = document.getElementById('prev-page-btn-bottom');
    const nextBtnBottom = document.getElementById('next-page-btn-bottom');

    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
    }

    // Generate page number buttons
    generatePageNumbers('page-numbers-top');
    generatePageNumbers('page-numbers-bottom');

    // Enable/disable prev buttons
    const hasPrev = currentPage > 1;
    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (prevBtnBottom) prevBtnBottom.disabled = !hasPrev;

    // Enable/disable next buttons
    const hasNext = currentPage < totalPages;
    if (nextBtn) nextBtn.disabled = !hasNext;
    if (nextBtnBottom) nextBtnBottom.disabled = !hasNext;

    // Show page range info
    const startSite = (currentPage - 1) * SITES_PER_PAGE + 1;
    const endSite = Math.min(currentPage * SITES_PER_PAGE, totalSites);
    if (pageRange) {
        pageRange.textContent = `(Sites ${startSite}-${endSite} of ${totalSites})`;
    }

    // Update total count
    document.getElementById('total-count').textContent = totalSites;
}

// Navigation functions
function nextPage() {
    if (currentPage < totalPages) {
        loadPage(currentPage + 1);
    }
}

function prevPage() {
    if (currentPage > 1) {
        loadPage(currentPage - 1);
    }
}

function goToPage(page) {
    const pageNum = parseInt(page, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
        loadPage(pageNum);
    }
}

function goToPageInput() {
    const pageInput = document.getElementById('page-input');
    const page = parseInt(pageInput.value, 10);
    if (page >= 1 && page <= totalPages) {
        loadPage(page);
    } else {
        pageInput.value = currentPage; // Reset to current page if invalid
    }
}

// Initialize pagination on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Pagination] Initializing...');

    // Load first page
    loadPage(1);

    // Load POC status summary from review/stat cache
    fetch('/api/poc-status-summary')
        .then(response => response.ok ? response.json() : null)
        .then(summary => {
            if (!summary || !summary.counts) return;
            ['vulnerableFunc', 'pocMatch', 'dataflow'].forEach(key => {
                if (summary.counts[key]) {
                    pocStatusCounts[key].true = summary.counts[key].true || 0;
                    pocStatusCounts[key].false = summary.counts[key].false || 0;
                }
            });
            if (summary.counts.origin) {
                pocStatusCounts.origin.cdn = summary.counts.origin.cdn || 0;
                pocStatusCounts.origin.bundle = summary.counts.origin.bundle || 0;
            }
            updateGlobalPocStatusSummary();
        })
        .catch(error => console.error('Error loading POC status summary:', error));

    // Default range mode
    switchRangeMode('time');

    // Add keyboard navigation for page input
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                goToPageInput();
            }
        });
    }
});
