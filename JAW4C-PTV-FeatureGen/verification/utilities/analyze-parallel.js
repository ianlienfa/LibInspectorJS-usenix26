const fs = require('fs');
const path = require('path');
const os = require('os');
const {PTV, PTVOriginal} = require('../index.js'); 

/*
  - node analyze-p-debug.js -F to force retest all libraries
  - node analyze-p-debug.js --library "libraryname" to test a specific library
  - node analyze-p-debug.js -l '["lib1","lib2"]' to test multiple specific libraries

  for port in {6548..6563}; do
  tmux new-session -d -s "server_$port" "python3 app.py -p $port; exec bash"
done
*/

const detectorLibraryPath = '/Users/xxxx/yyyy/zzzz-JSBundle/Bundle-PTV/data/libraries.json';
const libDataPath = '/Users/xxxx/yyyy/zzzz-JSBundle/PTdetector-feature-gen/static/libs_data';
const versionDataPath = '../logs/versions';
const PTVExtensionPath = '/Users/xxxx/yyyy/zzzz-JSBundle/Bundle-PTV'
const PTVOriginalExtensionPath = '~/yyyy/zzzz-JSBundle/PTV';

// THREAD-SAFE REPLACEMENT: Multiple server URLs instead of single URL
const app_py_base_urls = [
    "http://127.0.0.1:6548/test",
    "http://127.0.0.1:6549/test", 
    "http://127.0.0.1:6550/test",
    "http://127.0.0.1:6551/test",
    "http://127.0.0.1:6552/test",
    "http://127.0.0.1:6553/test",
    "http://127.0.0.1:6554/test",
    "http://127.0.0.1:6555/test",
    "http://127.0.0.1:6556/test",
    "http://127.0.0.1:6557/test",
    "http://127.0.0.1:6558/test",
    "http://127.0.0.1:6559/test",
    "http://127.0.0.1:6560/test",
    "http://127.0.0.1:6561/test",
    "http://127.0.0.1:6562/test",
    "http://127.0.0.1:6563/test"
];

// THREAD-SAFE REPLACEMENT: Deterministic server selection by worker ID
const getServerUrlByWorkerId = (workerId) => {
    const serverIndex = workerId % app_py_base_urls.length;
    return app_py_base_urls[serverIndex];
};

// THREAD-SAFE REPLACEMENT: Random server selection function (fallback)
const getRandomServerUrl = () => {
    const randomIndex = Math.floor(Math.random() * app_py_base_urls.length);
    return app_py_base_urls[randomIndex];
};

const {compare, validate} = require('compare-versions');
const { exit } = require('process');

// Worker pool management
class WorkerPool {
    constructor(workerCount = 16) {
        this.workers = [];
        this.jobQueue = [];
        this.activeJobs = new Map(); // workerId -> job mapping
        this.workerCount = workerCount;
        this.completedJobs = 0;
        this.totalJobs = 0;
        
        console.log(`Initializing worker pool with ${workerCount} workers`);
    }
    
    // Add a job to the queue
    addJob(job) {
        this.jobQueue.push(job);
        this.totalJobs++;
        this.processQueue();
    }
    
    // Process the job queue - dispatcher logic
    async processQueue() {
        // Find available workers (not in activeJobs)
        const availableWorkers = [];
        for (let i = 0; i < this.workerCount; i++) {
            if (!this.activeJobs.has(i)) {
                availableWorkers.push(i);
            }
        }
        
        // Assign jobs to available workers
        while (availableWorkers.length > 0 && this.jobQueue.length > 0) {
            const workerId = availableWorkers.shift();
            const job = this.jobQueue.shift();
            
            // Mark worker as busy
            this.activeJobs.set(workerId, job);
            
            // Process job asynchronously - THIS IS WHERE JOB COMPLETION IS TRACKED
            this.processJob(workerId, job).catch(error => {
                console.error(`Worker ${workerId} error:`, error);
            }).finally(() => {
                // JOB COMPLETION DETECTION: Remove from activeJobs when done
                this.activeJobs.delete(workerId);
                this.completedJobs++;
                
                console.log(`Worker ${workerId} finished. Progress: ${this.completedJobs}/${this.totalJobs}`);
                
                // Continue processing queue after job completion
                this.processQueue();
            });
        }
    }
    
