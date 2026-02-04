const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

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
const TRANCO_FILE = path.join(APP_DIR, 'tranco_NN23W.csv');
const LIB_MAPPING_FILE = path.join(APP_DIR, 'lib_mapping.json');
const SITE_STABLED = true;
const STAT_FILE = path.join(CACHE_DIR, 'stat.json');

// POC stats cache (cleared on refresh or server restart)
const pocMatchStatsCache = {
    all: null,
    withFlows: null
};

function clearPocMatchStatsCache() {
    pocMatchStatsCache.all = null;
    pocMatchStatsCache.withFlows = null;
}

// --- Domain Ranking Data (loaded once at startup) ---
let domainRankMap = new Map(); // Map domain -> rank for fast lookup
let libMappingCache = null;
let libMappingLoadPromise = null;

async function loadLibMapping() {
    if (libMappingCache) return libMappingCache;
    if (libMappingLoadPromise) return libMappingLoadPromise;
    libMappingLoadPromise = (async () => {
        try {
            const raw = await fs.readFile(LIB_MAPPING_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            const normalized = {};
            Object.entries(parsed || {}).forEach(([key, aliases]) => {
                const normKey = String(key || '').trim().toLowerCase();
                if (!normKey) return;
                const aliasList = Array.isArray(aliases) ? aliases : [];
                normalized[normKey] = aliasList.map(a => String(a || '').trim()).filter(Boolean);
            });
            libMappingCache = normalized;
            return libMappingCache;
        } catch (error) {
            console.warn('[LibMapping] Failed to load lib_mapping.json:', error.message);
            libMappingCache = {};
            return libMappingCache;
        } finally {
            libMappingLoadPromise = null;
        }
    })();
    return libMappingLoadPromise;
}

// Load Tranco CSV and build domain-to-rank map
async function loadRankingData() {
    try {
        const content = await fs.readFile(TRANCO_FILE, 'utf8');
        const lines = content.trim().split('\n');

        domainRankMap.clear();
        console.log(`[Ranking] Loading Tranco ranking data from ${TRANCO_FILE}...`);
        for (const line of lines) {
            const [rankStr, domain] = line.split(',');
            if (rankStr && domain) {
                const rank = parseInt(rankStr, 10);
                const domainLower = domain.trim().toLowerCase();
                if (!isNaN(rank) && domainLower) {
                    domainRankMap.set(domainLower, rank);
                }
            }
        }

        console.log(`[Ranking] Loaded ${domainRankMap.size} domains from Tranco list`);
    } catch (error) {
        console.error('[Ranking] Failed to load tranco_NN23W.csv:', error.message);
        domainRankMap.clear();
    }
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const trimmed = String(url || '').trim();
        if (!trimmed) return null;

        const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
        const urlObj = new URL(hasScheme ? trimmed : `http://${trimmed}`);
        const targetParam = urlObj.searchParams.get('target');

        let actualUrl = trimmed;
        if (targetParam) {
            let decoded = targetParam;
            try {
                decoded = decodeURIComponent(targetParam);
            } catch (e) {
                decoded = targetParam;
            }

            if (/^(https?:)?\/\//i.test(decoded)) {
                actualUrl = decoded;
            }
        }

        const actualHasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(actualUrl);
        const actualUrlObj = new URL(actualHasScheme ? actualUrl : `http://${actualUrl}`);

        let hostname = actualUrlObj.hostname.toLowerCase().replace(/\.$/, '');
        if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4);
        }
        return hostname || null;
    } catch (e) {
        return null;
    }
}

// Get ranking for a given URL (returns rank or null if not found)
function getRankingForUrl(url) {
    const domain = extractDomain(url);
    if (!domain) return null;

    // Remove www. prefix if present
    const domainWithoutWww = domain.startsWith('www.') ? domain.slice(4) : domain;

    // Direct lookup first
    if (domainRankMap.has(domainWithoutWww)) {
        return domainRankMap.get(domainWithoutWww);
    }

    // Try progressively shorter domain suffixes to find base domain
    // e.g., store.google.com → google.com → com
    const parts = domainWithoutWww.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
        const suffix = parts.slice(i).join('.');
        if (domainRankMap.has(suffix)) {
            return domainRankMap.get(suffix);
        }
    }

    return null;
}

// --- Cache Management ---
const CACHE_TTL = 30000; // 30 seconds cache
let siteDataCache = null;
let cacheTimestamp = 0;
let isUpdatingCache = false;
const FILE_READ_CONCURRENCY = parseInt(process.env.FILE_READ_CONCURRENCY || '40', 10);
const dirStatCache = new Map();
const dirReaddirCache = new Map();
const INDEX_CACHE_DIR = path.join(CACHE_DIR, 'index');
const indexStats = { hits: 0, misses: 0 };
let bucketSiteCounts = {};

