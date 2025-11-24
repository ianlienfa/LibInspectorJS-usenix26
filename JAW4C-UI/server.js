const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Constants ---
const JAW4C_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(JAW4C_DIR, 'JAW4C-JAW', 'data');
const REVIEW_FILE = path.join(DATA_DIR, 'review.json');

// --- Cache Management ---
const CACHE_TTL = 30000; // 30 seconds cache
let siteDataCache = null;
let cacheTimestamp = 0;
let isUpdatingCache = false;

// --- Server-Side Parsing Functions ---

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function highlightJSON(text) {
    try {
        const obj = JSON.parse(text);
        const formatted = JSON.stringify(obj, null, 2);
        return formatted
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
    } catch (e) {
        return escapeHtml(text);
    }
}

function stripAnsiCodes(text) {
    // Remove ANSI color codes (e.g., \x1b[33;21m, \x1b[0m, etc.)
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function highlightLog(text) {
    // Strip ANSI codes first, then escape and highlight
    const cleanText = stripAnsiCodes(text);
    return escapeHtml(cleanText)
        .replace(/^(ERROR|FATAL|CRITICAL).*$/gm, '<span class="log-error">$&</span>')
        .replace(/^(WARN|WARNING).*$/gm, '<span class="log-warn">$&</span>')
        .replace(/^(INFO).*$/gm, '<span class="log-info">$&</span>')
        .replace(/^(DEBUG|TRACE).*$/gm, '<span class="log-debug">$&</span>')
        .replace(/\[.*?\]/g, '<span class="log-timestamp">$&</span>');
}

function formatLibDetectionTable(data) {
    let html = '<div class="table-view">';

    for (const [url, methods] of Object.entries(data)) {
        for (const [method, detections] of Object.entries(methods)) {
            if (method === 'detection' || Array.isArray(detections)) continue;

            html += `<h5>Method: ${method}</h5>`;

            const detectionData = detections.detection || detections;
            if (Array.isArray(detectionData) && detectionData.length > 0) {
                html += '<table class="detection-table">';
                html += '<thead><tr><th>Library</th><th>Version</th><th>Location</th><th>Accurate</th><th>URL</th></tr></thead>';
                html += '<tbody>';

                const flatDetections = detectionData.flat();
                flatDetections.forEach(lib => {
                    const accurateClass = lib.accurate ? 'accurate-yes' : 'accurate-no';
                    html += `<tr>
                        <td class="lib-name">${escapeHtml(lib.libname || 'N/A')}</td>
                        <td>${escapeHtml(lib.version || 'unknown')}</td>
                        <td class="lib-location">${escapeHtml(lib.location || 'N/A')}</td>
                        <td class="${accurateClass}">${lib.accurate ? 'Yes' : 'No'}</td>
                        <td><a href="${escapeHtml(lib.url || '#')}" target="_blank" class="lib-url">Link</a></td>
                    </tr>`;
                });

                html += '</tbody></table>';
            } else {
                html += '<p class="no-detections">No detections found</p>';
            }
        }
    }

    html += '</div>';
    return html;
}

function formatVulnTable(text) {
    let html = '<div class="table-view">';

    try {
        const lines = text.trim().split('\n');
        let hasContent = false;

        lines.forEach(line => {
            if (!line.trim()) return;

            try {
                const data = JSON.parse(line);

                for (const [url, libraries] of Object.entries(data)) {
                    hasContent = true;

                    if (Array.isArray(libraries) && libraries.length > 0) {
                        libraries.forEach(lib => {
                            const libname = lib.libname || 'Unknown';
                            const version = lib.version || 'unknown';
                            const location = lib.location || 'N/A';
                            const vulns = lib.vuln || [];

                            html += `<h5>Library: ${escapeHtml(libname)} v${escapeHtml(version)} (Location: ${escapeHtml(location)})</h5>`;

                            if (vulns.length > 0) {
                                html += '<table class="vuln-table">';
                                html += '<thead><tr><th>Type</th><th>Confidence</th><th>POC</th><th>Payload</th><th>Validated</th></tr></thead>';
                                html += '<tbody>';

                                vulns.forEach(vuln => {
                                    const vulnType = vuln.vulnerability_type || 'unknown';
                                    const confidence = vuln.confidence_score || 0;
                                    const poc = vuln.poc || 'N/A';
                                    const payload = vuln.payload || 'N/A';
                                    const validated = vuln.validated ? 'Yes' : 'No';

                                    const typeClass = `vuln-type-${vulnType.toLowerCase().replace(/[^a-z]/g, '')}`;
                                    const confidencePercent = Math.round(confidence * 100);

                                    html += `<tr>
                                        <td class="vuln-type ${typeClass}">${escapeHtml(vulnType.toUpperCase())}</td>
                                        <td class="confidence-score">${confidencePercent}%</td>
                                        <td class="poc-code">${escapeHtml(poc)}</td>
                                        <td class="payload-code">${escapeHtml(payload)}</td>
                                        <td class="${validated === 'Yes' ? 'validated-yes' : 'validated-no'}">${validated}</td>
                                    </tr>`;
                                });

                                html += '</tbody></table>';
                            } else {
                                html += '<p class="no-vulnerabilities">No vulnerabilities found for this library</p>';
                            }
                        });
                    } else {
                        html += '<p class="no-vulnerabilities">No vulnerabilities found</p>';
                    }
                }
            } catch (lineError) {
                console.error('Error parsing line:', lineError);
            }
        });

        if (!hasContent) {
            html += '<p class="no-vulnerabilities">No vulnerability data found</p>';
        }
    } catch (e) {
        html += `<p class="error">Error parsing vulnerability data: ${escapeHtml(e.message)}</p>`;
    }

    html += '</div>';
    return html;
}

// --- Review Data Management ---

async function loadReviewData() {
    try {
        const content = await fs.readFile(REVIEW_FILE, 'utf8');

        // Check if file is empty or only contains whitespace
        if (!content || content.trim() === '') {
            console.log('Review file is empty, initializing with empty object');
            // Initialize the file with an empty JSON object
            await saveReviewData({});
            return {};
        }

        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist yet, create it with empty object
            console.log('Review file does not exist, creating new file');
            await saveReviewData({});
            return {};
        }
        console.error('Error loading review data:', error);
        return {};
    }
}