    // Process a single job
    async processJob(workerId, job) {
        console.log(`Worker ${workerId} starting job: ${job.libname}`);
        try {
            // Pass workerId to the job for deterministic server selection
            job.workerId = workerId;
            const result = await job.processor(job);
            
            // Save detection logs if they exist
            if (result && result.detectionLogs) {
                await saveLibraryResults(result.libname, result.detectionLogs);
            }
            
            console.log(`Worker ${workerId} completed job: ${job.libname}`);
            return result;
        } catch (error) {
            console.error(`Worker ${workerId} failed job: ${job.libname}`, error);
            throw error;
        }
    }
    
    // Wait for all jobs to complete - NO TIME LIMITS, just polls every 1 second
    async waitForCompletion() {
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (this.jobQueue.length === 0 && this.activeJobs.size === 0) {
                    console.log(`All jobs completed: ${this.completedJobs}/${this.totalJobs}`);
                    resolve();
                } else {
                    // Check every 1 second (1000ms) - no timeout limits, can run for hours
                    setTimeout(checkCompletion, 1000);
                }
            };
            checkCompletion();
        });
    }
    
    // Graceful shutdown - immediately stop processing and exit
    async gracefulShutdown() {
        console.log('\nReceived shutdown signal. Stopping worker pool...');
        console.log(`Status at shutdown: ${this.activeJobs.size} active jobs, ${this.jobQueue.length} queued jobs`);
        console.log(`Completed: ${this.completedJobs}/${this.totalJobs} jobs`);
        
        // Clear the job queue immediately to prevent new jobs
        this.jobQueue.length = 0;
        
        // Don't wait for active jobs - just report and exit quickly
        if (this.activeJobs.size > 0) {
            console.log(`Terminating ${this.activeJobs.size} active jobs immediately`);
            const activeLibraries = Array.from(this.activeJobs.values()).map(job => job.libname);
            console.log(`Active libraries being terminated: ${activeLibraries.join(', ')}`);
        }
        
        console.log('Worker pool shutdown completed');
    }
    
    // Get status
    getStatus() {
        return {
            activeJobs: this.activeJobs.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs,
            totalJobs: this.totalJobs,
            totalWorkers: this.workerCount
        };
    }
}

// Timeout wrapper for PTV function
const withTimeout = (promise, timeoutMs) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

// Function to create simplified detection result for logging
const createDetectionLog = (libname, index, groundTruthVersion, libMatch, versionMatch, detectedVersion = null, error = null) => {
    return {
        testId: `${libname}_${index}`,
        library: libname,
        versionIndex: index,
        timestamp: new Date().toISOString(),
        groundTruth: {
            library: libname,
            version: groundTruthVersion
        },
        detectedVersion: detectedVersion,
        evaluation: {
            libraryDetected: libMatch,
            versionMatched: versionMatch,
            error: error ? error.toString() : null
        }
    };
};