// --- File System Cache Layer ---
// Cache statistics for monitoring
const cacheStats = {
    hits: 0,
    misses: 0,
    fileReadHits: 0,
    fileReadMisses: 0,
    statHits: 0,
    statMisses: 0,
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

function clearDirCaches() {
    dirStatCache.clear();
    dirReaddirCache.clear();
}

async function readStatCache() {
    try {
        const raw = await fs.readFile(STAT_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

async function writeStatCache(stats) {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(STAT_FILE, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
        // Non-fatal: skip cache write on error
    }
}

function computePocStatusSummary(reviewData) {
    const counts = {
        vulnerableFunc: { true: 0, false: 0 },
        pocMatch: { true: 0, false: 0 },
        dataflow: { true: 0, false: 0 }
    };

    Object.values(reviewData || {}).forEach(site => {
        const notes = site.pocNotes || {};
        Object.values(notes).forEach(entry => {
            const status = entry.status || {};
            Object.keys(counts).forEach(key => {
                if (status[key] === 'true') counts[key].true += 1;
                else if (status[key] === 'false') counts[key].false += 1;
            });
        });
    });

    const rates = {};
    Object.keys(counts).forEach(key => {
        const t = counts[key].true;
        const f = counts[key].false;
        const total = t + f;
        rates[key] = {
            true: t,
            false: f,
            trueRate: total ? t / total : 0,
            falseRate: total ? f / total : 0
        };
    });

    return { counts, rates };
}

async function updateGlobalStatFile(section, payload) {
    const stats = await readStatCache();
    const reviewData = await loadReviewData();
    const pocStatusSummary = computePocStatusSummary(reviewData);

    stats.updatedAt = new Date().toISOString();
    stats.pocStatusSummary = pocStatusSummary;
    stats.sections = stats.sections || {};
    stats.sections[section] = {
        updatedAt: new Date().toISOString(),
        data: payload
    };

    await writeStatCache(stats);
}

async function writeGlobalStatSnapshot(globalStats, totalSites) {
    const stats = await readStatCache();
    const reviewData = await loadReviewData();
    const pocStatusSummary = computePocStatusSummary(reviewData);

    stats.updatedAt = new Date().toISOString();
    stats.globalStats = {
        ...globalStats,
        totalSites
    };
    stats.pocStatusSummary = pocStatusSummary;
    stats.sections = stats.sections || {};

    await writeStatCache(stats);
}

function getIndexCachePath(name) {
    return path.join(INDEX_CACHE_DIR, name);
}

async function readIndexCache(fileName) {
    try {
        const raw = await fs.readFile(getIndexCachePath(fileName), 'utf8');
        indexStats.hits++;
        return JSON.parse(raw);
    } catch (e) {
        indexStats.misses++;
        return null;
    }
}

async function writeIndexCache(fileName, payload) {
    try {
        await fs.mkdir(INDEX_CACHE_DIR, { recursive: true });
        await fs.writeFile(getIndexCachePath(fileName), JSON.stringify(payload), 'utf8');
    } catch (e) {
        // Non-fatal: skip cache write on error
    }
}

function getParentIndexFile(parentDir) {
    const safeName = parentDir.replace(/[\/\\]/g, '__');
    return `parent-${safeName}.json`;
}

function getSiteIndexFile(compositeHash) {
    const safeName = compositeHash.replace(/[\/\\]/g, '__');
    return `site-${safeName}.json`;
}

function getSitePathFromCompositeHash(compositeHash) {
    const parts = compositeHash.split('/');
    if (parts.length < 2) return null;
    const [parentDir, hash] = parts;
    return path.join(DATA_DIR, parentDir, hash);
}

function getBucketNameFromRank(rank) {
    if (rank === null) return 'Unranked';
    const bucketStart = Math.floor((rank - 1) / 1000) * 1000 + 1;
    const bucketEnd = bucketStart + 999;
    return `${bucketStart}-${bucketEnd}`;
}

async function readSiteDirIndex(compositeHash, sitePath) {
    try {
        const stats = await fs.stat(sitePath);
        const mtimeMs = stats.mtimeMs || stats.mtime.getTime();
        const cached = await readIndexCache(getSiteIndexFile(compositeHash));
        if (cached && cached.mtimeMs === mtimeMs && Array.isArray(cached.entries)) {
            return cached.entries;
        }
        const entries = await fs.readdir(sitePath);
        await writeIndexCache(getSiteIndexFile(compositeHash), { mtimeMs, entries });
        return entries;
    } catch (e) {
        return [];
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
    if (SITE_STABLED) {
        try {
            await fs.stat(cachePath);
            return true;
        } catch (e) {
            return false;
        }
    }
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
            cacheStats.fileReadHits++;
            cacheStats.totalReadTime += (Date.now() - startTime);
            return content;
        } else {
            // Cache miss or outdated - update cache then read
            console.log(`[FileCache] Cache miss or outdated for: ${getRelativePath(filePath)}`);
            cacheStats.misses++;
            cacheStats.fileReadMisses++;
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

function getFlowSummaryCachePath(compositeHash) {
    const safeName = compositeHash.replace(/[\/\\]/g, '__');
    return path.join(CACHE_DIR, 'flow-summaries', `${safeName}.json`);
}

function getFlowEntriesCachePath(compositeHash) {
    const safeName = compositeHash.replace(/[\/\\]/g, '__');
    return path.join(CACHE_DIR, 'flow-entries', `${safeName}.json`);
}

async function readFlowSummaryCache(compositeHash, flowFilePath) {
    try {
        const cachePath = getFlowSummaryCachePath(compositeHash);
        const valid = await isCacheValid(flowFilePath, cachePath);
        if (!valid) return null;
        const raw = await fs.readFile(cachePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

async function writeFlowSummaryCache(compositeHash, flowFilePath, summary) {
    try {
        const cachePath = getFlowSummaryCachePath(compositeHash);
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(summary), 'utf8');
        const sourceStats = await fs.stat(flowFilePath);
        await fs.utimes(cachePath, sourceStats.atime, sourceStats.mtime);
    } catch (e) {
        // Non-fatal: skip cache write on error
    }
}

async function readFlowEntriesCache(compositeHash, flowFilePath) {
    try {
        const cachePath = getFlowEntriesCachePath(compositeHash);
        const valid = await isCacheValid(flowFilePath, cachePath);
        if (!valid) return null;
        console.log("[FlowEntries] cache hit, reading from ", cachePath);
        const raw = await fs.readFile(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        const hasHeaders = parsed.every(entry => entry && entry.headerHash && entry.headerText);
        if (!hasHeaders) {
            return null;
        }
        return parsed;
    } catch (e) {
        return null;
    }
}

async function writeFlowEntriesCache(compositeHash, flowFilePath, entries) {
    try {
        const cachePath = getFlowEntriesCachePath(compositeHash);
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(entries), 'utf8');
        const sourceStats = await fs.stat(flowFilePath);
        await fs.utimes(cachePath, sourceStats.atime, sourceStats.mtime);
    } catch (e) {
        // Non-fatal: skip cache write on error
    }
}

function hashHeaderText(text) {
    return crypto.createHash('sha1').update(text).digest('hex');
}

function parseTagsLine(line) {
    const markerIdx = line.indexOf('Tags:');
    if (markerIdx === -1) return [];
    let raw = line.slice(markerIdx + 5).trim();
    raw = raw.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map(tag => tag.trim().replace(/['"]/g, ''))
        .filter(tag => tag.length > 0);
}

function parseFlowEntries(rawContent) {
    const lines = rawContent.split(/\r?\n/);
    const entries = [];
    let current = null;
    let readingVulnInfoBlock = false;
    let vulnInfoBlock = null;

    const extractLibname = (vulnInfo) => {
        if (!vulnInfo) return '';
        const match = vulnInfo.match(/"libname"\s*:\s*"([^"]+)"/);
        return match ? match[1] : '';
    };

    const finalizeEntry = () => {
        if (!current) return;
        const headerLines = [];
        if (current.tagsLine) headerLines.push(current.tagsLine);
        if (current.vulnInfo) headerLines.push(`[*] Vuln Info: ${current.vulnInfo}`);
        if (current.nodeId) headerLines.push(`[*] NodeId: ${current.nodeId}`);
        if (current.file) headerLines.push(`[*] File: ${current.file}`);
        if (current.location) headerLines.push(`[*] Location: ${current.location}`);
        if (current.func) headerLines.push(`[*] Function: ${current.func}`);
        if (current.template) headerLines.push(`[*] Template: ${current.template}`);
        if (current.topExpression) headerLines.push(`[*] Top Expression: ${current.topExpression}`);
        const headerText = headerLines.join('\n');
        const headerHash = hashHeaderText(headerText);
        const libname = extractLibname(current.vulnInfo);
        const displayTitle = current.func
            ? `${libname ? `${libname} | ` : ''}${current.func}`
            : (current.vulnInfo || (current.tags[0] || 'POC match'));

        entries.push({
            headerHash,
            headerText,
            line: current.startLine,
            tags: current.tags,
            vulnInfo: current.vulnInfo || '',
            nodeId: current.nodeId || '',
            file: current.file || '',
            location: current.location || '',
            func: current.func || '',
            template: current.template || '',
            topExpression: current.topExpression || '',
            title: displayTitle
        });
        current = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('[*] Tags:')) {
            finalizeEntry();
            current = {
                startLine: i + 1,
                tagsLine: line.trim(),
                tags: parseTagsLine(line),
                vulnInfo: '',
                nodeId: '',
                file: '',
                location: '',
                func: '',
                template: '',
                topExpression: ''
            };
            readingVulnInfoBlock = false;
            vulnInfoBlock = null;
            continue;
        }

        if (!current) continue;

        if (line.startsWith('----------------------------------------------------') || line.startsWith('====================================================')) {
            finalizeEntry();
            continue;
        }

        if (line.startsWith('[*] Vulnerability Information:')) {
            readingVulnInfoBlock = true;
            vulnInfoBlock = {};
            continue;
        }

        if (readingVulnInfoBlock) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('[*]')) {
                readingVulnInfoBlock = false;
            } else if (trimmed.startsWith('-')) {
                const parts = trimmed.replace(/^-/, '').split(':');
                const key = parts.shift()?.trim();
                const value = parts.join(':').trim();
                if (key) {
                    vulnInfoBlock[key] = value;
                }
                continue;
            } else {
                readingVulnInfoBlock = false;
            }
        }

        if (line.startsWith('[*] Vuln Info:')) {
            current.vulnInfo = line.replace('[*] Vuln Info:', '').trim();
        } else if (line.startsWith('[*] NodeId:')) {
            current.nodeId = line.replace('[*] NodeId:', '').trim();
        } else if (line.startsWith('[*] File:')) {
            current.file = line.replace('[*] File:', '').trim();
        } else if (line.startsWith('[*] Location:')) {
            current.location = line.replace('[*] Location:', '').trim();
        } else if (line.startsWith('[*] Function:')) {
            current.func = line.replace('[*] Function:', '').trim();
        } else if (line.startsWith('[*] Template:')) {
            current.template = line.replace('[*] Template:', '').trim();
        } else if (line.startsWith('[*] Top Expression:')) {
            current.topExpression = line.replace('[*] Top Expression:', '').trim();
        }

        if (!readingVulnInfoBlock && vulnInfoBlock && Object.keys(vulnInfoBlock).length > 0) {
            current.vulnInfo = JSON.stringify({
                mod: vulnInfoBlock.mod === 'True',
                libname: vulnInfoBlock.libname || '',
                location: vulnInfoBlock.location || '',
                poc_str: vulnInfoBlock.poc_str || '',
                jq: vulnInfoBlock.jq === 'True'
            });
            vulnInfoBlock = null;
        }
    }

    finalizeEntry();
    return entries;
}

function extractLibnameFromVulnInfo(vulnInfo) {
    if (!vulnInfo) return '';
    const match = vulnInfo.match(/"libname"\s*:\s*"([^"]+)"/);
    return match ? match[1] : '';
}

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePocFunctionName(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/LIBOBJ(?:\.[A-Za-z0-9_$]+|\([^)]*\)\.[A-Za-z0-9_$]+)?/);
    const base = match ? match[0] : raw;
    return base.replace(/\([^)]*\)$/, '');
}

function buildVulnPocFunctionMap(vulnContent) {
    const map = new Map(); // funcName -> libname
    if (!vulnContent || !vulnContent.trim()) return map;
    vulnContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
            const vulnData = JSON.parse(trimmed);
            const urlKey = Object.keys(vulnData)[0];
            const libs = vulnData[urlKey] || [];
            libs.forEach(lib => {
                const libname = String(lib.libname || '').trim();
                if (!libname || !Array.isArray(lib.vuln)) return;
                lib.vuln.forEach(v => {
                    const poc = v && v.poc ? String(v.poc) : '';
                    const funcName = normalizePocFunctionName(poc);
                    if (!funcName) return;
                    if (!map.has(funcName)) {
                        map.set(funcName, libname);
                    }
                });
            });
        } catch (e) {
            // ignore malformed lines
        }
    });
    return map;
}

