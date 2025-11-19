const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- Constants ---
const JAW4C_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(JAW4C_DIR, 'JAW4C-JAW', 'data');

// --- Data Fetching and Processing ---

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

    const allSitesData = [];
    for (const parentDir of parentDirs) {
        const parentPath = path.join(DATA_DIR, parentDir);
        const parentStats = await fs.stat(parentPath);
        if (!parentStats.isDirectory()) continue;

        // Try to read the hash mapping file for this parent directory
        let hashToUrlMap = new Map();
        try {
            const mappingContent = await fs.readFile(path.join(parentPath, 'urls.hashes.out'), 'utf8');
            mappingContent.split('\n').forEach(line => {
                if (line) {
                    const [hash, url] = line.split(' ');
                    if (hash && url) {
                        hashToUrlMap.set(hash, url);
                    }
                }
            });
        } catch (e) {
            // If urls.hashes.out doesn't exist, we'll just use hashes as names
        }
        
        const siteHashes = await fs.readdir(parentPath);
        for (const hash of siteHashes) {
            const sitePath = path.join(parentPath, hash);
            const siteStats = await fs.stat(sitePath);
            if (!siteStats.isDirectory()) continue;

            const siteName = hashToUrlMap.get(hash) || `${parentDir}/${hash}`;

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
            for (const file of importantFiles) {
                try {
                    await fs.access(path.join(sitePath, file));
                    availableFiles.push(file);
                } catch (e) { /* File doesn't exist */ }
            }

            allSitesData.push({
                hash: `${parentDir}/${hash}`, // Use a composite hash for uniqueness
                name: siteName,
                hasFlows,
                pocMatches,
                vulnerableLibs,
                files: availableFiles,
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
    const { hash, file } = req.query;
    if (!hash || !file || file.includes('..') || hash.includes('..')) {
        return res.status(400).send('Invalid request');
    }

    const filePath = path.join(DATA_DIR, hash, file);
    try {
        const content = await fs.readFile(filePath, 'utf8');
        res.type('text/plain').send(content);
    } catch (error) {
        res.status(404).send('File not found or could not be read.');
    }
});

app.listen(port, () => {
    console.log(`JAW4C Read-Only UI listening at http://localhost:${port}`);
});