// Function to save individual test results and final summary
const saveLibraryResults = async (libname, detectionLogs) => {
    const logDir = path.join(__dirname, '../logs/analysis');
    const logPath = path.join(logDir, `${libname}_results.json`);
    
    // Calculate summary statistics
    const totalTests = detectionLogs.length;
    const successfulTests = detectionLogs.filter(log => !log.evaluation.error).length;
    const libraryDetections = detectionLogs.filter(log => log.evaluation.libraryDetected).length;
    const versionMatches = detectionLogs.filter(log => log.evaluation.versionMatched).length;
    const errorTests = detectionLogs.filter(log => log.evaluation.error).length;
    const versionMatchRate = totalTests > 0 ? (versionMatches / totalTests) : 0;
    
    // Collect misdetection versions (unique only, excluding null/undefined)
    const misdetectionVersionsSet = new Set();
    const misdetectionVersions = detectionLogs
        .filter(log => !log.evaluation.error && (!log.evaluation.libraryDetected || 
            !log.evaluation.versionMatched))
        .map(log => log.detectedVersion)
        .filter(version => version != null) // Filter out null and undefined
        .filter(version => version != "") // Filter out null and undefined
        .filter(version => {
            if (misdetectionVersionsSet.has(version)) {
                return false;
            }
            misdetectionVersionsSet.add(version);
            return true;
        });
    
    const summary = {
        library: libname,
        analysisTimestamp: new Date().toISOString(),
        summary: {
            totalVersionsTested: totalTests,
            successfulTests: successfulTests,
            testsWithErrors: errorTests,
            libraryDetectionCount: libraryDetections,
            versionMatchCount: versionMatches,
            libraryDetectionRate: totalTests > 0 ? (libraryDetections / totalTests) : 0,
            versionMatchRate: versionMatchRate,
            overallDetectionRate: versionMatchRate
        },
        misdetectionVersions: misdetectionVersions,
        detailedResults: detectionLogs
    };
    
    // Include version data if match rate is below 80%
    if (versionMatchRate < 0.8) {
        try {
            const versionFilePath = path.join(versionDataPath, `${libname}.json`);
            if (fs.existsSync(versionFilePath)) {
                const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
                summary.versionData = versionData;
                console.log(`Added version data for ${libname} (match rate: ${(versionMatchRate*100).toFixed(1)}%)`);
            } else {
                console.warn(`Version file not found: ${versionFilePath}`);
            }
        } catch (error) {
            console.error(`Failed to load version data for ${libname}: ${error}`);
        }
    }
    
    try {
        fs.writeFileSync(logPath, JSON.stringify(summary, null, 2));
        console.log(`Detailed results for ${libname} saved to ${logPath}`);
        console.log(`${libname} Summary: ${versionMatches}/${totalTests} versions matched (${(versionMatches/totalTests*100).toFixed(1)}%)`);
        
        // Update global error.json file
        updateGlobalErrorFile(libname, misdetectionVersions);
        
    } catch (error) {
        console.error(`Failed to save results for ${libname}: ${error}`);
    }
};

// Function to maintain global error.json file
const updateGlobalErrorFile = (libname, misdetectionVersions) => {
    const errorFilePath = path.join(__dirname, '../error.json');
    
    try {
        let errorData = {};
        
        // Read existing error data if file exists
        if (fs.existsSync(errorFilePath)) {
            try {
                errorData = JSON.parse(fs.readFileSync(errorFilePath, 'utf8'));
            } catch (parseError) {
                console.warn(`Failed to parse existing error file, starting fresh: ${parseError}`);
                errorData = {};
            }
        }
        
        // Add or update library entry
        errorData[libname] = {
            lastUpdated: new Date().toISOString(),
            misdetectionCount: misdetectionVersions.length,
            misdetections: misdetectionVersions
        };
        
        // Atomic write to prevent corruption
        const tempFilePath = `${errorFilePath}.tmp`;
        fs.writeFileSync(tempFilePath, JSON.stringify(errorData, null, 2));
        fs.renameSync(tempFilePath, errorFilePath);
        
        if (misdetectionVersions.length > 0) {
            console.log(`Updated error.json with ${misdetectionVersions.length} misdetections for ${libname}`);
        } else {
            console.log(`Updated error.json with clean result for ${libname}`);
        }
        
    } catch (error) {
        console.error(`Failed to update global error file for ${libname}: ${error}`);
    }
};

