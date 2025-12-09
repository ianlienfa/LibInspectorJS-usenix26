const puppeteer = require('puppeteer');
const { chromium } = require('playwright');
const path = require('path');
const lift = require('./utilities/lift');
const crawl = require('./utilities/crawl');
const crawler = require('../crawler/crawler');
const fs = require('fs');
const logger = require('./utilities/logger');
const LOGGER = logger.info
const {parseUrl} = require('./utilities/webtools');
const { PTdetectorExtensionPath, PTdetectorExtensionId, PTVExtensionPath, PTVOriginalExtensionPath, ProxyServerPath, PTVPuppeteerLaunchConfig, PTVOriginalLaunchConfig } = require('./config')
const { Command } = require('commander');
const { exit } = require('process');

// DEBUN library detection path
const debunPath = path.resolve(__dirname, '../../JAW4C-DEBUN');
const debunScriptPath = path.join(debunPath, 'debun.sh');

function createStartCrawlUrl(url) {
  const condition = 'soak';
  const query = new URLSearchParams({
    target: url,
    type: condition
  });
  const q = encodeURIComponent(query.toString())
  return `http://240.240.240.240/%3F${q}`;
}

const DEBUN = async (dataDir = "") => {
  // Run DEBUN library detection on original scripts
  let result = {
    detection: []
  };

  try {
    // Validate input directory
    if (!dataDir || typeof dataDir !== 'string') {
      logger.warn(`Invalid dataDir provided to DEBUN: ${dataDir}`);
      return result;
    }

    logger.info(`Running DEBUN detection on ${dataDir}`);

    // DEBUN expects JavaScript files named as 0.js, 1.js, etc.
    const originalDir = path.join(dataDir, 'original');

    // Use the original directory if it exists, otherwise use dataDir
    const scriptsDir = fs.existsSync(originalDir) ? originalDir : dataDir;

    // Check if directory exists
    if (!fs.existsSync(scriptsDir)) {
      logger.warn(`Scripts directory does not exist: ${scriptsDir}`);
      return result;
    }

    // Check if directory has any JavaScript files
    const files = fs.readdirSync(scriptsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    if (jsFiles.length === 0) {
      logger.warn(`No JavaScript files found in: ${scriptsDir}`);
      return result;
    }

    logger.info(`Using scripts directory: ${scriptsDir}`);

    // Call DEBUN from command line
    const { execSync } = require('child_process');
    const debunCommand = `${debunScriptPath} detect --dir "${scriptsDir}"`;

    logger.info(`Executing: ${debunCommand}`);

    let output;
    try {
      output = execSync(debunCommand, {
        cwd: debunPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000 // 60 second timeout
      });
    } catch (execError) {
      // Handle command execution errors
      logger.error(`DEBUN command failed: ${execError.message}`);
      if (execError.stderr) {
        logger.error(`DEBUN stderr: ${execError.stderr}`);
      }
      return result;
    }

    // Validate output
    if (!output || typeof output !== 'string') {
      logger.warn('DEBUN produced no output');
      return result;
    }

    // Parse the output to extract detected libraries
    // Output format is "DETECTED LIBRARIES:\nlibrary@version\nlibrary@version\n..."
    const lines = output.split('\n');
    const detectionStartIndex = lines.findIndex(line => line.includes('DETECTED LIBRARIES:'));

    const detections = [];
    if (detectionStartIndex !== -1) {
      for (let i = detectionStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines, loading messages, and error messages
        if (line &&
            !line.startsWith('Loading') &&
            !line.toLowerCase().includes('error') &&
            !line.toLowerCase().includes('warning')) {
          // Parse library@version format
          const match = line.match(/^(.+?)@(.+)$/);
          if (match) {
            const library = match[1].trim();
            const version = match[2].trim();
            // replace '@' with ', ' in version 
            const formattedVersion = version.replace(/@/g, ', ');
            // Validate library name and version
            if (library && formattedVersion && library.length > 0 && formattedVersion.length > 0) {
              detections.push({
                libname: library,
                version: formattedVersion
              });
            }
          }
        }
      }
    }

    logger.info(`DEBUN detected ${detections.length} libraries`);

    result.detection = [detections];

    return result;

  } catch (error) {
    // Catch any unexpected errors
    logger.error(`Unexpected error in DEBUN detection: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    // Always return valid structure
    return result;
  }
};

const PTVOriginal = async (url, launchConfig, dataDir = "") => {
  // visit a page with original (non-lifted) scripts
  let result = {}
  try {
    // Create temp user data directory for extension support
    const os = require('os');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-'));

    // Convert Puppeteer config to Playwright config
    const playwrightConfig = {
      channel: 'chromium',
      headless: launchConfig.headless !== false,
      args: launchConfig.args || [],
      ignoreHTTPSErrors: true
    };

    const browser = await chromium.launchPersistentContext(userDataDir, playwrightConfig);
    const page = await browser.newPage();

    await page.addInitScript(() => {
      window._eventLog = [];
      window.addEventListener("message", e => {
          if (e.data.type == 'response') {
            console.log("PTV Original message received!", JSON.stringify(e.data));
            _eventLog.push(e.data.detected_libs);
            window.detectionReady = true;
          }
      });
    });

    page.on('console', msg => {
      LOGGER('PAGE LOG:' + msg.text().substring(0, 500));
    });

    // Request interception with Playwright
    if(fs.existsSync(dataDir)){
      const overrideMappingPath = path.join(dataDir, 'override_mapping.json')
      const overrideMappingData = JSON.parse(fs.readFileSync(overrideMappingPath, 'utf8'))

      // PTVOriginal should use original mapping (not lift or transform)
      let overrideMapping = {};
      if(overrideMappingData.original) {
        overrideMapping = overrideMappingData.original;
      } else {
        overrideMapping = overrideMappingData;
      }

      // Playwright request interception
      await page.route('**/*', async (route) => {
        try {
          const requestUrl = route.request().url();
          logger.info(`[PTVOriginal] Requested URL: ${requestUrl}`);
          if (requestUrl in overrideMapping) {
            logger.info(`[PTVOriginal] Intercepting ${requestUrl} -> ${overrideMapping[requestUrl]}`);
            const fileContent = fs.readFileSync(overrideMapping[requestUrl]);
            await route.fulfill({
              status: 200,
              contentType: 'application/javascript',
              body: fileContent
            });
          } else {
            await route.continue();
          }
        } catch (error) {
          logger.error(`[PTVOriginal] Route handler error for ${route.request().url()}: ${error}`);
          // Fallback: try to continue the request normally
          try {
            await route.continue();
          } catch (continueError) {
            logger.error(`[PTVOriginal] Failed to continue route: ${continueError}`);
            // If we can't continue, abort the request
            await route.abort('failed');
          }
        }
      });
    }

    try {
      await page.goto(url, {waitUntil: 'load'});
    } catch (error) {
      logger.error(`Failed visiting ${url}: ${error}`)
    }

    LOGGER("waiting for extension detection...")
    try {
      await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

      result["detection"] = await page.evaluate(() => {
        return window._eventLog
      });
    } catch (timeoutError) {
      logger.warn(`PTV Orginal extension detection timeout for ${url} - continuing with available data`);
      result["detection"] = [];
    }

    await browser.close();

    // Clean up temp user data directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temp directory ${userDataDir}: ${cleanupError}`);
    }

    return result;

  } catch (error) {
    logger.error(`[PTVOriginal] error visiting ${url}`, error)
    console.error('Stack trace:', error.stack);
    return result;
  }
};

