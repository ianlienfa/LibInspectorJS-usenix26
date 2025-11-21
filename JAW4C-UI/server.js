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

function highlightLog(text) {
    return escapeHtml(text)
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

    const allSitesData = [];
    for (const parentDir of parentDirs) {
        const parentPath = path.join(DATA_DIR, parentDir);
        const parentStats = await fs.stat(parentPath);
        if (!parentStats.isDirectory()) continue;

        const siteHashes = await fs.readdir(parentPath);
        for (const hash of siteHashes) {
            const sitePath = path.join(parentPath, hash);
            const siteStats = await fs.stat(sitePath);
            if (!siteStats.isDirectory()) continue;

            // Capture modification time
            const modifiedTime = siteStats.mtime.getTime();

            // Read the original URL from url.out
            let siteDomain = `${parentDir}/${hash}`; // fallback
            let siteUrlPath = ''; // path component
            let originalUrl = '';
            let displayUrl = '';
            try {
                const urlContent = await fs.readFile(path.join(sitePath, 'url.out'), 'utf8');
                const rawUrl = urlContent.trim();

                // Check if this is a proxy URL with a target parameter
                try {
                    const urlObj = new URL(rawUrl);
                    const targetParam = urlObj.searchParams.get('target');
                    if (targetParam) {
                        // Decode the target parameter to get the real URL
                        displayUrl = decodeURIComponent(targetParam);
                        originalUrl = displayUrl; // Use the decoded URL as the original
                    } else {
                        displayUrl = rawUrl;
                        originalUrl = rawUrl;
                    }
                } catch (e) {
                    displayUrl = rawUrl;
                    originalUrl = rawUrl;
                }

                const formatted = formatUrlForDisplay(rawUrl);
                siteDomain = formatted.domain;
                siteUrlPath = formatted.path;
            } catch (e) {
                // If url.out doesn't exist, use the fallback
            }

            const flowsFile = path.join(sitePath, 'sink.flows.out');
            let hasFlows = false;
            let pocMatches = 0;
            try {
                const flowsContent = await fs.readFile(flowsFile, 'utf8');
                const matches = flowsContent.match(/[*]] Tags/g);
                if (matches) {
                    hasFlows = true;
                    pocMatches = matches.length;
                }
            } catch (e) { /* File not found */ }

            const vulnFile = path.join(sitePath, 'vuln.out');
            let vulnerableLibs = 0;
            try {
                const vulnContent = await fs.readFile(vulnFile, 'utf8');
                 vulnContent.split('\n').forEach(line => {
                    if (line) {
                        const vulnData = JSON.parse(line);
                        const urlKey = Object.keys(vulnData)[0];
                        vulnerableLibs += vulnData[urlKey].length;
                    }
                });
            } catch (e) { /* File not found or invalid JSON */ }

            const importantFiles = [
                'sink.flows.out', 'vuln.out', 'lib.detection.json', 'urls.out',
                'errors.log', 'warnings.log', 'info.log'
            ];

            let availableFiles = [];
            let hasLibDetection = false;
            let hasVulnOut = false;
            let hasSinkFlows = false;
            let hasErrorLog = false;
            let hasWarningLog = false;

            for (const file of importantFiles) {
                try {
                    await fs.access(path.join(sitePath, file));
                    availableFiles.push(file);

                    // Track specific files for filtering
                    if (file === 'lib.detection.json') hasLibDetection = true;
                    if (file === 'vuln.out') hasVulnOut = true;
                    if (file === 'sink.flows.out') hasSinkFlows = true;
                    if (file === 'errors.log') hasErrorLog = true;
                    if (file === 'warnings.log') hasWarningLog = true;
                } catch (e) { /* File doesn't exist */ }
            }

            const compositeHash = `${parentDir}/${hash}`;
            const review = reviewData[compositeHash] || { reviewed: false, vulnerable: false, memo: '' };

            allSitesData.push({
                hash: compositeHash, // Use a composite hash for uniqueness
                domain: siteDomain,
                urlPath: siteUrlPath,
                originalUrl,
                modifiedTime,
                hasFlows,
                pocMatches,
                vulnerableLibs,
                files: availableFiles,
                hasLibDetection,
                hasVulnOut,
                hasSinkFlows,
                hasErrorLog,
                hasWarningLog,
                reviewed: review.reviewed,
                vulnerable: review.vulnerable,
                memo: review.memo,
            });
        }
    }

    const globalStats = {
        sites: allSitesData.length,
        sitesWithFlows: allSitesData.filter(s => s.hasFlows).length,
        vulnerableLibs: allSitesData.reduce((acc, s) => acc + s.vulnerableLibs, 0),
        pocMatches: allSitesData.reduce((acc, s) => acc + s.pocMatches, 0),
    };

    return { globalStats, sites: allSitesData };
}

// --- Routes ---

app.get('/', async (req, res) => {
    try {
        const { globalStats, sites } = await getSiteData();
        const neo4jUrl = 'http://localhost:7474/browser/';
        res.render('index', { globalStats, sites, neo4jUrl });
    } catch (error) {
        console.error('Failed to load site data:', error);
        res.status(500).render('error', { message: 'Failed to load site data.', error });
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

app.listen(port, () => {
    console.log(`JAW4C Read-Only UI listening at http://localhost:${port}`);
});