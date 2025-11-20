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
const { dir } = require('console');

function createStartCrawlUrl(url) {
  const condition = 'soak';
  const query = new URLSearchParams({
    target: url,
    type: condition
  });
  const q = encodeURIComponent(query.toString())
  return `http://240.240.240.240/%3F${q}`;
}

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

    // page.on('console', msg => {
    //   LOGGER('PAGE LOG:' + msg.text().substring(0, 500));
    // });

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
      });
    }

    try {
      await page.goto(url, {waitUntil: 'load'}).then(async () => {
        LOGGER("waiting for extension detection...");
        try {
          await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

          result["detection"] = await page.evaluate(() => {
            return window._eventLog
          });
        } catch (timeoutError) {
          logger.warn(`PTVOriginal extension detection timeout for ${url} - continuing with available data`);
          result["detection"] = [];
        }
      });
    } catch (error) {
      logger.error(`[PTVOriginal] Failed visiting ${url}: ${error}`)
    }

    
    // try {
    //   await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

    //   result["detection"] = await page.evaluate(() => {
    //     return window._eventLog
    //   });
    // } catch (timeoutError) {
    //   logger.warn(`PTVOriginal extension detection timeout for ${url} - continuing with available data`);
    //   result["detection"] = [];
    // }

    await browser.close();

    // Clean up temp user data directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temp directory ${userDataDir}: ${cleanupError}`);
    }

    return result;

  } catch (error) {
    logger.error(`error visiting ${url}`, error)
    console.error('Stack trace:', error.stack);
    return {};
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
      });
    }

    try {
      await page.goto(url, {waitUntil: 'load'}).then(async () => {
        // Collect lift_arr_str
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

        // Wait for detection with timeout handling
        LOGGER("waiting for extension detection...")
        try {
          await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

          LOGGER("waiting for eventLog")
          result["detection"] = await page.evaluate(() => {
            console.log("Evaluating event log...", window._eventLog);
            return window._eventLog
          });
        } catch (timeoutError) {
          logger.warn(`PTV extension detection timeout for ${url} - continuing with available data`);
          result["detection"] = [];
        }
      });
    } catch (error) {
      logger.error(`[PTV] Failed visiting ${url}: ${error}`)
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
    logger.error(`error visiting ${url}`, error)
    console.error('Stack trace:', error.stack);
    return {};
  }
};



module.exports = {PTV, PTVOriginal};



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
      const hashfolderName = crawler.hashURL(url);
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
        res[url]['PTV-Original'] = await PTVOriginal(url, PTVOriginalLaunchConfig, hashdirPath)
        if(res[url]['PTV-Original']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV-Original']['detection']))
        res[url]['PTV'] = await PTV(url, PTVPuppeteerLaunchConfig, hashdirPath);
        if(res[url]['PTV']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV']['detection']))
      }
      fs.writeFileSync(path.join(hashdirPath, "lib.detection.json"), JSON.stringify(res,null, "\t"))
    }
    else{
      LOGGER(`Error [dlv.js]: no operation done`)
    }

  })();
}