const PTV = async (url, launchConfig, dataDir = "") => {
  /*
	override_mapping should be in form
  {
		'lift': {},
		'transform': {},
		'original': {}
	} 
  */


  let result = {}

  try {
    // Create temp user data directory for extension support
    const os = require('os');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-'));

    // Convert Puppeteer config to Playwright config
    const playwrightConfig = {
      channel: 'chromium',
      headless: launchConfig.headless !== false,
      args: launchConfig.args || [],
      ignoreHTTPSErrors: true
    };

    const browser = await chromium.launchPersistentContext(userDataDir, playwrightConfig);
    const page = await browser.newPage();

    await page.addInitScript(() => {
      window._eventLog = [];
      window.addEventListener("message", e => {
          if (e.data.type == 'response') {
            console.log("PTV message received!", JSON.stringify(e.data));
            _eventLog.push(e.data.detected_libs);
            window.detectionReady = true;
          }
      });
    });

    // page.on('console', msg => {
    //   LOGGER('PAGE LOG:' + msg.text());
    // });

    // Request interception with Playwright
    if(fs.existsSync(dataDir)){
      const overrideMappingPath = path.join(dataDir, 'override_mapping.json')
      const overrideMappingData = JSON.parse(fs.readFileSync(overrideMappingPath, 'utf8'))

      // Library detection should only use lift mapping (not transform)
      let overrideMapping = {};
      if(overrideMappingData.lift) {
        overrideMapping = overrideMappingData.lift;
      } else {
        overrideMapping = overrideMappingData;
      }
      for(key of Object.keys(overrideMappingData.original)){
        if(overrideMapping[key] === undefined){
          overrideMapping[key] = overrideMappingData.original[key]
        }
      }

      // Playwright request interception
      await page.route('**/*', async (route) => {
        try {
          const requestUrl = route.request().url();
          // logger.info(`[Playwright] Requested URL: ${requestUrl}`);
          if (requestUrl in overrideMapping) {
            logger.info(`[Playwright] Intercepting ${requestUrl} -> ${overrideMapping[requestUrl]}`);
            const fileContent = fs.readFileSync(overrideMapping[requestUrl]);
            await route.fulfill({
              status: 200,
              contentType: 'application/javascript',
              body: fileContent
            });
          } else {
            await route.continue();
          }
        } catch (error) {
          logger.error(`[PTV] Route handler error for ${route.request().url()}: ${error}`);
          // Fallback: try to continue the request normally
          try {
            await route.continue();
          } catch (continueError) {
            logger.error(`[PTV] Failed to continue route: ${continueError}`);
            // If we can't continue, abort the request
            await route.abort('failed');
          }
        }
      });
    }

    try {
      await page.goto(url, {waitUntil: 'load'});
    } catch (error) {
      logger.error(`Failed visiting ${url}: ${error}`)
    }

      // Collect lift_arr_str
    try {
      result["lift_arr_str"] = await page.evaluate(() => {
        try {
          if (typeof lift_arr !== 'undefined') {
            console.log("lift_arr:", JSON.stringify(lift_arr));
            return lift_arr;
          } else {
            console.log("lift_arr is not defined on this page.");
          }
        } catch (e) {
          console.log("Error checking lift_arr:", e.toString());
        }
        return "";
      });

      // Collect webpackObjStr
      result["webpackObjStr"] = await page.evaluate(() => {
        const webpackObjs = Object.getOwnPropertyNames(window).filter(x => x.includes('webpack'));
        let returnObj = {};
        str = ""
        for (const i of webpackObjs) {
          let mod_wrap;
          try {
            mod_wrap = eval(`window.${i}`);
          } catch (e) {
            console.log(`Failed to eval window.${i}:`, e.message);
            continue;
          }

          returnObj["mod_wrap"] = mod_wrap;

          if (mod_wrap && typeof mod_wrap[Symbol.iterator] === 'function') {
            for (const j of mod_wrap) {
              if (j?.[1]) {
                const keys = Object.keys(j[1]);
                str += JSON.stringify(keys) + ";";
              }
            }
          } else {
            str += `[non-iterable:${i}];`;
          }
        }
        returnObj["str"] = str;
        return returnObj;
      });
    } catch (e) {
      logger.error(`Error collecting lift/webpack data: ${e}`);
    }

    // Wait for detection with timeout handling
    LOGGER("waiting for extension detection...")
    try {
      await page.waitForFunction(() => window.detectionReady === true, { timeout: 60000 });

      LOGGER("waiting for eventLog")
      result["detection"] = await page.evaluate(() => {
        console.log("Evaluating event log...", window._eventLog);
        return window._eventLog
      });
    } catch (timeoutError) {
      logger.warn(`PTV extension detection timeout for ${url} - continuing with available data`);
      result["detection"] = [];
    }

    LOGGER("waiting for browser close...")
    await browser.close();

    // Clean up temp user data directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temp directory ${userDataDir}: ${cleanupError}`);
    }

    result = Object.fromEntries(
      Object.entries(result).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    );

    return result;

  } catch (error) {
    logger.error(`[PTV] error visiting ${url}`, error)
    // console.error('Stack trace:', error.stack);
    debugger;
    return result;
  }
};