// Library processing function for worker pool
async function processLibraryJob(job) {
    const { libname, libIndex, version_obj, fileList, workerId, timeoutMs = 100000 } = job;
    
    // Get dedicated server URL for this worker
    const serverBaseUrl = getServerUrlByWorkerId(workerId);
    
    console.log(`Worker ${workerId} processing ${libname} with ${Object.keys(version_obj).length} versions using server ${serverBaseUrl} (timeout: ${timeoutMs}ms)`);
    
    let matches = 0;
    const versionKeys = Object.keys(version_obj);
    const detectionLogs = [];
    
    for (const index of versionKeys) {
        // Use worker-specific server URL
        const url = `${serverBaseUrl}/${libname}/${index}`;
        
        const PTVPuppeteerLaunchConfig = {
            headless: true,
            args: [              
                `--disable-extensions-except=${PTVExtensionPath}`,
                `--load-extension=${PTVExtensionPath}`,
                `--ignore-certificate-errors`,
                `--disk-cache-dir=/tmp/chrome_cache_${process.pid}_${workerId}_${Date.now()}`, // Include worker ID in cache
                `--disk-cache-size=1`
            ]
        };
        
        try {
            // Apply timeout to PTV function
            const resPTV = await withTimeout(
                PTV(url, PTVPuppeteerLaunchConfig, false, false, 100000),
                timeoutMs
            );
            
            const truth_version = fileList?.[libname]?.[index]?.['version'];
            let lib_match = false;
            let version_match = false;
            let detected_version = ""
            let processingError = null;
            
            // console.log(`for ${libname}: resPTV?.["detection"]?.[0]: ${JSON.stringify(resPTV?.["detection"])}`)
            if (resPTV?.["detection"]?.[0]?.some((x) => {
                try {
                    detected_version = x?.['version']
                    if (x?.['libname'] === libname) {
                        lib_match = true;
                        if (version_matching(truth_version, x?.['version'])) {
                            console.log(`[Worker ${workerId}] [${index}/${versionKeys.length}] - [matched: ${matches}/${versionKeys.length}] [${libIndex}]${libname} at version ${truth_version} matched`);
                            matches += 1;
                            version_match = true;
                            detected_version = x?.['version']
                            return true;
                        }
                        console.error(`[Worker ${workerId}] [${index}/${versionKeys.length}] - [${matches}/${versionKeys.length}] version unmatch for [${libIndex}]${libname}, detector: ${x?.['version']}, truth: ${truth_version}`);
                        return false;
                    }
                    return false;
                } catch (error) {
                    console.error(`[Worker ${workerId}] [${index}/${versionKeys.length}] - [${matches}/${versionKeys.length}] version error for [${libIndex}]${libname}, detector: ${x?.['version']}, truth: ${truth_version}, error: ${error}`);
                    processingError = error;
                    return false;
                }
            })) {
                // Match found and logged above
            }
            
            if (!lib_match) {
                console.error(`[Worker ${workerId}] [${index}/${versionKeys.length}] - [${matches}/${versionKeys.length}] library unmatch for [${libIndex}]${libname}, detector: ${JSON.stringify(resPTV?.["detection"]?.[0])}, truth: ${truth_version}`);
                // break // remove early halt for now since the library detection not always happen for a library across versions
            }
            
            // Create detailed log entry
            const detectionLog = createDetectionLog(libname, index, truth_version, lib_match, version_match, detected_version, processingError);
            detectionLogs.push(detectionLog);
            
        } catch (error) {
            if (error.message.includes('Timeout')) {
                console.error(`[Worker ${workerId}] Timeout processing ${libname}[${index}] after ${timeoutMs}ms`);
            } else {
                console.error(`[Worker ${workerId}] Error processing ${libname}[${index}]: ${error}`);
            }
            
            const truth_version = fileList?.[libname]?.[index]?.['version'];
            const detectionLog = createDetectionLog(libname, index, truth_version, false, false, null, error);
            detectionLogs.push(detectionLog);
        }
    }
    
    console.error(`[Worker ${workerId}] [${libIndex}]${libname} detection rate: ${matches}/${versionKeys.length} = ${matches/versionKeys.length}`);
    
    return {
        libname,
        matches,
        totalVersions: versionKeys.length,
        detectionRate: matches/versionKeys.length,
        detectionLogs: detectionLogs
    };
}

// THREAD-SAFE REPLACEMENT: Fixed global variable declarations
function version_matching(version_str, detector_str){
    if(version_str === detector_str){
        return true;
    }
    else{
        // THREAD-SAFE: Use let instead of implicit globals
        let right_versions = detector_str.split(",")
        right_versions = right_versions.map(element => {
            let start_end = element.split('~')
            start_end = start_end.map(x => x.trim())
            return start_end
        });
        console.log("right_versions", right_versions)
        return right_versions.some(start_end => {
            let match = false            
            if(start_end.length === 1){                
                match = (version_str === start_end?.[0]) ? true : false           
            }
            else if(start_end.length === 2){
                if(!start_end.every(x => validate(x))){ // make sure the range versions are comparable
                    return false
                }
                match = (compare(version_str, start_end?.[0], ">=") && compare(version_str, start_end?.[1], "<=")) ? true : false;
            }
            else{
                console.error("version_matching error, should not be here")
            }
            return match
        })
    }
}