async function saveReviewData(reviewData) {
    try {
        await fs.writeFile(REVIEW_FILE, JSON.stringify(reviewData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving review data:', error);
        return false;
    }
}

// --- Data Fetching and Processing ---

// Batch file reading with concurrency limit
async function batchReadFiles(filePaths, concurrency = 10) {
    const results = new Map();
    const queue = [...filePaths];

    async function processFile() {
        while (queue.length > 0) {
            const { key, path: filePath } = queue.shift();
            try {
                const content = await fs.readFile(filePath, 'utf8');
                results.set(key, content);
            } catch (e) {
                results.set(key, null);
            }
        }
    }

    const workers = Array(Math.min(concurrency, filePaths.length))
        .fill(null)
        .map(() => processFile());

    await Promise.all(workers);
    return results;
}

// Helper function to format URL for display
function formatUrlForDisplay(url) {
    try {
        // Check if this is a proxy URL with a target parameter
        const urlObj = new URL(url);
        const targetParam = urlObj.searchParams.get('target');

        let actualUrl = url;
        if (targetParam) {
            // Decode the target parameter to get the real URL
            actualUrl = decodeURIComponent(targetParam);
        }

        // Parse the actual URL
        const actualUrlObj = new URL(actualUrl);
        const domain = actualUrlObj.hostname;

        // Get the path/query/hash part
        const pathname = actualUrlObj.pathname;
        const search = actualUrlObj.search;
        const hash = actualUrlObj.hash;
        const pathPart = pathname + search + hash;

        // Remove leading slash for cleaner display
        const cleanPath = pathPart.startsWith('/') ? pathPart.substring(1) : pathPart;

        // Take up to 100 characters for path
        const truncatedPath = cleanPath.substring(0, 100);

        return {
            domain: domain,
            path: truncatedPath
        };
    } catch (e) {
        // If URL parsing fails, return a simple object
        const truncated = url.length > 100 ? url.substring(0, 100) + '...' : url;
        return {
            domain: truncated,
            path: ''
        };
    }
}

async function getSiteData() {
    let parentDirs = [];
    try {
        parentDirs = await fs.readdir(DATA_DIR);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.warn(`Data directory not found: ${DATA_DIR}`);
            return { globalStats: { sites: 0, sitesWithFlows: 0, vulnerableLibs: 0, pocMatches: 0 }, sites: [] };
        }
        throw err;
    }

    // Load review data
    const reviewData = await loadReviewData();

    // First pass: collect all site paths in parallel
    const sitePathsPromises = parentDirs.map(async (parentDir) => {
        const parentPath = path.join(DATA_DIR, parentDir);
        try {
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) return [];

            const siteHashes = await fs.readdir(parentPath);
            const validSites = await Promise.all(
                siteHashes.map(async (hash) => {
                    const sitePath = path.join(parentPath, hash);
                    try {
                        const siteStats = await fs.stat(sitePath);
                        if (siteStats.isDirectory()) {
                            return { parentDir, hash, sitePath, modifiedTime: siteStats.mtime.getTime() };
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                })
            );
            return validSites.filter(s => s !== null);
        } catch (e) {
            return [];
        }
    });

    const sitePaths = (await Promise.all(sitePathsPromises)).flat();

    // Prepare batch file reading for all sites
    const filesToRead = [];
    sitePaths.forEach(({ sitePath, parentDir, hash }) => {
        const compositeHash = `${parentDir}/${hash}`;
        filesToRead.push({ key: `${compositeHash}:url`, path: path.join(sitePath, 'url.out') });
        filesToRead.push({ key: `${compositeHash}:flows`, path: path.join(sitePath, 'sink.flows.out') });
        filesToRead.push({ key: `${compositeHash}:vuln`, path: path.join(sitePath, 'vuln.out') });
    });

    // Batch read all files
    const fileContents = await batchReadFiles(filesToRead, 20);

    // Process each site with cached file contents
    const allSitesData = await Promise.all(
        sitePaths.map(async ({ parentDir, hash, sitePath, modifiedTime }) => {
            const compositeHash = `${parentDir}/${hash}`;

            // Process URL
            let siteDomain = compositeHash;
            let siteUrlPath = '';
            let originalUrl = '';
            const urlContent = fileContents.get(`${compositeHash}:url`);
            if (urlContent) {
                const rawUrl = urlContent.trim();
                try {
                    const urlObj = new URL(rawUrl);
                    const targetParam = urlObj.searchParams.get('target');
                    originalUrl = targetParam ? decodeURIComponent(targetParam) : rawUrl;
                } catch (e) {
                    originalUrl = rawUrl;
                }
                const formatted = formatUrlForDisplay(rawUrl);
                siteDomain = formatted.domain;
                siteUrlPath = formatted.path;
            }

            // Process flows
            let hasFlows = false;
            let pocMatches = 0;
            const flowsContent = fileContents.get(`${compositeHash}:flows`);
            if (flowsContent) {
                // Split flows by the separator pattern and filter out NON-REACH flows
                const flowEntries = flowsContent.split(/(?=\[\*\] Tags:)/);
                const validFlows = flowEntries.filter(entry => {
                    // Check if this flow entry contains NON-REACH tag
                    const tagsMatch = entry.match(/\[\*\] Tags:\s*(\[.*?\])/);
                    if (tagsMatch) {
                        const tagsStr = tagsMatch[1];
                        return !tagsStr.toUpperCase().includes('NON-REACH');
                    }
                    return true; // Keep entries without tags line
                });

                // Count valid flows (those with Tags line)
                pocMatches = validFlows.filter(entry => entry.includes('[*] Tags:')).length;
                if (pocMatches > 0) {
                    hasFlows = true;
                }
            }

            // Process vulnerabilities
            let vulnerableLibs = 0;
            let hasValidVulnData = false;
            const vulnContent = fileContents.get(`${compositeHash}:vuln`);
            if (vulnContent && vulnContent.trim()) {
                try {
                    vulnContent.split('\n').forEach(line => {
                        if (line.trim()) {
                            try {
                                const vulnData = JSON.parse(line);
                                const urlKey = Object.keys(vulnData)[0];
                                const vulnCount = vulnData[urlKey].length;
                                if (vulnCount > 0) {
                                    vulnerableLibs += vulnCount;
                                    hasValidVulnData = true;
                                }
                            } catch (e) { /* Ignore parse errors */ }
                        }
                    });
                } catch (e) { /* Ignore errors */ }
            }

            // Check file existence in parallel
            const importantFiles = [
                'sink.flows.out', 'vuln.out', 'lib.detection.json', 'urls.out',
                'errors.log', 'warnings.log', 'info.log'
            ];

            const fileExistenceChecks = await Promise.all(
                importantFiles.map(async (file) => {
                    try {
                        await fs.access(path.join(sitePath, file));
                        return file;
                    } catch (e) {
                        return null;
                    }
                })
            );

            // Check errors.log file size to only show non-empty files
            let hasErrorLog = false;
            try {
                const errorLogPath = path.join(sitePath, 'errors.log');
                const errorLogStats = await fs.stat(errorLogPath);
                hasErrorLog = errorLogStats.size > 0;
            } catch (e) {
                // File doesn't exist or can't be accessed
                hasErrorLog = false;
            }

            // Collect numbered JS files (e.g., 0.js, 1.js, etc., but not *.min.js)
            let jsFiles = [];
            try {
                const allFiles = await fs.readdir(sitePath);
                jsFiles = allFiles
                    .filter(file => /^\d+\.js$/.test(file)) // Only [num].js files
                    .sort((a, b) => {
                        const numA = parseInt(a.match(/^(\d+)\.js$/)[1]);
                        const numB = parseInt(b.match(/^(\d+)\.js$/)[1]);
                        return numA - numB;
                    });
            } catch (e) {
                // Directory read error
                jsFiles = [];
            }

            const availableFiles = fileExistenceChecks.filter(f => f !== null);
            const hasLibDetection = availableFiles.includes('lib.detection.json');
            const hasSinkFlows = availableFiles.includes('sink.flows.out');
            const hasWarningLog = availableFiles.includes('warnings.log');

            const review = reviewData[compositeHash] || { reviewed: false, vulnerable: false, memo: '' };

            return {
                hash: compositeHash,
                domain: siteDomain,
                urlPath: siteUrlPath,
                originalUrl,
                modifiedTime,
                hasFlows,
                pocMatches,
                vulnerableLibs,
                files: availableFiles,
                jsFiles: jsFiles,
                hasLibDetection,
                hasVulnOut: hasValidVulnData,
                hasSinkFlows,
                hasErrorLog,
                hasWarningLog,
                reviewed: review.reviewed,
                vulnerable: review.vulnerable,
                memo: review.memo,
            };
        })
    );

    const globalStats = {
        sites: allSitesData.length,
        sitesWithFlows: allSitesData.filter(s => s.hasFlows).length,
        vulnerableLibs: allSitesData.reduce((acc, s) => acc + s.vulnerableLibs, 0),
        pocMatches: allSitesData.reduce((acc, s) => acc + s.pocMatches, 0),
    };

    return { globalStats, sites: allSitesData };
}

// Background cache update function
async function updateCacheInBackground() {
    if (isUpdatingCache) return;

    isUpdatingCache = true;
    console.log('[Cache] Updating site data cache in background...');

    try {
        const data = await getSiteData();
        siteDataCache = data;
        cacheTimestamp = Date.now();
        console.log(`[Cache] Updated with ${data.sites.length} sites`);
    } catch (error) {
        console.error('[Cache] Error updating cache:', error);
    } finally {
        isUpdatingCache = false;
    }
}

// Get cached or fresh data
async function getCachedSiteData() {
    const now = Date.now();

    // If cache is fresh, return it immediately
    if (siteDataCache && (now - cacheTimestamp) < CACHE_TTL) {
        return siteDataCache;
    }

    // If cache is stale but exists, return stale data and trigger background update
    if (siteDataCache && !isUpdatingCache) {
        console.log('[Cache] Returning stale cache, updating in background');
        updateCacheInBackground(); // Don't await - update in background
        return siteDataCache;
    }

    // No cache exists, wait for fresh data
    if (!siteDataCache) {
        console.log('[Cache] No cache exists, fetching fresh data');
        const data = await getSiteData();
        siteDataCache = data;
        cacheTimestamp = now;
        return data;
    }

    // Cache update in progress, return stale cache
    return siteDataCache;
}

// --- Routes ---

app.get('/', async (req, res) => {
    try {
        const { globalStats, sites } = await getCachedSiteData();
        const neo4jUrl = 'http://localhost:7474/browser/';
        res.render('index', { globalStats, sites, neo4jUrl });
    } catch (error) {
        console.error('Failed to load site data:', error);
        res.status(500).render('error', { message: 'Failed to load site data.', error });
    }
});

// API endpoint to manually trigger cache refresh
app.post('/api/refresh-cache', async (req, res) => {
    try {
        updateCacheInBackground();
        res.json({ success: true, message: 'Cache refresh triggered' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger cache refresh' });
    }
});

app.get('/api/file-content', async (req, res) => {
    const { hash, file, view } = req.query;
    if (!hash || !file || file.includes('..') || hash.includes('..')) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const filePath = path.join(DATA_DIR, hash, file);
    try {
        const content = await fs.readFile(filePath, 'utf8');

        // If raw view is requested, return plain text
        if (view === 'raw') {
            return res.json({
                type: 'text',
                content: content
            });
        }

        // Server-side parsing based on file type
        let formattedContent;
        let contentType = 'html';

        if (file === 'lib.detection.json') {
            try {
                const data = JSON.parse(content);
                formattedContent = formatLibDetectionTable(data);
            } catch (e) {
                formattedContent = `<p class="error">Error parsing library detection data: ${escapeHtml(e.message)}</p><pre>${escapeHtml(content)}</pre>`;
            }
        } else if (file === 'vuln.out') {
            formattedContent = formatVulnTable(content);
        } else if (file.endsWith('.json')) {
            formattedContent = highlightJSON(content);
        } else if (file.endsWith('.log')) {
            formattedContent = highlightLog(content);
        } else {
            // Plain text - no need to escape, textContent handles it client-side
            formattedContent = content;
            contentType = 'text';
        }

        res.json({
            type: contentType,
            content: formattedContent,
            rawContent: content,
            hasTableView: file === 'lib.detection.json' || file === 'vuln.out'
        });
    } catch (error) {
        res.status(404).json({ error: 'File not found or could not be read.' });
    }
});

app.post('/api/update-review', async (req, res) => {
    const { hash, field, value } = req.body;

    if (!hash || !field) {
        return res.status(400).json({ error: 'Missing hash or field' });
    }

    if (!['reviewed', 'vulnerable', 'memo'].includes(field)) {
        return res.status(400).json({ error: 'Invalid field' });
    }

    try {
        const reviewData = await loadReviewData();

        if (!reviewData[hash]) {
            reviewData[hash] = { reviewed: false, vulnerable: false, memo: '' };
        }

        reviewData[hash][field] = value;

        const success = await saveReviewData(reviewData);

        if (success) {
            res.json({ success: true, data: reviewData[hash] });
        } else {
            res.status(500).json({ error: 'Failed to save review data' });
        }
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/search-file-content', async (req, res) => {
    const { pattern, filePattern, isRegex, caseSensitive } = req.body;

    if (!pattern) {
        return res.status(400).json({ error: 'Missing search pattern' });
    }

    try {
        const matches = [];
        let regex;

        // Compile the search pattern
        try {
            if (isRegex) {
                regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
            } else {
                // Escape special regex chars for literal search
                const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escapedPattern, caseSensitive ? 'g' : 'gi');
            }
        } catch (err) {
            return res.status(400).json({ error: 'Invalid regex pattern: ' + err.message });
        }

        // Read all parent directories
        const parentDirs = await fs.readdir(DATA_DIR);

        // Search through all sites
        for (const parentDir of parentDirs) {
            const parentPath = path.join(DATA_DIR, parentDir);
            const parentStats = await fs.stat(parentPath).catch(() => null);
            if (!parentStats || !parentStats.isDirectory()) continue;

            const siteHashes = await fs.readdir(parentPath);

            for (const hash of siteHashes) {
                const sitePath = path.join(parentPath, hash);
                const siteStats = await fs.stat(sitePath).catch(() => null);
                if (!siteStats || !siteStats.isDirectory()) continue;

                const compositeHash = `${parentDir}/${hash}`;

                // Get files to search based on pattern
                const allFiles = await fs.readdir(sitePath);
                let filesToSearch = [];

                if (filePattern === '*.js') {
                    // Search numbered JS files only
                    filesToSearch = allFiles.filter(f => /^\d+\.js$/.test(f));
                } else if (filePattern.includes('*')) {
                    // Simple glob matching
                    const regexPattern = filePattern.replace(/\*/g, '.*').replace(/\?/g, '.');
                    const fileRegex = new RegExp(`^${regexPattern}$`);
                    filesToSearch = allFiles.filter(f => fileRegex.test(f));
                } else {
                    // Exact file name
                    if (allFiles.includes(filePattern)) {
                        filesToSearch = [filePattern];
                    }
                }

                // Search in each file
                for (const file of filesToSearch) {
                    const filePath = path.join(sitePath, file);
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        if (regex.test(content)) {
                            matches.push({
                                hash: compositeHash,
                                file: file,
                                sitePath: sitePath
                            });
                            break; // Found match in this site, move to next site
                        }
                    } catch (err) {
                        // Skip files that can't be read
                        continue;
                    }
                }
            }
        }

        res.json({ matches, count: matches.length });
    } catch (error) {
        console.error('File content search error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

app.get('/api/lib-detection-stats', async (req, res) => {
    try {
        let parentDirs = [];
        try {
            parentDirs = await fs.readdir(DATA_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.json({
                    totalDetectedLibs: 0,
                    uniqueLibs: 0,
                    sitesWithDetections: 0,
                    avgLibsPerSite: 0,
                    topLibs: [],
                    detectionMethods: {},
                    versions: {},
                    accuracyStats: { accurate: 0, inaccurate: 0 }
                });
            }
            throw err;
        }

        let totalDetectedLibs = 0;
        const libCounts = {};
        const detectionMethods = {};
        const versions = {};
        let accurateCount = 0;
        let inaccurateCount = 0;
        let sitesWithDetections = 0;

        for (const parentDir of parentDirs) {
            const parentPath = path.join(DATA_DIR, parentDir);
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) continue;

            const siteHashes = await fs.readdir(parentPath);
            for (const hash of siteHashes) {
                const sitePath = path.join(parentPath, hash);
                const siteStats = await fs.stat(sitePath);
                if (!siteStats.isDirectory()) continue;

                const libDetectionFile = path.join(sitePath, 'lib.detection.json');
                try {
                    const libContent = await fs.readFile(libDetectionFile, 'utf8');
                    const libData = JSON.parse(libContent);
                    let siteHasDetections = false;

                    // Parse lib.detection.json structure
                    for (const [url, methods] of Object.entries(libData)) {
                        for (const [method, detections] of Object.entries(methods)) {
                            if (method === 'detection' || !detections.detection) continue;

                            const detectionList = detections.detection;
                            if (Array.isArray(detectionList) && detectionList.length > 0) {
                                siteHasDetections = true;

                                // Count detection method
                                detectionMethods[method] = (detectionMethods[method] || 0) + 1;

                                // Flatten nested arrays and process each detection
                                const flatDetections = detectionList.flat();
                                flatDetections.forEach(lib => {
                                    if (!lib || !lib.libname) return;

                                    totalDetectedLibs++;
                                    const libname = lib.libname;
                                    const version = lib.version || 'unknown';

                                    // Count libraries
                                    libCounts[libname] = (libCounts[libname] || 0) + 1;

                                    // Count versions
                                    const libVersion = `${libname} v${version}`;
                                    versions[libVersion] = (versions[libVersion] || 0) + 1;

                                    // Count accuracy
                                    if (lib.accurate) {
                                        accurateCount++;
                                    } else {
                                        inaccurateCount++;
                                    }
                                });
                            }
                        }
                    }

                    if (siteHasDetections) sitesWithDetections++;
                } catch (e) {
                    // File not found or error reading
                }
            }
        }

        // Get top 15 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, count]) => ({ name, count }));

        // Get top 15 versions
        const topVersions = Object.entries(versions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, count]) => ({ name, count }));

        const avgLibsPerSite = sitesWithDetections > 0 ? (totalDetectedLibs / sitesWithDetections).toFixed(2) : 0;

        res.json({
            totalDetectedLibs,
            uniqueLibs: Object.keys(libCounts).length,
            sitesWithDetections,
            avgLibsPerSite,
            topLibs,
            detectionMethods,
            versions: topVersions,
            accuracyStats: {
                accurate: accurateCount,
                inaccurate: inaccurateCount
            }
        });
    } catch (error) {
        console.error('Error fetching library detection stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/vuln-stats', async (req, res) => {
    try {
        let parentDirs = [];
        try {
            parentDirs = await fs.readdir(DATA_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.json({
                    totalVulnLibs: 0,
                    uniqueLibs: 0,
                    sitesWithVulns: 0,
                    avgVulnsPerSite: 0,
                    topLibs: [],
                    vulnTypes: {},
                    versions: {},
                    confidenceScores: {}
                });
            }
            throw err;
        }

        let totalVulnLibs = 0;
        const libCounts = {};
        const vulnTypes = {};
        const versions = {};
        const confidenceScores = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
        let sitesWithVulns = 0;

        for (const parentDir of parentDirs) {
            const parentPath = path.join(DATA_DIR, parentDir);
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) continue;

            const siteHashes = await fs.readdir(parentPath);
            for (const hash of siteHashes) {
                const sitePath = path.join(parentPath, hash);
                const siteStats = await fs.stat(sitePath);
                if (!siteStats.isDirectory()) continue;

                const vulnFile = path.join(sitePath, 'vuln.out');
                try {
                    const vulnContent = await fs.readFile(vulnFile, 'utf8');
                    let siteHasVulns = false;

                    vulnContent.split('\n').forEach(line => {
                        if (line.trim()) {
                            try {
                                const vulnData = JSON.parse(line);
                                const urlKey = Object.keys(vulnData)[0];
                                const libraries = vulnData[urlKey];

                                if (Array.isArray(libraries) && libraries.length > 0) {
                                    siteHasVulns = true;
                                    libraries.forEach(lib => {
                                        totalVulnLibs++;
                                        const libname = lib.libname || 'unknown';
                                        const version = lib.version || 'unknown';

                                        // Count libraries
                                        libCounts[libname] = (libCounts[libname] || 0) + 1;

                                        // Count versions
                                        const libVersion = `${libname} v${version}`;
                                        versions[libVersion] = (versions[libVersion] || 0) + 1;

                                        // Process vulnerabilities
                                        if (lib.vuln && Array.isArray(lib.vuln)) {
                                            lib.vuln.forEach(vuln => {
                                                const vulnType = vuln.vulnerability_type || 'unknown';
                                                vulnTypes[vulnType] = (vulnTypes[vulnType] || 0) + 1;

                                                const confidence = vuln.confidence_score || 0;
                                                const confidencePercent = Math.round(confidence * 100);
                                                if (confidencePercent <= 25) confidenceScores['0-25']++;
                                                else if (confidencePercent <= 50) confidenceScores['26-50']++;
                                                else if (confidencePercent <= 75) confidenceScores['51-75']++;
                                                else confidenceScores['76-100']++;
                                            });
                                        }
                                    });
                                }
                            } catch (lineError) {
                                console.error('Error parsing vuln line:', lineError);
                            }
                        }
                    });

                    if (siteHasVulns) sitesWithVulns++;
                } catch (e) {
                    // File not found or error reading
                }
            }
        }

        // Get top 10 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Get top 10 versions
        const topVersions = Object.entries(versions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        const avgVulnsPerSite = sitesWithVulns > 0 ? (totalVulnLibs / sitesWithVulns).toFixed(2) : 0;

        res.json({
            totalVulnLibs,
            uniqueLibs: Object.keys(libCounts).length,
            sitesWithVulns,
            avgVulnsPerSite,
            topLibs,
            vulnTypes,
            versions: topVersions,
            confidenceScores
        });
    } catch (error) {
        console.error('Error fetching vulnerability stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`JAW4C Read-Only UI listening at http://localhost:${port}`);
    // Initialize cache in background on startup
    console.log('[Cache] Initializing cache on startup...');
    updateCacheInBackground();
});

// Periodic cache refresh (every 5 minutes)
setInterval(() => {
    if (!isUpdatingCache) {
        console.log('[Cache] Periodic cache refresh triggered');
        updateCacheInBackground();
    }
}, 5 * 60 * 1000);