module.exports = {PTV, PTVOriginal, DEBUN};



// Run PTdetector if this file is run directly
if (require.main === module) {
  (async () => {

    const program = new Command()
    program
        .name('js-ld')
        .description('Javascript lifter-detector JAW api')
        .version('0.0.0');

    program
        .option('-l, --path <path>', 'the path to the directory with previously crawled website scripts')        
        .option('-u, --url <url>', 'the url of the previously crawled website scripts')        
        .parse(process.argv);
        
    program.parse();
    const options = program.opts();
    const url = options?.['url'];
    dirPath = options?.['path'];
    let hashdirPath = ""
    
    if(url){
      const BASE_DIR = path.resolve(__dirname, '..')
      const dataStorageDirectory = path.join(BASE_DIR, 'data');
      const parsedUrl = parseUrl(url);
      const folderName = dirPath ?? crawler.getNameFromURL(parsedUrl);      
      const hashfolderName = crawler.hashURL(url)
      dirPath = path.join(dataStorageDirectory, folderName)
      hashdirPath = path.join(dataStorageDirectory, folderName, hashfolderName);
      if(!fs.existsSync(dirPath)){
        logger.error(`no directory found at ${dirPath}`)
        process.exit(1)
      }
    }
    
    if(dirPath && hashdirPath){
      // read the urls crawled for this domain
      const urls = fs.readFileSync(path.join(dirPath, "urls.out"), 'utf8')
      let res = {}
      urlList = urls.split('\n').filter(x => x !== '')
      LOGGER(`urlList: ${urlList}`)
      for(const url of urlList){
        LOGGER(`url: ${url}`)
        res[url] = {}

        // Run DEBUN detection first (works on static files, no browser needed)
        // TODO: how to use this in container?
        // res[url]['DEBUN'] = await DEBUN(hashdirPath)
        // if(res[url]['DEBUN']?.['detection'])LOGGER(JSON.stringify(res[url]['DEBUN']['detection']))

        res[url]['PTV-Original'] = await PTVOriginal(url, PTVOriginalLaunchConfig, hashdirPath)
        if(res[url]['PTV-Original']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV-Original']['detection']))
        debugger;
        res[url]['PTV'] = await PTV(url, PTVPuppeteerLaunchConfig, hashdirPath);
        debugger;
        if(res[url]['PTV']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV']['detection']))
      }
      fs.writeFileSync(path.join(hashdirPath, "lib.detection.json"), JSON.stringify(res,null, "\t"))
    }
    else{
      LOGGER(`Error [dlv.js]: no operation done`)
    }

  })();
}