if (require.main === module) {
    (async () => {
        // Parse command line arguments
        const forceRetest = process.argv.includes('-F');
        const targetLibraryIndex = process.argv.findIndex(arg => arg === '--library' || arg === '-l');
        let targetLibraries = [];
        
        if (targetLibraryIndex !== -1 && targetLibraryIndex < process.argv.length - 1) {
            const libraryArg = process.argv[targetLibraryIndex + 1];
            try {
                // Try to parse as JSON array first
                const parsed = JSON.parse(libraryArg);
                if (Array.isArray(parsed)) {
                    targetLibraries = parsed;
                } else {
                    targetLibraries = [parsed.toString()];
                }
            } catch (e) {
                // If not valid JSON, treat as single library name
                targetLibraries = [libraryArg];
            }
        }
        
        const logDir = path.join(__dirname, '../logs/analysis');
        
        // Ensure log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Remove error.json if force retest is enabled
        const errorFilePath = path.join(__dirname, '../error.json');
        if (forceRetest && fs.existsSync(errorFilePath)) {
            fs.unlinkSync(errorFilePath);
            console.log('Removed existing error.json due to -F flag');
        }
        
        // Function to check if library has already been tested
        const isAlreadyTested = (libname) => {
            if (forceRetest) return false;
            // Force retest for target libraries when specified
            if (targetLibraries.length > 0 && targetLibraries.includes(libname)) return false;
            const logPath = path.join(logDir, `${libname}_results.json`);
            return fs.existsSync(logPath);
        };
        
        const libfilesList = fs.readdirSync(libDataPath);
        const fileList = {};
        
        // Getting the feature generation part lib name array and the corresponding version information
        for (const libfile of libfilesList) {
          if (!libfile.endsWith('.json')) {
            console.error('Only JSON files are allowed in the static/libs_data folder.');
            process.exit(1);
          }
        
          const filePath = path.join(libDataPath, libfile);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const libname = libfile.slice(0, -5); // remove ".json"
          fileList[libname] = JSON.parse(fileContent);
        }
        
        // Getting the detector part of library names
        // THREAD-SAFE REPLACEMENT: Use let instead of implicit global
        let detector_libs = {}
        const detector_libs_file = fs.readFileSync(detectorLibraryPath, 'utf8')
        detector_libs = JSON.parse(detector_libs_file) // [{"libname": ..., ...}, {}, {}]
        
        // Create worker pool for parallel library processing
        const workerPool = new WorkerPool(); // Will use CPU count or 4 workers
        
        // Setup signal handlers for graceful shutdown
        const setupSignalHandlers = () => {
            const gracefulExit = async (signal) => {
                console.log(`\nReceived ${signal} signal`);
                await workerPool.gracefulShutdown();
                process.exit(0);
            };
            
            process.on('SIGINT', () => gracefulExit('SIGINT'));   // Ctrl+C
            process.on('SIGTERM', () => gracefulExit('SIGTERM')); // kill command
            process.on('SIGQUIT', () => gracefulExit('SIGQUIT')); // kill -QUIT
        };
        
        setupSignalHandlers();
        
        // Matching detector library with their versions and do verification using worker pool
        // const test_arr = []
        
        console.log(`Starting parallel processing of ${detector_libs.length} libraries with ${workerPool.workerCount} workers`);
        
        // Queue all libraries as jobs
        for(let i = 0; i < detector_libs.length; i++){
            const lib = detector_libs[i]
            const libname = lib["libname"]   
            // if(!test_arr.includes(libname)){
            //     continue
            // }
            
            // If specific libraries are targeted, only process those
            if (targetLibraries.length > 0 && !targetLibraries.includes(libname)) {
                continue;
            }
            
            // Skip already tested libraries unless -F flag is provided
            console.log(`Start isAlreadyTested testing on ${libname}`)
            if (isAlreadyTested(libname)) {
                console.log(`Skipping ${libname} - already tested (use -F to force retest)`);
                continue;
            }
            console.log(`${libname} hasn't been tested`)
            
            const version_obj = fileList?.[libname];
            if (!version_obj) {
                console.warn(`No version data found for library: ${libname}`);
                continue;
            }
            
            // Create job for this library
            const job = {
                libname: libname,
                libIndex: i,
                version_obj: version_obj,
                fileList: fileList,
                timeoutMs: 100000, // 100 second timeout per version
                processor: processLibraryJob // The function that will process this library
            };
            
            // Add job to worker pool queue
            workerPool.addJob(job);
        }
        
        console.log(`Queued ${workerPool.totalJobs} libraries for processing`);
        
        // Wait for all jobs to complete (can run for hours, no time limits)
        await workerPool.waitForCompletion();
        
        console.log('All library processing jobs completed!');        
    })();
}

module.exports = { version_matching };