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
const APP_DIR = path.resolve(__dirname, '.');
const DATA_DIR = path.join(JAW4C_DIR, 'JAW4C-JAW', 'data');
const CACHE_DIR = path.join(APP_DIR, 'site-cache');
const REVIEW_FILE = path.join(DATA_DIR, 'review', 'review.json');

// --- Cache Management ---
const CACHE_TTL = 30000; // 30 seconds cache
let siteDataCache = null;
let cacheTimestamp = 0;
let isUpdatingCache = false;

// --- File System Cache Layer ---
// Cache statistics for monitoring
const cacheStats = {
    hits: 0,
    misses: 0,
    updates: 0,
    errors: 0,
    totalReadTime: 0,
    totalCacheTime: 0
};

// Ensure cache directory exists
async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        console.log('[FileCache] Cache directory ready:', CACHE_DIR);
    } catch (e) {
        console.error('[FileCache] Failed to create cache directory:', e);
    }
}

// Get relative path from DATA_DIR
function getRelativePath(absolutePath) {
    return path.relative(DATA_DIR, absolutePath);
}

// Get cached file path
function getCachedPath(dataFilePath) {
    const relativePath = getRelativePath(dataFilePath);
    return path.join(CACHE_DIR, relativePath);
}

// Check if cache is valid (exists and is newer than source)
async function isCacheValid(sourcePath, cachePath) {
    try {
        const [sourceStats, cacheFileStats] = await Promise.all([
            fs.stat(sourcePath),
            fs.stat(cachePath)
        ]);

        // Cache is valid if it exists and is newer than or equal to source
        return cacheFileStats.mtime.getTime() >= sourceStats.mtime.getTime();
    } catch (e) {
        // If either file doesn't exist or error occurs, cache is invalid
        return false;
    }
}

// Copy file to cache with directory structure
async function copyToCache(sourcePath, cachePath) {
    const startTime = Date.now();
    try {
        // Ensure cache directory exists
        const cacheDir = path.dirname(cachePath);
        await fs.mkdir(cacheDir, { recursive: true });

        // Copy file
        await fs.copyFile(sourcePath, cachePath);

        // Preserve modification time
        const sourceStats = await fs.stat(sourcePath);
        await fs.utimes(cachePath, sourceStats.atime, sourceStats.mtime);

        cacheStats.updates++;
        const duration = Date.now() - startTime;
        cacheStats.totalCacheTime += duration;

        console.log(`[FileCache] Cached: ${getRelativePath(sourcePath)} (${duration}ms)`);
    } catch (e) {
        if(!(e.message.toLowerCase().includes('no such file or directory'))) {
            cacheStats.errors++;
            console.error(`[FileCache] Error caching ${getRelativePath(sourcePath)}:`, e);
            throw e;
        }
    }
}

// Cached fs.readFile - reads from cache if available and valid, otherwise updates cache
async function cachedReadFile(filePath, encoding = 'utf8') {
    const startTime = Date.now();
    const cachePath = getCachedPath(filePath);
    try {
        // Check if cache is valid
        const isValid = await isCacheValid(filePath, cachePath);

        if (isValid) {
            // Read from cache
            const content = await fs.readFile(cachePath, encoding);
            cacheStats.hits++;
            cacheStats.totalReadTime += (Date.now() - startTime);
            return content;
        } else {
            // Cache miss or outdated - update cache then read
            cacheStats.misses++;
            await copyToCache(filePath, cachePath);
            const content = await fs.readFile(cachePath, encoding);
            cacheStats.totalReadTime += (Date.now() - startTime);
            return content;
        }
    } catch (e) {
        // If caching fails, fall back to reading directly from source
        if(!(e.message.toLowerCase().includes('no such file or directory'))){
            cacheStats.errors++;
            console.warn(`[FileCache] Error with cached read, falling back to direct: ${e.message}`);
            const content = await fs.readFile(filePath, encoding);
            cacheStats.totalReadTime += (Date.now() - startTime);
            return content;
        }
        else{
            return '';
        }
    }
}