function buildPocNotesSection(pocNotes) {
    const blocks = Object.values(pocNotes || {})
        .filter(entry => entry && entry.note && entry.note.trim())
        .map(entry => `${entry.header}\n\n${entry.note.trim()}`);
    return blocks.join('\n\n');
}

function mergeMemoWithPocNotes(existingMemo, pocNotesSection) {
    const marker = '--- POC NOTES ---';
    const base = existingMemo ? existingMemo.split(`\n${marker}\n`)[0].trimEnd() : '';
    if (!pocNotesSection) return base;
    return `${base}${base ? '\n\n' : ''}${marker}\n${pocNotesSection}`;
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
            cacheStats.statHits++;
            cacheStats.totalReadTime += (Date.now() - startTime);
            return sourceStats;
        }
        } catch (e) {
            // Cache doesn't exist, will be created on actual read
        }

        // Cache miss - return source stats
        cacheStats.misses++;
        cacheStats.statMisses++;
        cacheStats.totalReadTime += (Date.now() - startTime);
        return sourceStats;
    } catch (e) {
        cacheStats.errors++;
        cacheStats.totalReadTime += (Date.now() - startTime);
        throw e;
    }
}

async function cachedDirStat(dirPath) {
    const cached = dirStatCache.get(dirPath);
    const now = Date.now();
    if (cached && (now - cached.ts) < CACHE_TTL) {
        return cached.stats;
    }
    const stats = await fs.stat(dirPath);
    dirStatCache.set(dirPath, { stats, ts: now });
    return stats;
}

function getReaddirCacheKey(dirPath, withFileTypes) {
    return `${dirPath}::${withFileTypes ? 'dirents' : 'names'}`;
}

async function cachedReaddir(dirPath, withFileTypes = false) {
    const cacheKey = getReaddirCacheKey(dirPath, withFileTypes);
    const cached = dirReaddirCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.ts) < CACHE_TTL) {
        return cached.entries;
    }

    const stats = await cachedDirStat(dirPath);
    const mtimeMs = stats.mtimeMs || stats.mtime.getTime();
    if (cached && cached.mtimeMs === mtimeMs) {
        cached.ts = now;
        return cached.entries;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes });
    dirReaddirCache.set(cacheKey, { entries, mtimeMs, ts: now });
    return entries;
}

// Print cache statistics
function logCacheStats() {
    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;

    console.log('[FileCache] Stats:', {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        fileReadHits: cacheStats.fileReadHits,
        fileReadMisses: cacheStats.fileReadMisses,
        statHits: cacheStats.statHits,
        statMisses: cacheStats.statMisses,
        updates: cacheStats.updates,
        errors: cacheStats.errors,
        hitRate: `${hitRate}%`,
        avgReadTime: total > 0 ? `${(cacheStats.totalReadTime / total).toFixed(2)}ms` : '0ms',
        avgCacheTime: cacheStats.updates > 0 ? `${(cacheStats.totalCacheTime / cacheStats.updates).toFixed(2)}ms` : '0ms'
    });

    console.log('[IndexCache] Stats:', {
        hits: indexStats.hits,
        misses: indexStats.misses
    });
}

