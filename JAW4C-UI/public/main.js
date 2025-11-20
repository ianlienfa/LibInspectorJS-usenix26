function toggleDetails(hash) {
    const details = document.getElementById(`details-${hash}`);
    const icon = document.getElementById(`icon-${hash}`);

    if (details.classList.contains('open')) {
        details.classList.remove('open');
        icon.textContent = '+';
    } else {
        details.classList.add('open');
        icon.textContent = '-';
    }
}

// Store current file data for toggling
const fileCache = {};

async function loadFile(hash, file) {
    const contentEl = document.getElementById(`content-${hash}`);
    const wrapperEl = document.getElementById(`wrapper-${hash}`);
    const currentFileEl = document.getElementById(`current-file-${hash}`);
    const toggleBtn = document.getElementById(`toggle-${hash}`);
    const details = document.getElementById(`details-${hash}`);
    const icon = document.getElementById(`icon-${hash}`);

    // Check if clicking the same file while wrapper is visible - toggle it closed
    const isWrapperVisible = wrapperEl.style.display === 'block';
    const isSameFile = currentFileEl.textContent === file;

    if (isWrapperVisible && isSameFile) {
        // Hide the file content wrapper
        wrapperEl.style.display = 'none';
        return;
    }

    // Ensure details are open when loading a file
    if (!details.classList.contains('open')) {
        details.classList.add('open');
        icon.textContent = '-';
    }

    contentEl.textContent = 'Loading...';
    wrapperEl.style.display = 'block';

    try {
        const response = await fetch(`/api/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

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

        // Display formatted content from server
        if (data.type === 'html') {
            contentEl.innerHTML = data.content;
        } else {
            contentEl.textContent = data.content;
        }

        // Show/hide toggle button
        if (data.hasTableView) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = 'Switch to Raw View';
        } else {
            toggleBtn.style.display = 'none';
        }
    } catch (error) {
        contentEl.textContent = `Error loading file: ${error.message || error}`;
        toggleBtn.style.display = 'none';
    }
}

async function toggleView(hash) {
    const contentEl = document.getElementById(`content-${hash}`);
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
            contentEl.textContent = data.content;
            toggleBtn.textContent = 'Switch to Table View';
            cached.currentView = 'raw';
        } catch (error) {
            contentEl.textContent = `Error loading raw view: ${error.message}`;
        }
    } else {
        // Switch back to formatted view
        if (cached.type === 'html') {
            contentEl.innerHTML = cached.formattedContent;
        } else {
            contentEl.textContent = cached.formattedContent;
        }
        toggleBtn.textContent = 'Switch to Raw View';
        cached.currentView = 'formatted';
    }
}

function applyFilters() {
    const filterFlows = document.getElementById('filter-flows').checked;
    const filterLibDetection = document.getElementById('filter-lib-detection').checked;
    const filterSinkFlows = document.getElementById('filter-sink-flows').checked;
    const filterVulnOut = document.getElementById('filter-vuln-out').checked;
    const filterErrorLog = document.getElementById('filter-error-log').checked;
    const filterWarningLog = document.getElementById('filter-warning-log').checked;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    const siteItems = document.querySelectorAll('.site-item');
    let visibleCount = 0;

    siteItems.forEach(item => {
        let shouldShow = true;

        // Apply flows filter
        if (filterFlows && item.dataset.flows !== '1') {
            shouldShow = false;
        }

        // Apply file existence filters
        if (filterLibDetection && item.dataset.hasLibDetection !== 'true') {
            shouldShow = false;
        }
        if (filterSinkFlows && item.dataset.hasSinkFlows !== 'true') {
            shouldShow = false;
        }
        if (filterVulnOut && item.dataset.hasVulnOut !== 'true') {
            shouldShow = false;
        }
        if (filterErrorLog && item.dataset.hasErrorLog !== 'true') {
            shouldShow = false;
        }
        if (filterWarningLog && item.dataset.hasWarningLog !== 'true') {
            shouldShow = false;
        }

        // Apply search filter
        if (searchTerm && !item.dataset.searchText.includes(searchTerm)) {
            shouldShow = false;
        }

        // Show or hide the item
        if (shouldShow) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Update visible count
    document.getElementById('visible-count').textContent = visibleCount;
}

function clearFilters() {
    document.getElementById('filter-flows').checked = false;
    document.getElementById('filter-lib-detection').checked = false;
    document.getElementById('filter-sink-flows').checked = false;
    document.getElementById('filter-vuln-out').checked = false;
    document.getElementById('filter-error-log').checked = false;
    document.getElementById('filter-warning-log').checked = false;
    document.getElementById('search-input').value = '';
    applyFilters();
}

function applySorting() {
    const sortValue = document.getElementById('sort-select').value;
    const siteList = document.querySelector('.site-list');
    const siteItems = Array.from(document.querySelectorAll('.site-item'));

    siteItems.sort((a, b) => {
        switch(sortValue) {
            case 'modified-desc':
                return parseInt(b.dataset.modifiedTime) - parseInt(a.dataset.modifiedTime);
            case 'name':
                return a.dataset.name.localeCompare(b.dataset.name);
            case 'flows-desc':
                return parseInt(b.dataset.flows) - parseInt(a.dataset.flows);
            case 'vulns-desc':
                return parseInt(b.dataset.vulns) - parseInt(a.dataset.vulns);
            case 'pocs-desc':
                return parseInt(b.dataset.pocs) - parseInt(a.dataset.pocs);
            default:
                return 0; // Keep original order
        }
    });

    // Re-append sorted items
    siteItems.forEach(item => siteList.appendChild(item));
}

// Initialize visible count and sorting on page load
document.addEventListener('DOMContentLoaded', () => {
    applySorting();
    applyFilters();
});