// Cached fs.stat - checks cache first, updates if needed
async function cachedStat(filePath) {
    const startTime = Date.now();
    const cachePath = getCachedPath(filePath);

    try {
        // First, get source stats (we need this anyway to check cache validity)
        const sourceStats = await fs.stat(filePath);

        // Try to get cache stats
        try {
            const cacheFileStats = await fs.stat(cachePath);

            // If cache exists and is up-to-date, return source stats but count as hit
            if (cacheFileStats.mtime.getTime() >= sourceStats.mtime.getTime()) {
                cacheStats.hits++;
                cacheStats.totalReadTime += (Date.now() - startTime);
                return sourceStats;
            }
        } catch (e) {
            // Cache doesn't exist, will be created on actual read
        }

        // Cache miss - return source stats
        cacheStats.misses++;
        cacheStats.totalReadTime += (Date.now() - startTime);
        return sourceStats;
    } catch (e) {
        cacheStats.errors++;
        cacheStats.totalReadTime += (Date.now() - startTime);
        throw e;
    }
}

// Print cache statistics
function logCacheStats() {
    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;

    console.log('[FileCache] Stats:', {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        updates: cacheStats.updates,
        errors: cacheStats.errors,
        hitRate: `${hitRate}%`,
        avgReadTime: total > 0 ? `${(cacheStats.totalReadTime / total).toFixed(2)}ms` : '0ms',
        avgCacheTime: cacheStats.updates > 0 ? `${(cacheStats.totalCacheTime / cacheStats.updates).toFixed(2)}ms` : '0ms'
    });
}

// Reset cache statistics
function resetCacheStats() {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.updates = 0;
    cacheStats.errors = 0;
    cacheStats.totalReadTime = 0;
    cacheStats.totalCacheTime = 0;
}

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
            console.warn('⚠️ WARNING: Review file is empty! Returning empty object without overwriting file.');
            // DO NOT overwrite the file - just return empty object
            // This prevents data loss from temporary file corruption or race conditions
            return {};
        }

        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('❌ ERROR: Failed to parse review.json. File may be corrupted.');
            console.error('Parse error:', parseError);
            console.error('File content:', content.substring(0, 500));
            // Return empty object but DO NOT overwrite the corrupted file
            // This allows manual recovery of the file
            return {};
        }
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
        // CRITICAL SAFEGUARD: Never save empty data if existing file has data
        let existingData = {};
        try {
            const existingContent = await fs.readFile(REVIEW_FILE, 'utf8');
            if (existingContent && existingContent.trim()) {
                existingData = JSON.parse(existingContent);
            }
        } catch (e) {
            // File doesn't exist or is unreadable - OK to proceed
        }

        // Check if we're trying to save empty data when existing file has data
        const newDataIsEmpty = !reviewData || Object.keys(reviewData).length === 0;
        const existingDataHasContent = Object.keys(existingData).length > 0;

        if (newDataIsEmpty && existingDataHasContent) {
            console.error('❌ CRITICAL ERROR: Attempted to overwrite review.json with empty data!');
            console.error('Existing data has', Object.keys(existingData).length, 'entries.');
            console.error('This operation has been BLOCKED to prevent data loss.');
            return false;
        }

        // Create backup before writing (keep last 3 backups)
        try {
            const backupFile = `${REVIEW_FILE}.backup.${Date.now()}`;
            if (existingDataHasContent) {
                await fs.copyFile(REVIEW_FILE, backupFile);
                console.log('Created backup:', backupFile);

                // Clean up old backups (keep only last 3)
                const backupDir = path.dirname(REVIEW_FILE);
                const files = await fs.readdir(backupDir);
                const backups = files
                    .filter(f => f.startsWith('review.json.backup.'))
                    .map(f => ({ name: f, path: path.join(backupDir, f), time: parseInt(f.split('.').pop()) }))
                    .sort((a, b) => b.time - a.time);

                // Delete backups beyond the 3 most recent
                for (let i = 3; i < backups.length; i++) {
                    await fs.unlink(backups[i].path);
                    console.log('Deleted old backup:', backups[i].name);
                }
            }
        } catch (backupError) {
            console.warn('Warning: Failed to create backup:', backupError.message);
            // Continue anyway - backup failure shouldn't block the save
        }

        // Use atomic write: write to temp file first, then rename
        const tempFile = `${REVIEW_FILE}.tmp`;
        const jsonContent = JSON.stringify(reviewData, null, 2);

        // Validate JSON before writing
        if (!jsonContent || jsonContent.trim() === '' || jsonContent === '{}') {
            console.warn('Warning: Attempting to save empty or minimal JSON content');
        }

        await fs.writeFile(tempFile, jsonContent, 'utf8');

        // Atomic rename
        await fs.rename(tempFile, REVIEW_FILE);

        console.log('✅ Successfully saved review data with', Object.keys(reviewData).length, 'entries');
        return true;
    } catch (error) {
        console.error('Error saving review data:', error);
        return false;
    }
}