// Reset cache statistics
function resetCacheStats() {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.fileReadHits = 0;
    cacheStats.fileReadMisses = 0;
    cacheStats.statHits = 0;
    cacheStats.statMisses = 0;
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

let saveReviewQueue = Promise.resolve();

async function ensureReviewDir() {
    try {
        await fs.mkdir(path.dirname(REVIEW_FILE), { recursive: true });
    } catch (e) {
        // Non-fatal; save will surface errors if dir isn't writable
    }
}

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
            // Attempt recovery from most recent backup
            try {
                const backupDir = path.dirname(REVIEW_FILE);
                const files = await fs.readdir(backupDir);
                const backups = files
                    .filter(f => f.startsWith('review.json.backup.'))
                    .map(f => ({ name: f, path: path.join(backupDir, f), time: parseInt(f.split('.').pop()) }))
                    .sort((a, b) => b.time - a.time);
                if (backups.length > 0) {
                    const backupContent = await fs.readFile(backups[0].path, 'utf8');
                    const recovered = JSON.parse(backupContent);
                    console.warn(`⚠️ Recovered review.json from backup: ${backups[0].name}`);
                    return recovered;
                }
            } catch (recoveryError) {
                console.error('❌ Recovery from backup failed:', recoveryError.message);
            }
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
    saveReviewQueue = saveReviewQueue.then(async () => {
        await ensureReviewDir();
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
        const tempFile = `${REVIEW_FILE}.tmp.${process.pid}.${Date.now()}`;
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
    }).catch((error) => {
        console.error('Error saving review data:', error);
        return false;
    });

    return saveReviewQueue;
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
        const dataDirStats = await fs.stat(DATA_DIR);
        const dataDirMtimeMs = dataDirStats.mtimeMs || dataDirStats.mtime.getTime();
        const parentIndex = await readIndexCache('parents.json');

        if (parentIndex && parentIndex.mtimeMs === dataDirMtimeMs && Array.isArray(parentIndex.entries)) {
            parentDirs = parentIndex.entries;
        } else {
            const parentDirents = await fs.readdir(DATA_DIR, { withFileTypes: true });
            parentDirs = parentDirents.filter(d => d.isDirectory()).map(d => d.name);
            await writeIndexCache('parents.json', { mtimeMs: dataDirMtimeMs, entries: parentDirs });
        }

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
            const parentMtimeMs = parentStats.mtimeMs || parentStats.mtime.getTime();
            const parentIndex = await readIndexCache(getParentIndexFile(parentDir));

            let siteHashes = [];
            if (parentIndex && parentIndex.mtimeMs === parentMtimeMs && Array.isArray(parentIndex.entries)) {
                siteHashes = parentIndex.entries;
            } else {
                const siteDirents = await fs.readdir(parentPath, { withFileTypes: true });
                siteHashes = siteDirents.filter(d => d.isDirectory()).map(d => d.name);
                await writeIndexCache(getParentIndexFile(parentDir), { mtimeMs: parentMtimeMs, entries: siteHashes });
            }

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

    // Pre-list site directories to avoid missing-file reads
    const siteFileLists = new Map();
    const dirQueue = [...sitePaths];
    const dirConcurrency = Math.min(FILE_READ_CONCURRENCY, dirQueue.length || 1);
    const dirWorkers = Array(dirConcurrency).fill(null).map(async () => {
        while (dirQueue.length > 0) {
            const { sitePath, parentDir, hash } = dirQueue.shift();
            const compositeHash = `${parentDir}/${hash}`;
            try {
                const files = await readSiteDirIndex(compositeHash, sitePath);
                siteFileLists.set(compositeHash, files);
            } catch (e) {
                siteFileLists.set(compositeHash, []);
            }
        }
    });
    await Promise.all(dirWorkers);

    // Prepare batch file reading only for existing files
    const filesToRead = [];
    sitePaths.forEach(({ sitePath, parentDir, hash }) => {
        const compositeHash = `${parentDir}/${hash}`;
        const files = siteFileLists.get(compositeHash) || [];
        if (files.includes('url.out')) {
            filesToRead.push({ key: `${compositeHash}:url`, path: path.join(sitePath, 'url.out') });
        }
        if (files.includes('sink.flows.out')) {
            filesToRead.push({ key: `${compositeHash}:flows`, path: path.join(sitePath, 'sink.flows.out') });
        }
        if (files.includes('vuln.out')) {
            filesToRead.push({ key: `${compositeHash}:vuln`, path: path.join(sitePath, 'vuln.out') });
        }
    });

    // Batch read all files
    const batchReadStartTime = Date.now();
    console.log(`[getSiteData] Batch reading ${filesToRead.length} files...`);
    const fileContents = await batchReadFiles(filesToRead, FILE_READ_CONCURRENCY);
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

            const vulnContent = fileContents.get(`${compositeHash}:vuln`);
            const vulnPocFunctionMap = buildVulnPocFunctionMap(vulnContent);

            // Process flows
            const flowsStart = Date.now();
            let hasFlows = false;
            let pocMatches = 0;
            let allFlowsCount = 0; // Including NON-REACH
            const tagCounts = {};
            const pocFunctions = {}; // Function name -> count
            const pocSourceUrls = {};
            const pocSourceFiles = {};
            let flowPocCount = 0;
            const flowPocFunctions = {};
            const flowPocSourceUrls = {};
            const flowPocSourceFiles = {};
            const flowsContent = fileContents.get(`${compositeHash}:flows`);
            if (flowsContent) {
                const flowFilePath = path.join(sitePath, 'sink.flows.out');
                const cachedSummary = await readFlowSummaryCache(compositeHash, flowFilePath);
                const cachedEntries = await readFlowEntriesCache(compositeHash, flowFilePath);
                if (cachedSummary) {
                    hasFlows = cachedSummary.hasFlows || false;
                    pocMatches = cachedSummary.pocMatches || 0;
                    allFlowsCount = cachedSummary.allFlowsCount || 0;
                    Object.assign(tagCounts, cachedSummary.tagCounts || {});
                    Object.assign(pocFunctions, cachedSummary.pocFunctions || {});
                    Object.assign(pocSourceUrls, cachedSummary.pocSourceUrls || {});
                    Object.assign(pocSourceFiles, cachedSummary.pocSourceFiles || {});
                    flowPocCount = cachedSummary.flowPocCount || 0;
                    Object.assign(flowPocFunctions, cachedSummary.flowPocFunctions || {});
                    Object.assign(flowPocSourceUrls, cachedSummary.flowPocSourceUrls || {});
                    Object.assign(flowPocSourceFiles, cachedSummary.flowPocSourceFiles || {});
                    if (vulnPocFunctionMap.size > 0) {
                        const remapFunctions = (map) => {
                            const next = {};
                            Object.entries(map || {}).forEach(([key, count]) => {
                                if (key.includes(' | ')) {
                                    next[key] = (next[key] || 0) + count;
                                    return;
                                }
                                const funcName = normalizePocFunctionName(key);
                                const libname = vulnPocFunctionMap.get(funcName);
                                const nextKey = libname ? `${libname} | ${funcName || key}` : key;
                                next[nextKey] = (next[nextKey] || 0) + count;
                            });
                            return next;
                        };
                        const remappedPoc = remapFunctions(pocFunctions);
                        const remappedFlowPoc = remapFunctions(flowPocFunctions);
                        Object.keys(pocFunctions).forEach(k => delete pocFunctions[k]);
                        Object.keys(flowPocFunctions).forEach(k => delete flowPocFunctions[k]);
                        Object.assign(pocFunctions, remappedPoc);
                        Object.assign(flowPocFunctions, remappedFlowPoc);
                    }
                    timings.flows = Date.now() - flowsStart;
                }

                if (!cachedSummary && flowsContent.indexOf('[*] Tags:') === -1) {
                    timings.flows = Date.now() - flowsStart;
                } else if (!cachedSummary) {
                // Split flows by the separator pattern and filter out NON-REACH flows
                const flowEntries = flowsContent.split(/(?=\[\*\] Tags:)/);

                // Count tags from all flow entries
                flowEntries.forEach(entry => {
                    const tagsIndex = entry.indexOf('[*] Tags:');
                    if (tagsIndex !== -1) {
                        // Count ALL flows including NON-REACH
                        allFlowsCount++;

                        let tagsLine = entry.slice(tagsIndex + 9);
                        const lineEnd = tagsLine.indexOf('\n');
                        if (lineEnd !== -1) {
                            tagsLine = tagsLine.slice(0, lineEnd);
                        }
                        const bracketStart = tagsLine.indexOf('[');
                        const bracketEnd = tagsLine.lastIndexOf(']');
                        const tagsStr = bracketStart !== -1 && bracketEnd > bracketStart
                            ? tagsLine.slice(bracketStart + 1, bracketEnd)
                            : tagsLine.trim();
                        const upperTags = tagsStr.toUpperCase();
                        // Extract individual tags by splitting on comma and cleaning quotes
                        const tags = tagsStr.split(',').map(tag =>
                            tag.trim().replace(/['"]/g, '')
                        ).filter(tag => tag.length > 0);

                        // Count each tag
                        tags.forEach(tag => {
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        });

                        // Extract libname from Vuln Info line
                        let libName = '';
                        const vulnIndex = entry.indexOf('[*] Vuln Info:');
                        if (vulnIndex !== -1) {
                            let vulnLine = entry.slice(vulnIndex + 13);
                            const vulnEnd = vulnLine.indexOf('\n');
                            if (vulnEnd !== -1) {
                                vulnLine = vulnLine.slice(0, vulnEnd);
                            }
                            const libMatch = vulnLine.match(/"libname"\s*:\s*"([^"]+)"/);
                            if (libMatch) {
                                libName = libMatch[1];
                            }
                        }

                        // Extract POC function from [*] Function: LIBOBJ.xxx() line
                        let funcName = '';
                        const funcIndex = entry.indexOf('[*] Function:');
                        if (funcIndex !== -1) {
                            let funcLine = entry.slice(funcIndex + 13);
                            const funcEnd = funcLine.indexOf('\n');
                            if (funcEnd !== -1) {
                                funcLine = funcLine.slice(0, funcEnd);
                            }
                            funcName = funcLine.trim();
                            // Normalize: strip parameters (...) but keep LIBOBJ.method
                            funcName = funcName.replace(/\([^)]*\)$/, '');
                            if (!libName) {
                                const mappedLib = vulnPocFunctionMap.get(funcName);
                                if (mappedLib) {
                                    libName = mappedLib;
                                }
                            }
                            const funcKey = libName ? `${libName} | ${funcName}` : funcName;
                            pocFunctions[funcKey] = (pocFunctions[funcKey] || 0) + 1;
                        }

                        // Extract navigation URL and file path once per entry
                        let navUrl = '';
                        const navIndex = entry.indexOf('[*] NavigationURL:');
                        if (navIndex !== -1) {
                            let navLine = entry.slice(navIndex + 18);
                            const navEnd = navLine.indexOf('\n');
                            if (navEnd !== -1) {
                                navLine = navLine.slice(0, navEnd);
                            }
                            navUrl = navLine.trim();
                        }

                        let filePath = '';
                        let fileIndex = entry.indexOf('[*] File:');
                        if (fileIndex === -1) {
                            fileIndex = entry.indexOf('|- file:');
                            if (fileIndex !== -1) {
                                fileIndex += 8;
                            }
                        } else {
                            fileIndex += 9;
                        }
                        if (fileIndex !== -1) {
                            let fileLine = entry.slice(fileIndex);
                            const fileEnd = fileLine.indexOf('\n');
                            if (fileEnd !== -1) {
                                fileLine = fileLine.slice(0, fileEnd);
                            }
                            filePath = fileLine.trim();
                        }
                        if (navUrl) {
                            pocSourceUrls[navUrl] = (pocSourceUrls[navUrl] || 0) + 1;
                        }
                        if (filePath) {
                            pocSourceFiles[filePath] = (pocSourceFiles[filePath] || 0) + 1;
                        }

                        const hasFlow = !upperTags.includes('NON-REACH');
                        if (hasFlow) {
                            flowPocCount++;
                            if (funcName) {
                                const funcKey = libName ? `${libName} | ${funcName}` : funcName;
                                flowPocFunctions[funcKey] = (flowPocFunctions[funcKey] || 0) + 1;
                            }
                            if (navUrl) {
                                flowPocSourceUrls[navUrl] = (flowPocSourceUrls[navUrl] || 0) + 1;
                            }
                            if (filePath) {
                                flowPocSourceFiles[filePath] = (flowPocSourceFiles[filePath] || 0) + 1;
                            }
                        }
                    }
                });

                // Count valid flows (those with Tags line, excluding NON-REACH)
                pocMatches = flowPocCount;
                if (pocMatches > 0) {
                    hasFlows = true;
                }
                }

                if (!cachedSummary) {
                    await writeFlowSummaryCache(compositeHash, flowFilePath, {
                        hasFlows,
                        pocMatches,
                        allFlowsCount,
                        tagCounts,
                        pocFunctions,
                        pocSourceUrls,
                        pocSourceFiles,
                        flowPocCount,
                        flowPocFunctions,
                        flowPocSourceUrls,
                        flowPocSourceFiles
                    });
                } else if (vulnPocFunctionMap.size > 0) {
                    await writeFlowSummaryCache(compositeHash, flowFilePath, {
                        hasFlows,
                        pocMatches,
                        allFlowsCount,
                        tagCounts,
                        pocFunctions,
                        pocSourceUrls,
                        pocSourceFiles,
                        flowPocCount,
                        flowPocFunctions,
                        flowPocSourceUrls,
                        flowPocSourceFiles
                    });
                }

                if (!cachedEntries) {
                    const parsedEntries = parseFlowEntries(flowsContent);
                    await writeFlowEntriesCache(compositeHash, flowFilePath, parsedEntries);
                }
            }
            timings.flows = Date.now() - flowsStart;

            // Process vulnerabilities
            const vulnStart = Date.now();
            let vulnerableLibs = 0;
            let hasValidVulnData = false;
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
            let allFiles = siteFileLists.get(compositeHash);
            if (!allFiles) {
                allFiles = await readSiteDirIndex(compositeHash, sitePath);
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
                // console.log(`[Site ${compositeHash}] ${totalSiteTime}ms total - url:${timings.url}ms flows:${timings.flows}ms vuln:${timings.vuln}ms readdir:${timings.readdir}ms fileCheck:${timings.fileExistence}ms errorLog:${timings.errorLog}ms jsFiles:${timings.jsFiles}ms`);
            }

            return {
                hash: compositeHash,
                domain: siteDomain,
                urlPath: siteUrlPath,
                originalUrl,
                rank: getRankingForUrl(originalUrl),
                modifiedTime,
                hasFlows,
                pocMatches,
                allFlowsCount,
                tagCounts,
                pocFunctions,
                pocSourceUrls,
                pocSourceFiles,
                flowPocCount,
                flowPocFunctions,
                flowPocSourceUrls,
                flowPocSourceFiles,
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

    // Build bucket site counts for global reuse
    bucketSiteCounts = {};
    for (const site of nonLocalHostSites) {
        const bucketName = getBucketNameFromRank(site.rank ?? getRankingForUrl(site.originalUrl));
        bucketSiteCounts[bucketName] = (bucketSiteCounts[bucketName] || 0) + 1;
    }

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
        await writeGlobalStatSnapshot(data.globalStats, data.sites.length);

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
        clearPocMatchStatsCache();
        clearDirCaches();
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
        clearDirCaches();
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

// API endpoint for server-side search and filtering
app.get('/api/search', async (req, res) => {
    try {
        const {
            q = '',
            page = 1,
            limit = 50,
            // Filter parameters
            hasFlows,
            hasLibDetection,
            hasSinkFlows,
            hasVulnOut,
            hasErrorLog,
            hasWarningLog,
            reviewed,
            unreviewed,
            vulnerable,
            hasNotes,
            // Time range parameters (milliseconds)
            timeStart,
            timeEnd,
            // Hash range parameters
            hashStart,
            hashEnd,
            // File content search hashes (comma-separated)
            hashes
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const searchTerm = q.toLowerCase().trim();

        if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum <= 0 || limitNum > 200) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        const data = await getCachedSiteData();
        const allSites = data.sites;
        let sites = allSites;

        // Filter by file content search hashes (takes precedence over text search)
        if (hashes) {
            const hashArray = hashes.split(',').map(h => h.trim()).filter(h => h);
            const hashSet = new Set(hashArray);
            sites = sites.filter(site => hashSet.has(site.hash));
        } else if (searchTerm) {
            // Filter by search term only if not using file content search
            sites = sites.filter(site => {
                const searchText = (site.domain + ' ' + site.urlPath + ' ' + site.originalUrl + ' ' + site.hash).toLowerCase();
                return searchText.includes(searchTerm);
            });
        }

        // Apply checkbox filters
        if (hasFlows === 'true') {
            sites = sites.filter(site => site.hasFlows);
        }
        if (hasLibDetection === 'true') {
            sites = sites.filter(site => site.hasLibDetection);
        }
        if (hasSinkFlows === 'true') {
            sites = sites.filter(site => site.hasSinkFlows);
        }
        if (hasVulnOut === 'true') {
            sites = sites.filter(site => site.hasVulnOut);
        }
        if (hasErrorLog === 'true') {
            sites = sites.filter(site => site.hasErrorLog);
        }
        if (hasWarningLog === 'true') {
            sites = sites.filter(site => site.hasWarningLog);
        }
        if (reviewed === 'true') {
            sites = sites.filter(site => site.reviewed);
        }
        if (unreviewed === 'true') {
            sites = sites.filter(site => !site.reviewed);
        }
        if (vulnerable === 'true') {
            sites = sites.filter(site => site.vulnerable);
        }
        if (hasNotes === 'true') {
            sites = sites.filter(site => site.memo && site.memo.trim());
        }

        // Resolve hash range to a time range (server-side)
        let resolvedTimeStart = null;
        let resolvedTimeEnd = null;
        if (hashStart || hashEnd) {
            if (!hashStart || !hashEnd) {
                return res.status(400).json({ error: 'Both hashStart and hashEnd are required' });
            }
            const resolveHashPrefix = (prefix) => {
                const normalized = String(prefix).toLowerCase();
                const matches = allSites.filter(site => String(site.hash).toLowerCase().startsWith(normalized));
                if (matches.length === 0) {
                    return { error: `No match for hash prefix: ${prefix}` };
                }
                if (matches.length > 1) {
                    return { error: `Hash prefix is not unique: ${prefix}` };
                }
                return { site: matches[0] };
            };

            const startResult = resolveHashPrefix(hashStart);
            if (startResult.error) {
                return res.status(400).json({ error: startResult.error });
            }
            const endResult = resolveHashPrefix(hashEnd);
            if (endResult.error) {
                return res.status(400).json({ error: endResult.error });
            }
            const startSite = startResult.site;
            const endSite = endResult.site;
            const startMs = startSite.modifiedTime;
            const endMs = endSite.modifiedTime;
            if (!startMs || !endMs) {
                return res.status(400).json({ error: 'hashStart/hashEnd missing modified time' });
            }
            resolvedTimeStart = Math.min(startMs, endMs);
            resolvedTimeEnd = Math.max(startMs, endMs);
        }

        // Apply time range filter (explicit or resolved from hashes)
        const startMsValue = resolvedTimeStart ?? (timeStart ? parseInt(timeStart, 10) : null);
        const endMsValue = resolvedTimeEnd ?? (timeEnd ? parseInt(timeEnd, 10) : null);
        if (startMsValue && !isNaN(startMsValue)) {
            sites = sites.filter(site => site.modifiedTime >= startMsValue);
        }
        if (endMsValue && !isNaN(endMsValue)) {
            sites = sites.filter(site => site.modifiedTime <= endMsValue);
        }

        // Sites are already sorted by modifiedTime (newest first) from getSiteData()
        const total = sites.length;
        const totalPages = Math.ceil(total / limitNum) || 1;
        const offset = (pageNum - 1) * limitNum;
        const paginatedSites = sites.slice(offset, offset + limitNum);

        res.json({
            sites: paginatedSites,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasMore: pageNum < totalPages
        });
    } catch (error) {
        console.error('Error searching sites:', error);
        res.status(500).json({ error: 'Failed to search sites' });
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

app.get('/api/flow-entries', async (req, res) => {
    const { hash } = req.query;
    if (!hash || hash.includes('..')) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const flowFilePath = path.join(DATA_DIR, hash, 'sink.flows.out');
    try {
        const start = Date.now();
        let entries = await readFlowEntriesCache(hash, flowFilePath);
        let cacheHit = true;
        if (!entries) {
            cacheHit = false;
            const content = await cachedReadFile(flowFilePath, 'utf8');
            entries = parseFlowEntries(content);
            await writeFlowEntriesCache(hash, flowFilePath, entries);
        }
        const duration = Date.now() - start;
        console.log(`[FlowEntries] ${cacheHit ? 'cache' : 'parsed'} ${hash} (${entries.length} entries, ${duration}ms)`);

        const reviewData = await loadReviewData();
        const siteReview = reviewData[hash] || { reviewed: false, vulnerable: false, memo: '', pocNotes: {} };
        const pocNotes = siteReview.pocNotes || {};

        const enriched = entries.map(entry => {
            const noteEntry = pocNotes[entry.headerHash] || {};
            return {
                ...entry,
                note: noteEntry.note || '',
                status: noteEntry.status || {
                    vulnerableFunc: 'none',
                    pocMatch: 'none',
                    dataflow: 'none'
                }
            };
        });

        res.json({ entries: enriched });
    } catch (error) {
        res.status(404).json({ error: 'sink.flows.out not found or could not be read.' });
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
            await writeGlobalStatSnapshot(siteDataCache?.globalStats || {}, siteDataCache?.sites?.length || 0);
            res.json({ success: true, data: reviewData[hash] });
        } else {
            res.status(500).json({ error: 'Failed to save review data' });
        }
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/update-poc-review', async (req, res) => {
    const { hash, headerHash, headerText, statusKey, statusValue, note } = req.body;

    if (!hash || !headerHash || !headerText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const allowedStatusKeys = ['vulnerableFunc', 'pocMatch', 'dataflow'];
    if (statusKey && !allowedStatusKeys.includes(statusKey)) {
        return res.status(400).json({ error: 'Invalid status key' });
    }
    if (statusValue && !['none', 'true', 'false'].includes(statusValue)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
        console.log('[POCReview] update request', {
            hash,
            headerHash,
            hasHeaderText: Boolean(headerText),
            statusKey: statusKey || null,
            statusValue: statusValue || null,
            noteLength: note ? String(note).length : 0
        });
        const reviewData = await loadReviewData();

        if (!reviewData[hash]) {
            reviewData[hash] = { reviewed: false, vulnerable: false, memo: '', pocNotes: {} };
        }
        if (!reviewData[hash].pocNotes) {
            reviewData[hash].pocNotes = {};
        }

        const entry = reviewData[hash].pocNotes[headerHash] || {
            header: headerText,
            status: { vulnerableFunc: 'none', pocMatch: 'none', dataflow: 'none' },
            note: ''
        };

        if (statusKey && statusValue) {
            entry.status = entry.status || { vulnerableFunc: 'none', pocMatch: 'none', dataflow: 'none' };
            entry.status[statusKey] = statusValue;
        }

        if (note !== undefined) {
            entry.note = note;
        }

        entry.header = headerText;
        reviewData[hash].pocNotes[headerHash] = entry;

        const pocNotesSection = buildPocNotesSection(reviewData[hash].pocNotes);
        reviewData[hash].memo = mergeMemoWithPocNotes(reviewData[hash].memo || '', pocNotesSection);

        const success = await saveReviewData(reviewData);
        if (success) {
            await writeGlobalStatSnapshot(siteDataCache?.globalStats || {}, siteDataCache?.sites?.length || 0);
            res.json({ success: true, memo: reviewData[hash].memo, entry: reviewData[hash].pocNotes[headerHash] });
        } else {
            res.status(500).json({ error: 'Failed to save review data' });
        }
    } catch (error) {
        console.error('Error updating POC review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/poc-status-summary', async (req, res) => {
    try {
        const stats = await readStatCache();
        if (stats && stats.pocStatusSummary) {
            return res.json(stats.pocStatusSummary);
        }
        const reviewData = await loadReviewData();
        const summary = computePocStatusSummary(reviewData);
        res.json(summary);
    } catch (error) {
        console.error('Error fetching POC status summary:', error);
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
                const empty = {
                    totalDetectedLibs: 0,
                    uniqueLibs: 0,
                    sitesWithDetections: 0,
                    avgLibsPerSite: 0,
                    topLibs: [],
                    detectionMethods: {},
                    versions: {},
                    accuracyStats: { accurate: 0, inaccurate: 0 }
                };
                await updateGlobalStatFile('lib-detection-stats', empty);
                return res.json(empty);
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
        const bucketLibCounts = {};

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
                let bucketName = 'Unranked';
                const urlFile = path.join(sitePath, 'url.out');
                try {
                    const urlContent = await cachedReadFile(urlFile, 'utf8');
                    const rawUrl = urlContent.trim();
                    const formatted = formatUrlForDisplay(rawUrl);
                    siteDomain = formatted.domain;
                    if (siteDomain.toLowerCase().includes('localhost')) {
                        continue; // Skip localhost domains
                    }
                    const rank = getRankingForUrl(rawUrl);
                    bucketName = getBucketNameFromRank(rank);
                    // Ensure bucket initialized even if site has no detections
                    if (bucketLibCounts[bucketName] === undefined) {
                        bucketLibCounts[bucketName] = 0;
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
                    let siteLibCount = 0;

                    const allowedMethods = new Set(['DEBUN', 'PTV-Original']);

                    // Parse lib.detection.json structure
                    for (const [url, methods] of Object.entries(libData)) {
                        for (const [method, detections] of Object.entries(methods)) {
                            if (!allowedMethods.has(method) || !detections.detection) continue;

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
                                    siteLibCount++;
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

                    bucketLibCounts[bucketName] = (bucketLibCounts[bucketName] || 0) + siteLibCount;
                } catch (e) {
                    // File not found or error reading
                }
            }
        }

        // Get top 30 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        // Get top 30 versions
        const topVersions = Object.entries(versions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        const avgLibsPerSite = sitesWithDetections > 0 ? (totalDetectedLibs / sitesWithDetections).toFixed(2) : 0;

        const bucketNames = new Set([
            ...Object.keys(bucketSiteCounts || {}),
            ...Object.keys(bucketLibCounts || {})
        ]);
        const sortedBuckets = Array.from(bucketNames).sort((a, b) => {
            if (a === 'Unranked') return 1;
            if (b === 'Unranked') return -1;
            const aStart = parseInt(a.split('-')[0], 10);
            const bStart = parseInt(b.split('-')[0], 10);
            return aStart - bStart;
        });
        const libUsageByRanking = sortedBuckets.map(bucket => {
            const totalLibs = bucketLibCounts[bucket] || 0;
            const siteCount = bucketSiteCounts[bucket] || 0;
            return {
                bucket,
                totalLibs,
                siteCount,
                avgLibsPerSite: siteCount > 0 ? (totalLibs / siteCount) : 0
            };
        });

        const result = {
            totalDetectedLibs,
            uniqueLibs: Object.keys(libCounts).length,
            sitesWithDetections,
            avgLibsPerSite,
            topLibs,
            detectionMethods,
            versions: topVersions,
            libUsageByRanking,
            accuracyStats: {
                accurate: accurateCount,
                inaccurate: inaccurateCount
            }
        };
        await updateGlobalStatFile('lib-detection-stats', result);
        res.json(result);
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

        const result = {
            totalTags,
            uniqueTags: Object.keys(globalTagCounts).length,
            sitesWithTags,
            avgTagsPerSite,
            tagCounts: globalTagCounts,
            topTags
        };
        await updateGlobalStatFile('tag-stats', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching tag stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/vuln-poc-location-mismatch', async (req, res) => {
    try {
        const libMapping = await loadLibMapping();
        const { sites } = await getCachedSiteData();
        if (!sites || sites.length === 0) {
            return res.json({ sites: [], count: 0 });
        }

        const results = [];
        for (const site of sites) {
            const compositeHash = site.hash;
            if (!compositeHash || !site.originalUrl) continue;
            if (site.domain && site.domain.toLowerCase().includes('localhost')) continue;
            if (!site.files || !site.files.includes('vuln.out') || !site.files.includes('sink.flows.out')) {
                continue;
            }

            const sitePath = getSitePathFromCompositeHash(compositeHash);
            if (!sitePath) continue;

            const flowFilePath = path.join(sitePath, 'sink.flows.out');
            let flowEntries = await readFlowEntriesCache(compositeHash, flowFilePath);
            if (!flowEntries) {
                try {
                    const flowContent = await cachedReadFile(flowFilePath, 'utf8');
                    flowEntries = parseFlowEntries(flowContent);
                    await writeFlowEntriesCache(compositeHash, flowFilePath, flowEntries);
                } catch (e) {
                    continue;
                }
            }

            const vulnFilePath = path.join(sitePath, 'vuln.out');
            let vulnContent = '';
            try {
                vulnContent = await cachedReadFile(vulnFilePath, 'utf8');
            } catch (e) {
                continue;
            }

            const libLocations = new Map();
            vulnContent.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const vulnData = JSON.parse(trimmed);
                    const urlKey = Object.keys(vulnData)[0];
                    const libs = vulnData[urlKey] || [];
                    libs.forEach(lib => {
                        const libname = normalizeToken(lib.libname);
                        const location = String(lib.location || '').trim();
                        if (!libname || !location) return;
                        if (!libLocations.has(libname)) {
                            libLocations.set(libname, new Set());
                        }
                        libLocations.get(libname).add(location);
                    });
                } catch (e) {
                    // ignore malformed lines
                }
            });

            if (libLocations.size === 0 || !flowEntries || flowEntries.length === 0) {
                continue;
            }

            const mismatches = [];
            flowEntries.forEach(entry => {
                const libname = normalizeToken(extractLibnameFromVulnInfo(entry.vulnInfo));
                if (!libname) return;
                const locations = libLocations.get(libname);
                if (!locations || locations.size === 0) return;

                const funcName = entry.func || '';
                const funcNorm = normalizeToken(funcName);
                const aliases = (libMapping[libname] || []).map(a => normalizeToken(a));
                const libNorm = normalizeToken(libname);

                locations.forEach(location => {
                    const locNorm = normalizeToken(location);
                    if (!locNorm) return;
                    const matchesMapping = aliases.includes(locNorm) || libNorm === locNorm;
                    const matchesFunction = funcNorm === locNorm || (funcNorm && funcNorm.includes(locNorm));
                    if (!matchesMapping && !matchesFunction) {
                        mismatches.push({
                            libname,
                            location,
                            function: funcName || '',
                            headerHash: entry.headerHash,
                            tags: entry.tags || []
                        });
                    }
                });
            });

            if (mismatches.length > 0) {
                results.push({
                    hash: compositeHash,
                    url: site.originalUrl,
                    domain: site.domain,
                    mismatches
                });
            }
        }

        res.json({ sites: results, count: results.length });
    } catch (error) {
        console.error('Error fetching vuln/POC location mismatches:', error);
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
                const empty = {
                    totalVulnLibs: 0,
                    uniqueLibs: 0,
                    sitesWithVulns: 0,
                    avgVulnsPerSite: 0,
                    topLibs: [],
                    vulnTypes: {},
                    versions: {},
                    confidenceScores: {}
                };
                await updateGlobalStatFile('vuln-stats', empty);
                return res.json(empty);
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

        // Get top 30 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        // Get top 30 versions
        const topVersions = Object.entries(versions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        const avgVulnsPerSite = sitesWithVulns > 0 ? (totalVulnLibs / sitesWithVulns).toFixed(2) : 0;

        const result = {
            totalVulnLibs,
            uniqueLibs: Object.keys(libCounts).length,
            sitesWithVulns,
            avgVulnsPerSite,
            topLibs,
            vulnTypes,
            versions: topVersions,
            confidenceScores
        };
        await updateGlobalStatFile('vuln-stats', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching vulnerability stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for POC match statistics by site ranking
app.get('/api/poc-match-stats', async (req, res) => {
    try {
        const data = await getCachedSiteData();
        const mode = req.query.mode === 'withFlows' ? 'withFlows' : 'all';
        if (pocMatchStatsCache[mode]) {
            return res.json(pocMatchStatsCache[mode]);
        }
        let sites = data.sites;
        if (mode === 'withFlows') {
            sites = sites.filter(site => site.hasFlows);
        }

        if (!sites || sites.length === 0) {
            const emptyResult = {
                totalPocMatchesIncludingNonReach: 0,
                sitesWithPocMatches: 0,
                rankingBuckets: [],
                topPocFunctions: []
            };
            if (!data.loading && !isUpdatingCache) {
                pocMatchStatsCache[mode] = emptyResult;
            }
            return res.json(emptyResult);
        }

        let totalPocMatchesIncludingNonReach = 0;
        let sitesWithPocMatches = 0;
        const functionCounts = {};
        const bucketData = {}; // bucket -> { pocCount, siteCount, functions: {}, urls: {}, files: {} }

        const mergeCounts = (target, source) => {
            if (!source) return;
            for (const [key, count] of Object.entries(source)) {
                target[key] = (target[key] || 0) + count;
            }
        };

        // Debug: log ranking data status and first few lookups
        console.log(`[POC-Stats] domainRankMap size: ${domainRankMap.size}, sites count: ${sites.length}`);
        if (domainRankMap.size > 0) {
            const sampleDomains = Array.from(domainRankMap.keys()).slice(0, 3);
            console.log(`[POC-Stats] Sample domains in map: ${sampleDomains.join(', ')}`);
        }

        let debugCount = 0;

        // Process each site from cache (already excludes localhost)
        for (const site of sites) {
            // Get ranking for this site
            const rank = site.rank ?? getRankingForUrl(site.originalUrl);

            // Debug logging for first 5 sites with flows
            if (debugCount < 5 && site.allFlowsCount > 0) {
                const domain = extractDomain(site.originalUrl);
                // console.log(`[POC-Stats Debug] originalUrl: "${site.originalUrl}", domain: "${domain}", rank: ${rank}`);
                debugCount++;
            }

            const bucketName = getBucketNameFromRank(rank);

            // Initialize bucket if needed
            if (!bucketData[bucketName]) {
                bucketData[bucketName] = {
                    pocCount: 0,
                    siteCount: bucketSiteCounts[bucketName] || 0,
                    functions: {},
                    urls: {},
                    files: {}
                };
            }

            // Use cached flow data
            const pocCountForMode = mode === 'withFlows' ? site.flowPocCount : site.allFlowsCount;
            const functionsForMode = mode === 'withFlows' ? site.flowPocFunctions : site.pocFunctions;
            const sourceUrlsForMode = mode === 'withFlows' ? site.flowPocSourceUrls : site.pocSourceUrls;
            const sourceFilesForMode = mode === 'withFlows' ? site.flowPocSourceFiles : site.pocSourceFiles;

            if (pocCountForMode > 0) {
                totalPocMatchesIncludingNonReach += pocCountForMode;
                bucketData[bucketName].pocCount += pocCountForMode;
                sitesWithPocMatches++;

                // Aggregate POC functions from cache
                if (functionsForMode) {
                    for (const [funcName, count] of Object.entries(functionsForMode)) {
                        functionCounts[funcName] = (functionCounts[funcName] || 0) + count;
                        bucketData[bucketName].functions[funcName] =
                            (bucketData[bucketName].functions[funcName] || 0) + count;
                    }
                }

                mergeCounts(bucketData[bucketName].urls, sourceUrlsForMode);
                mergeCounts(bucketData[bucketName].files, sourceFilesForMode);
            }
        }

        // Convert bucketData to sorted array
        const topEntries = (map, limit = 10) => Object.entries(map || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));

        const splitFunctionKey = (key) => {
            if (!key) return { library: '', name: '' };
            const parts = key.split(' | ');
            if (parts.length > 1) {
                return { library: parts[0], name: parts.slice(1).join(' | ') };
            }
            return { library: '', name: key };
        };

        const functionsToArray = (map) => Object.entries(map || {})
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => {
                const { library, name } = splitFunctionKey(key);
                return { library, name, count };
            });

        const rankingBuckets = Object.entries(bucketData)
            .map(([bucket, data]) => ({
                bucket,
                pocCount: data.pocCount,
                siteCount: data.siteCount,
                avgPocPerSite: data.siteCount > 0 ? (data.pocCount / data.siteCount) : 0,
                functions: functionsToArray(data.functions),
                topUrls: topEntries(data.urls, 12),
                topFiles: topEntries(data.files, 12),
                uniqueUrls: Object.keys(data.urls).length,
                uniqueFiles: Object.keys(data.files).length
            }))
            .sort((a, b) => {
                // Sort by bucket start number, with Unranked at the end
                if (a.bucket === 'Unranked') return 1;
                if (b.bucket === 'Unranked') return -1;
                const aStart = parseInt(a.bucket.split('-')[0]);
                const bStart = parseInt(b.bucket.split('-')[0]);
                return aStart - bStart;
            });

        // Get top 15 POC functions
        const allFunctionEntries = Object.entries(functionCounts)
            .sort((a, b) => b[1] - a[1]);
        const topPocFunctions = allFunctionEntries
            .slice(0, 15)
            .map(([key, count]) => {
                const { library, name } = splitFunctionKey(key);
                return { library, name, count };
            });

        const result = {
            totalPocMatchesIncludingNonReach,
            sitesWithPocMatches,
            uniquePocFunctions: allFunctionEntries.length,
            rankingBuckets,
            topPocFunctions
        };

        if (!data.loading && !isUpdatingCache) {
            pocMatchStatsCache[mode] = result;
        }

        await updateGlobalStatFile(`poc-match-stats:${mode}`, result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching POC match stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for detected libraries statistics
// API endpoint to get ranking for a URL
app.get('/api/ranking', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    const domain = extractDomain(url);
    const rank = getRankingForUrl(url);

    res.json({
        url,
        domain,
        rank,
        found: rank !== null
    });
});

// API endpoint for detected libraries statistics
app.get('/api/detected-libs', async (req, res) => {
    try {
        let parentDirs = [];
        try {
            parentDirs = await fs.readdir(DATA_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') {
                const empty = {
                    totalDetectedLibs: 0,
                    topLibs: []
                };
                await updateGlobalStatFile('detected-libs', empty);
                return res.json(empty);
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
                    if(!libDetectionContent) continue;
                    try {
                        const detectionData = JSON.parse(libDetectionContent);

                        // Iterate through each URL in the detection file
                        for (const urlKey in detectionData) {
                            const urlData = detectionData[urlKey];

                            // Create a set to track unique libraries detected in this file
                            const uniqueLibsInFile = new Set();

                            // Union of DEBUN and PTV only (exclude PTV-Bundler/PTV-Original)
                            const detectors = ['DEBUN', 'PTV-Original'];
                            console.log(`[Detected Libs] Processing URL: ${urlKey} with detectors: ${detectors.join(', ')}`);

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

        // Get top 30 libraries
        const topLibs = Object.entries(libCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        // Calculate total detected libs (sum of all counts)
        const totalDetectedLibs = topLibs.reduce((sum, lib) => sum + lib.count, 0);

        const result = {
            totalDetectedLibs,
            topLibs
        };
        await updateGlobalStatFile('detected-libs', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching detected libraries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, async () => {
    console.log(`JAW4C Read-Only UI listening at http://localhost:${port}`);
    console.log('UI is ready - cache will load in the background');

    const startupStart = process.hrtime.bigint();

    // Load ranking data (static, loaded once)
    const rankingStart = process.hrtime.bigint();
    await loadRankingData();
    const rankingEnd = process.hrtime.bigint();
    console.log(`[Startup] loadRankingData: ${Number(rankingEnd - rankingStart) / 1e6} ms`);

    // Initialize file cache directory
    const cacheDirStart = process.hrtime.bigint();
    await ensureCacheDir();
    const cacheDirEnd = process.hrtime.bigint();
    console.log(`[Startup] ensureCacheDir: ${Number(cacheDirEnd - cacheDirStart) / 1e6} ms`);

    // Initialize site data cache in background (non-blocking)
    // UI will show empty data until cache is ready
    // Use GET /api/cache-status to check when cache is loaded
    const cacheKickoffStart = process.hrtime.bigint();
    updateCacheInBackground();
    const cacheKickoffEnd = process.hrtime.bigint();
    console.log(`[Startup] updateCacheInBackground kickoff: ${Number(cacheKickoffEnd - cacheKickoffStart) / 1e6} ms`);

    const startupEnd = process.hrtime.bigint();
    console.log(`[Startup] total: ${Number(startupEnd - startupStart) / 1e6} ms`);
});

// Periodic cache refresh (every 1 hour)
// setInterval(() => {
//     if (!isUpdatingCache) {
//         console.log('[Cache] Hourly cache refresh triggered');
//         updateCacheInBackground();
//     }
// }, 60 * 60 * 1000); // 1 hour = 3600000 ms

// Periodic file cache statistics logging (every 30 seconds)
setInterval(() => {
    const total = cacheStats.hits + cacheStats.misses;
    if (total > 0) {
        logCacheStats();
        // Reset stats after logging to keep them fresh
        resetCacheStats();
    }
}, 60 * 10 * 1000);
