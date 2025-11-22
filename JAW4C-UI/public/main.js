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

function applyFilters() {
    const filterFlows = document.getElementById('filter-flows').checked;
    const filterLibDetection = document.getElementById('filter-lib-detection').checked;
    const filterSinkFlows = document.getElementById('filter-sink-flows').checked;
    const filterVulnOut = document.getElementById('filter-vuln-out').checked;
    const filterErrorLog = document.getElementById('filter-error-log').checked;
    const filterWarningLog = document.getElementById('filter-warning-log').checked;
    const filterReviewed = document.getElementById('filter-reviewed').checked;
    const filterUnreviewed = document.getElementById('filter-unreviewed').checked;
    const filterVulnerable = document.getElementById('filter-vulnerable').checked;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    const siteItems = document.querySelectorAll('.site-item');
    let visibleCount = 0;

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
        // Batch DOM updates
        const fragment = document.createDocumentFragment();

        siteItems.forEach(item => {
            let shouldShow = true;

            // Early exit optimization - combine all checks
            shouldShow = !(
                (filterFlows && item.dataset.flows !== '1') ||
                (filterLibDetection && item.dataset.hasLibDetection !== 'true') ||
                (filterSinkFlows && item.dataset.hasSinkFlows !== 'true') ||
                (filterVulnOut && item.dataset.hasVulnOut !== 'true') ||
                (filterErrorLog && item.dataset.hasErrorLog !== 'true') ||
                (filterWarningLog && item.dataset.hasWarningLog !== 'true') ||
                (filterReviewed && item.dataset.reviewed !== 'true') ||
                (filterUnreviewed && item.dataset.reviewed === 'true') ||
                (filterVulnerable && item.dataset.vulnerable !== 'true') ||
                (searchTerm && !item.dataset.searchText.includes(searchTerm))
            );

            // Toggle visibility with class instead of inline style for better performance
            if (shouldShow) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });

        // Update visible count
        document.getElementById('visible-count').textContent = visibleCount;
    });
}

// Debounced version for search input
const debouncedApplyFilters = debounce(applyFilters, 300);

function clearFilters() {
    document.getElementById('filter-flows').checked = false;
    document.getElementById('filter-lib-detection').checked = false;
    document.getElementById('filter-sink-flows').checked = false;
    document.getElementById('filter-vuln-out').checked = false;
    document.getElementById('filter-error-log').checked = false;
    document.getElementById('filter-warning-log').checked = false;
    document.getElementById('filter-reviewed').checked = false;
    document.getElementById('filter-unreviewed').checked = false;
    document.getElementById('filter-vulnerable').checked = false;
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
                // Re-apply filters to update visibility
                applyFilters();
            }
        } else {
            console.error('Failed to update review');
        }
    } catch (error) {
        console.error('Error updating review:', error);
        alert('Failed to update review. Please try again.');
    }
}

// Initialize visible count and sorting on page load
document.addEventListener('DOMContentLoaded', () => {
    applySorting();
    applyFilters();
});

// Filter sites with flows when clicking the stat card
function filterSitesWithFlows() {
    const filterFlowsCheckbox = document.getElementById('filter-flows');
    filterFlowsCheckbox.checked = true;
    applyFilters();

    // Smooth scroll to the filter section
    const filterSection = document.querySelector('.filter-section');
    filterSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Library Detection Modal Functions
let libDetectionCharts = {};

async function openLibDetectionModal() {
    const modal = document.getElementById('lib-detection-modal');
    modal.classList.add('show');

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

// Vulnerable Libraries Modal Functions
let vulnCharts = {};

async function openVulnLibModal() {
    const modal = document.getElementById('vuln-lib-modal');
    modal.classList.add('show');

    try {
        const response = await fetch('/api/vuln-stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();

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
        createConfidenceChart(stats.confidenceScores);

    } catch (error) {
        console.error('Error loading vulnerability stats:', error);
        alert('Failed to load vulnerability statistics. Please try again.');
    }
}

function closeVulnLibModal() {
    const modal = document.getElementById('vuln-lib-modal');
    modal.classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const vulnModal = document.getElementById('vuln-lib-modal');
    const libDetectionModal = document.getElementById('lib-detection-modal');

    if (event.target === vulnModal) {
        closeVulnLibModal();
    } else if (event.target === libDetectionModal) {
        closeLibDetectionModal();
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

function createConfidenceChart(confidenceScores) {
    const ctx = document.getElementById('confidence-chart').getContext('2d');

    const labels = ['0-25%', '26-50%', '51-75%', '76-100%'];
    const data = [
        confidenceScores['0-25'],
        confidenceScores['26-50'],
        confidenceScores['51-75'],
        confidenceScores['76-100']
    ];

    vulnCharts.confidence = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',   // Red for low
                    'rgba(245, 158, 11, 0.7)',  // Amber for medium-low
                    'rgba(59, 130, 246, 0.7)',  // Blue for medium-high
                    'rgba(16, 185, 129, 0.7)'   // Green for high
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
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