// --- Data Fetching and Processing ---

// Batch file reading with concurrency limit - now uses cached reads
async function batchReadFiles(filePaths, concurrency = 10) {
    const results = new Map();
    const queue = [...filePaths];

    async function processFile() {
        while (queue.length > 0) {
            const { key, path: filePath } = queue.shift();
            try {
                const content = await cachedReadFile(filePath, 'utf8');
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
    const overallStartTime = Date.now();

    let parentDirs = [];
    try {
        parentDirs = await fs.readdir(DATA_DIR);
        console.log(`[getSiteData] Found ${parentDirs.length} parent directories`);
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
    const collectStartTime = Date.now();
    const sitePathsPromises = parentDirs.map(async (parentDir) => {
        const parentPath = path.join(DATA_DIR, parentDir);
        const parentStartTime = Date.now();
        try {
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) return [];

            const siteHashes = await fs.readdir(parentPath);
            const validSites = await Promise.all(
                siteHashes.map(async (hash) => {
                    const sitePath = path.join(parentPath, hash);
                    try {
                        const siteStats = await cachedStat(sitePath);
                        if (siteStats.isDirectory()) {
                            return { parentDir, hash, sitePath, modifiedTime: siteStats.mtime.getTime() };
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                })
            );
            const filtered = validSites.filter(s => s !== null);
            return filtered;
        } catch (e) {
            return [];
        }
    });

    const sitePaths = (await Promise.all(sitePathsPromises)).flat();
    console.log(`[getSiteData] Collected ${sitePaths.length} site paths (${Date.now() - collectStartTime}ms)`);

    // Prepare batch file reading for all sites
    const filesToRead = [];
    sitePaths.forEach(({ sitePath, parentDir, hash }) => {
        const compositeHash = `${parentDir}/${hash}`;
        filesToRead.push({ key: `${compositeHash}:url`, path: path.join(sitePath, 'url.out') });
        filesToRead.push({ key: `${compositeHash}:flows`, path: path.join(sitePath, 'sink.flows.out') });
        filesToRead.push({ key: `${compositeHash}:vuln`, path: path.join(sitePath, 'vuln.out') });
    });

    // Batch read all files
    const batchReadStartTime = Date.now();
    console.log(`[getSiteData] Batch reading ${filesToRead.length} files...`);
    const fileContents = await batchReadFiles(filesToRead, 20);
    console.log(`[getSiteData] Batch read complete (${Date.now() - batchReadStartTime}ms)`);

    // Process each site with cached file contents
    const processStartTime = Date.now();
    console.log(`[getSiteData] Processing ${sitePaths.length} sites...`);
    const allSitesData = await Promise.all(
        sitePaths.map(async ({ parentDir, hash, sitePath, modifiedTime }) => {
            const siteStart = Date.now();
            const compositeHash = `${parentDir}/${hash}`;
            const timings = {};

            // Process URL
            const urlStart = Date.now();
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
            timings.url = Date.now() - urlStart;

            // Process flows
            const flowsStart = Date.now();
            let hasFlows = false;
            let pocMatches = 0;
            const tagCounts = {};
            const flowsContent = fileContents.get(`${compositeHash}:flows`);
            if (flowsContent) {
                // Split flows by the separator pattern and filter out NON-REACH flows
                const flowEntries = flowsContent.split(/(?=\[\*\] Tags:)/);

                // Count tags from all flow entries
                flowEntries.forEach(entry => {
                    const tagsMatch = entry.match(/\[\*\] Tags:\s*\[([^\]]*)\]/);
                    if (tagsMatch) {
                        const tagsStr = tagsMatch[1];
                        // Extract individual tags by splitting on comma and cleaning quotes
                        const tags = tagsStr.split(',').map(tag =>
                            tag.trim().replace(/['"]/g, '')
                        ).filter(tag => tag.length > 0);

                        // Count each tag
                        tags.forEach(tag => {
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        });
                    }
                });

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
            timings.flows = Date.now() - flowsStart;

            // Process vulnerabilities
            const vulnStart = Date.now();
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
            timings.vuln = Date.now() - vulnStart;

            // Read directory once and reuse for all file checks (optimization)
            const readdirStart = Date.now();
            let allFiles = [];
            try {
                allFiles = await fs.readdir(sitePath);
            } catch (e) {
                // Directory read error
                allFiles = [];
            }
            timings.readdir = Date.now() - readdirStart;

            // Check file existence using the directory listing (no extra I/O needed)
            const fileCheckStart = Date.now();
            const importantFiles = [
                'sink.flows.out', 'vuln.out', 'lib.detection.json', 'urls.out',
                'errors.log', 'warnings.log', 'info.log'
            ];
            const fileSet = new Set(allFiles);
            const fileExistenceChecks = importantFiles.filter(file => fileSet.has(file));
            timings.fileExistence = Date.now() - fileCheckStart;

            // Check errors.log file size to only show non-empty files
            const errorLogStart = Date.now();
            let hasErrorLog = false;
            try {
                const errorLogPath = path.join(sitePath, 'errors.log');
                const errorLogStats = await cachedStat(errorLogPath);
                hasErrorLog = errorLogStats.size > 0;
            } catch (e) {
                // File doesn't exist or can't be accessed
                hasErrorLog = false;
            }
            timings.errorLog = Date.now() - errorLogStart;

            // Collect numbered JS files using the same directory listing
            const jsFilesStart = Date.now();
            const jsFiles = allFiles
                .filter(file => /^\d+\.js$/.test(file)) // Only [num].js files
                .sort((a, b) => {
                    const numA = parseInt(a.match(/^(\d+)\.js$/)[1]);
                    const numB = parseInt(b.match(/^(\d+)\.js$/)[1]);
                    return numA - numB;
                });
            timings.jsFiles = Date.now() - jsFilesStart;

            const availableFiles = fileExistenceChecks; // Already filtered by Set lookup
            const hasLibDetection = availableFiles.includes('lib.detection.json');
            const hasSinkFlows = availableFiles.includes('sink.flows.out');
            const hasWarningLog = availableFiles.includes('warnings.log');

            const review = reviewData[compositeHash] || { reviewed: false, vulnerable: false, memo: '' };

            const totalSiteTime = Date.now() - siteStart;
            if (totalSiteTime > 10) { // Only log if processing took more than 10ms
                console.log(`[Site ${compositeHash}] ${totalSiteTime}ms total - url:${timings.url}ms flows:${timings.flows}ms vuln:${timings.vuln}ms readdir:${timings.readdir}ms fileCheck:${timings.fileExistence}ms errorLog:${timings.errorLog}ms jsFiles:${timings.jsFiles}ms`);
            }

            return {
                hash: compositeHash,
                domain: siteDomain,
                urlPath: siteUrlPath,
                originalUrl,
                modifiedTime,
                hasFlows,
                pocMatches,
                tagCounts,
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
    const processingDuration = Date.now() - processStartTime;
    console.log(`[getSiteData] Site processing complete (${processingDuration}ms, avg: ${(processingDuration / sitePaths.length).toFixed(2)}ms per site)`);

    // Sort sites by modified time (newest first) BEFORE returning
    // This ensures paginated batches are in the correct order
    // e.g., sites[0-50] = newest 50, sites[50-100] = next newest 50, etc.
    allSitesData.sort((a, b) => b.modifiedTime - a.modifiedTime);

    // Filter out localhost domains for global statistics
    const nonLocalHostSites = allSitesData.filter(s => !s.domain.toLowerCase().includes('localhost'));

    const globalStats = {
        sites: nonLocalHostSites.length,
        sitesWithFlows: nonLocalHostSites.filter(s => s.hasFlows).length,
        vulnerableLibs: nonLocalHostSites.reduce((acc, s) => acc + s.vulnerableLibs, 0),
        pocMatches: nonLocalHostSites.reduce((acc, s) => acc + s.pocMatches, 0),
    };

    const totalTime = Date.now() - overallStartTime;
    console.log(`[getSiteData] Complete: ${allSitesData.length} sites in ${totalTime}ms`);
    logCacheStats();

    return { globalStats, sites: allSitesData };
}

// Background cache update function
async function updateCacheInBackground() {
    if (isUpdatingCache) {
        console.log('[Cache] Update already in progress, skipping');
        return;
    }

    isUpdatingCache = true;
    const startTime = Date.now();
    console.log('[Cache] 🔄 Starting background cache update...');

    try {
        const data = await getSiteData();
        siteDataCache = data;
        cacheTimestamp = Date.now();
        const duration = Date.now() - startTime;
        console.log(`[Cache] ✅ Cache ready! ${data.sites.length} sites loaded in ${(duration / 1000).toFixed(2)}s`);
    } catch (error) {
        console.error('[Cache] ❌ Error updating cache:', error);
    } finally {
        isUpdatingCache = false;
    }
}

// Get cached or fresh data
async function getCachedSiteData() {
    // If cache exists, return it immediately
    if (siteDataCache) {
        return siteDataCache;
    }

    // If cache is being built, return empty data (don't block the UI)
    if (isUpdatingCache) {
        console.log('[Cache] Cache still building, returning empty data');
        return {
            globalStats: { sites: 0, sitesWithFlows: 0, vulnerableLibs: 0, pocMatches: 0 },
            sites: [],
            loading: true
        };
    }

    // No cache and not updating - trigger background update and return empty data
    console.log('[Cache] No cache exists, triggering background update');
    updateCacheInBackground(); // Don't await - let it run in background
    return {
        globalStats: { sites: 0, sitesWithFlows: 0, vulnerableLibs: 0, pocMatches: 0 },
        sites: [],
        loading: true
    };
}

// --- Routes ---

app.get('/', async (req, res) => {
    try {
        const { globalStats } = await getCachedSiteData();
        const neo4jUrl = 'http://localhost:7474/browser/';
        // Don't pass sites to template - they'll be loaded dynamically
        res.render('index', { globalStats, sites: [], neo4jUrl, totalSites: globalStats.sites });
    } catch (error) {
        console.error('Failed to load site data:', error);
        res.status(500).render('error', { message: 'Failed to load site data.', error });
    }
});

// API endpoint to check cache status
app.get('/api/cache-status', (req, res) => {
    res.json({
        ready: siteDataCache !== null,
        loading: isUpdatingCache,
        timestamp: cacheTimestamp,
        siteCount: siteDataCache ? siteDataCache.sites.length : 0
    });
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

// API endpoint to get file cache statistics
app.get('/api/cache-stats', (req, res) => {
    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;

    res.json({
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        updates: cacheStats.updates,
        errors: cacheStats.errors,
        hitRate: parseFloat(hitRate),
        avgReadTime: total > 0 ? parseFloat((cacheStats.totalReadTime / total).toFixed(2)) : 0,
        avgCacheTime: cacheStats.updates > 0 ? parseFloat((cacheStats.totalCacheTime / cacheStats.updates).toFixed(2)) : 0,
        cacheDir: CACHE_DIR
    });
});

// API endpoint to clear file cache
app.post('/api/clear-cache', async (req, res) => {
    try {
        const rimraf = require('fs').promises;
        await rimraf.rm(CACHE_DIR, { recursive: true, force: true });
        await ensureCacheDir();
        resetCacheStats();
        console.log('[FileCache] Cache cleared and reset');
        res.json({ success: true, message: 'File cache cleared' });
    } catch (error) {
        console.error('[FileCache] Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// API endpoint for paginated sites
app.get('/api/sites', async (req, res) => {
    try {
        const { offset = 0, limit = 50 } = req.query;
        const offsetNum = parseInt(offset, 10);
        const limitNum = parseInt(limit, 10);

        if (isNaN(offsetNum) || isNaN(limitNum) || offsetNum < 0 || limitNum <= 0 || limitNum > 200) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        const data = await getCachedSiteData();
        const { sites, loading } = data;

        // Apply pagination
        const paginatedSites = sites.slice(offsetNum, offsetNum + limitNum);

        res.json({
            sites: paginatedSites,
            total: sites.length,
            offset: offsetNum,
            limit: limitNum,
            hasMore: offsetNum + limitNum < sites.length,
            loading: loading || false
        });
    } catch (error) {
        console.error('Error fetching paginated sites:', error);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});

// File size threshold for chunked loading (1MB)
const CHUNK_SIZE_THRESHOLD = 1024 * 1024;

// Get file info (size, etc.) before loading
app.get('/api/file-info', async (req, res) => {
    const { hash, file } = req.query;
    if (!hash || !file || file.includes('..') || hash.includes('..')) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const filePath = path.join(DATA_DIR, hash, file);
    try {
        const stats = await cachedStat(filePath);
        res.json({
            size: stats.size,
            shouldChunk: stats.size > CHUNK_SIZE_THRESHOLD,
            chunkSize: 64 * 1024, // 64KB chunks for streaming
        });
    } catch (error) {
        res.status(404).json({ error: 'File not found.' });
    }
});

// Chunked file streaming for large files
app.get('/api/file-stream', async (req, res) => {
    const { hash, file } = req.query;
    if (!hash || !file || file.includes('..') || hash.includes('..')) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const filePath = path.join(DATA_DIR, hash, file);
    try {
        // Get cached file path
        const cachePath = getCachedPath(filePath);

        // Ensure file is cached before streaming
        const isValid = await isCacheValid(filePath, cachePath);
        if (!isValid) {
            console.log(`[FileStream] Caching ${file} before streaming...`);
            await copyToCache(filePath, cachePath);
        }

        // Get stats from cached file
        const stats = await fs.stat(cachePath);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('X-File-Size', stats.size);

        // Stream file from cache (fast local disk instead of network storage)
        const readableStream = require('fs').createReadStream(cachePath, {
            encoding: 'utf8',
            highWaterMark: 64 * 1024 // 64KB chunks
        });

        readableStream.pipe(res);

        readableStream.on('error', (error) => {
            console.error('[FileStream] Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file.' });
            }
        });
    } catch (error) {
        console.error('[FileStream] Error:', error);
        res.status(404).json({ error: 'File not found.' });
    }
});

app.get('/api/file-content', async (req, res) => {
    const { hash, file, view } = req.query;
    if (!hash || !file || file.includes('..') || hash.includes('..')) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const filePath = path.join(DATA_DIR, hash, file);
    try {
        // Check file size first
        const stats = await cachedStat(filePath);

        // For very large files, suggest using streaming endpoint
        if (stats.size > CHUNK_SIZE_THRESHOLD && !view) {
            return res.json({
                type: 'large-file',
                size: stats.size,
                shouldStream: true,
                message: 'File is too large, use streaming endpoint'
            });
        }

        const content = await cachedReadFile(filePath, 'utf8');

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
                        const content = await cachedReadFile(filePath, 'utf-8');
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

                // Check domain and skip localhost
                let siteDomain = '';
                const urlFile = path.join(sitePath, 'url.out');
                try {
                    const urlContent = await cachedReadFile(urlFile, 'utf8');
                    const rawUrl = urlContent.trim();
                    const formatted = formatUrlForDisplay(rawUrl);
                    siteDomain = formatted.domain;
                    if (siteDomain.toLowerCase().includes('localhost')) {
                        continue; // Skip localhost domains
                    }
                } catch (e) {
                    // If can't read url.out, skip this site
                    continue;
                }

                const libDetectionFile = path.join(sitePath, 'lib.detection.json');
                try {
                    const libContent = await cachedReadFile(libDetectionFile, 'utf8');
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

app.get('/api/tag-stats', async (req, res) => {
    try {
        let parentDirs = [];
        try {
            parentDirs = await fs.readdir(DATA_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.json({
                    totalTags: 0,
                    uniqueTags: 0,
                    sitesWithTags: 0,
                    avgTagsPerSite: 0,
                    tagCounts: {},
                    topTags: []
                });
            }
            throw err;
        }

        let totalTags = 0;
        const globalTagCounts = {};
        let sitesWithTags = 0;

        // Iterate through all sites
        for (const parentDir of parentDirs) {
            const parentPath = path.join(DATA_DIR, parentDir);
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) continue;

            const siteHashes = await fs.readdir(parentPath);
            for (const hash of siteHashes) {
                const sitePath = path.join(parentPath, hash);
                const siteStats = await fs.stat(sitePath);
                if (!siteStats.isDirectory()) continue;

                // Check domain and skip localhost
                let siteDomain = '';
                const urlFile = path.join(sitePath, 'url.out');
                try {
                    const urlContent = await cachedReadFile(urlFile, 'utf8');
                    const rawUrl = urlContent.trim();
                    const formatted = formatUrlForDisplay(rawUrl);
                    siteDomain = formatted.domain;
                    if (siteDomain.toLowerCase().includes('localhost')) {
                        continue; // Skip localhost domains
                    }
                } catch (e) {
                    // If can't read url.out, skip this site
                    continue;
                }

                const flowsFile = path.join(sitePath, 'sink.flows.out');
                try {
                    const flowsContent = await cachedReadFile(flowsFile, 'utf8');
                    const flowEntries = flowsContent.split(/(?=\[\*\] Tags:)/);
                    let siteHasTags = false;

                    flowEntries.forEach(entry => {
                        const tagsMatch = entry.match(/\[\*\] Tags:\s*\[([^\]]*)\]/);
                        if (tagsMatch) {
                            const tagsStr = tagsMatch[1];
                            const tags = tagsStr.split(',').map(tag =>
                                tag.trim().replace(/['"]/g, '')
                            ).filter(tag => tag.length > 0);

                            tags.forEach(tag => {
                                globalTagCounts[tag] = (globalTagCounts[tag] || 0) + 1;
                                totalTags++;
                            });

                            if (tags.length > 0) siteHasTags = true;
                        }
                    });

                    if (siteHasTags) sitesWithTags++;
                } catch (e) {
                    // File not found or error reading
                }
            }
        }

        // Get top tags sorted by count
        const topTags = Object.entries(globalTagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        const avgTagsPerSite = sitesWithTags > 0
            ? (totalTags / sitesWithTags).toFixed(2)
            : 0;

        res.json({
            totalTags,
            uniqueTags: Object.keys(globalTagCounts).length,
            sitesWithTags,
            avgTagsPerSite,
            tagCounts: globalTagCounts,
            topTags
        });
    } catch (error) {
        console.error('Error fetching tag stats:', error);
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

                // Check domain and skip localhost
                let siteDomain = '';
                const urlFile = path.join(sitePath, 'url.out');
                try {
                    const urlContent = await cachedReadFile(urlFile, 'utf8');
                    const rawUrl = urlContent.trim();
                    const formatted = formatUrlForDisplay(rawUrl);
                    siteDomain = formatted.domain;
                    if (siteDomain.toLowerCase().includes('localhost')) {
                        continue; // Skip localhost domains
                    }
                } catch (e) {
                    // If can't read url.out, skip this site
                    continue;
                }

                const vulnFile = path.join(sitePath, 'vuln.out');
                try {
                    const vulnContent = await cachedReadFile(vulnFile, 'utf8');
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

        // Get top 20 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
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

// API endpoint for detected libraries statistics
app.get('/api/detected-libs', async (req, res) => {
    try {
        let parentDirs = [];
        try {
            parentDirs = await fs.readdir(DATA_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.json({
                    totalDetectedLibs: 0,
                    topLibs: []
                });
            }
            throw err;
        }

        const libCounts = {};

        for (const parentDir of parentDirs) {
            const parentPath = path.join(DATA_DIR, parentDir);
            const parentStats = await fs.stat(parentPath);
            if (!parentStats.isDirectory()) continue;

            const siteHashes = await fs.readdir(parentPath);
            for (const hash of siteHashes) {
                const sitePath = path.join(parentPath, hash);
                const siteStats = await fs.stat(sitePath);
                if (!siteStats.isDirectory()) continue;

                // Check domain and skip localhost
                let siteDomain = '';
                const urlFile = path.join(sitePath, 'url.out');
                try {
                    const urlContent = await cachedReadFile(urlFile, 'utf8');
                    const rawUrl = urlContent.trim();
                    const formatted = formatUrlForDisplay(rawUrl);
                    siteDomain = formatted.domain;
                    if (siteDomain.toLowerCase().includes('localhost')) {
                        continue; // Skip localhost domains
                    }
                } catch (e) {
                    // If can't read url.out, skip this site
                    continue;
                }

                const libDetectionFile = path.join(sitePath, 'lib.detection.json');
                try {
                    const libDetectionContent = await cachedReadFile(libDetectionFile, 'utf8');

                    try {
                        const detectionData = JSON.parse(libDetectionContent);

                        // Iterate through each URL in the detection file
                        for (const urlKey in detectionData) {
                            const urlData = detectionData[urlKey];

                            // Create a set to track unique libraries detected in this file
                            const uniqueLibsInFile = new Set();

                            // Check each detector: DEBUN, PTV-Original, PTV
                            const detectors = ['DEBUN', 'PTV-Original', 'PTV'];

                            detectors.forEach(detector => {
                                if (urlData[detector] && urlData[detector].detection && Array.isArray(urlData[detector].detection)) {
                                    urlData[detector].detection.forEach(detectionArray => {
                                        if (Array.isArray(detectionArray)) {
                                            detectionArray.forEach(lib => {
                                                if (lib.libname) {
                                                    uniqueLibsInFile.add(lib.libname);
                                                }
                                            });
                                        }
                                    });
                                }
                            });

                            // Now count each unique library from this file
                            uniqueLibsInFile.forEach(libname => {
                                libCounts[libname] = (libCounts[libname] || 0) + 1;
                            });
                        }
                    } catch (parseError) {
                        console.error('Error parsing lib.detection.json:', parseError);
                    }
                } catch (e) {
                    // File not found or error reading
                }
            }
        }

        // Get top 20 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100)
            .map(([name, count]) => ({ name, count }));

        // Calculate total detected libs (sum of all counts)
        const totalDetectedLibs = topLibs.reduce((sum, lib) => sum + lib.count, 0);

        res.json({
            totalDetectedLibs,
            topLibs
        });
    } catch (error) {
        console.error('Error fetching detected libraries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, async () => {
    console.log(`JAW4C Read-Only UI listening at http://localhost:${port}`);
    console.log('UI is ready - cache will load in the background');

    // Initialize file cache directory
    await ensureCacheDir();

    // Initialize site data cache in background (non-blocking)
    // UI will show empty data until cache is ready
    // Use GET /api/cache-status to check when cache is loaded
    updateCacheInBackground();
});

// Periodic cache refresh (every 1 hour)
setInterval(() => {
    if (!isUpdatingCache) {
        console.log('[Cache] Hourly cache refresh triggered');
        updateCacheInBackground();
    }
}, 60 * 60 * 1000); // 1 hour = 3600000 ms

// Periodic file cache statistics logging (every 30 seconds)
setInterval(() => {
    const total = cacheStats.hits + cacheStats.misses;
    if (total > 0) {
        logCacheStats();
        // Reset stats after logging to keep them fresh
        resetCacheStats();
    }
}, 60 * 10 * 1000);
