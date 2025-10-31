const { chromium } = require('playwright');
const path = require('path');
const lift = require('./utilities/lift');
const crawl = require('./utilities/crawl');
const crawler = require('../crawler/crawler');
const fs = require('fs');
const logger = require('./utilities/logger');
const LOGGER = logger.info
const {urlToDirectoryName} = require('./utilities/webtools');
const { Command } = require('commander');
const { exit } = require('process');

// Configuration building functions
function createPTVPlaywrightConfig(ptvExtensionPath, proxyServerPath, headless = true, ignoreCertErrors = true, diskCacheDir = '/dev/null', diskCacheSize = 1) {
  const config = {
    channel: 'chromium',
    bypassCSP: true,
    headless: headless,
    ignoreHTTPSErrors: ignoreCertErrors,
    args: [              
        `--disable-extensions-except=${ptvExtensionPath}`,
        `--load-extension=${ptvExtensionPath}`,
    ]
  };
  
  // Only add proxy if proxyServerPath is provided and not null
  if (proxyServerPath && proxyServerPath !== null) {
    config.proxy = {
      server: `${proxyServerPath}`
    };
  }
  
  return config;
}

function createPTVOriginalPlaywrightConfig(ptvOriginalExtensionPath, proxyServerPath, headless = true, ignoreCertErrors = true, diskCacheDir = '/dev/null', diskCacheSize = 1) {
  const config = {
    channel: 'chromium',
    bypassCSP: true,
    headless: headless,
    ignoreHTTPSErrors: ignoreCertErrors,
    args: [              
        `--disable-extensions-except=${ptvOriginalExtensionPath}`,
        `--load-extension=${ptvOriginalExtensionPath}`,
    ]
  };
  
  // Only add proxy if proxyServerPath is provided and not null
  if (proxyServerPath && proxyServerPath !== null) {
    config.proxy = {
      server: `${proxyServerPath}`
    };
  }
  
  return config;
}

// Utility function to launch playwright with proper configuration
async function launch_playwright(headless_mode, additional_args = undefined) {
    // Create temp user data directory for session isolation
    const os = require('os');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-'));
    
    console.log('additional_args', JSON.stringify(additional_args, null, 4));

    let options = {
        channel: 'chromium',
        bypassCSP: true,
        headless: headless_mode,
        ignoreHTTPSErrors: true,        
    };

    options = {...options, ...additional_args}; // additional args will override this setting if provided

    console.log("playwright options: ", JSON.stringify(options, null, 4));

    // Use launchPersistentContext for isolated sessions
    var browser = await chromium.launchPersistentContext(userDataDir, options);

    // Attach temp directory path to browser object for cleanup later
    browser._tempUserDataDir = userDataDir;

    return browser;
}

// helper functions
const is_vuln_lib_osv = async(libname, version) => {
  const requestData = {
    package: {
      name: `${libname}`
    },
    version: `${version}`
  };

  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    const data = await res.json();
    let vuln_summary = []
    for(vuln of data['vulns']){
      vuln_summary.push(
        {
          "id": vuln['id'],
          "aliases": vuln['aliases'],
          "summary": vuln['summary'],
          "details": vuln['details'],
        }
      )
    }    
    return vuln_summary;
  } catch (error) {
    console.error('Error checking vulnerabilities:', error);
  }
}

function createStartCrawlUrl(url) {
  const condition = 'soak';
  const query = new URLSearchParams({
    target: url,
    type: condition
  });
  const q = encodeURIComponent(query.toString())
  return `http://240.240.240.240/%3F${q}`;
}


const PTVOriginal = async (url, playwrightConfig, crawlJs=true) => {
  // visit a page
  let result = {}
  try {
    console.log("ptv-original playwrightConfig", JSON.stringify(playwrightConfig))
    const browser = await launch_playwright(playwrightConfig.headless, playwrightConfig);
    const page = await browser.newPage();

    await page.addInitScript(() => {
      window._eventLog = [];
      window.addEventListener("message", e => {
          console.log("data", JSON.stringify(e.data))
          if (e.data.type == 'response') {
            console.log("PTV Original message received!");
            _eventLog.push(e.data.detected_libs);
            window.detectionReady = true;
          }
      });
    });

    // page.on('console', msg => {
    //   LOGGER('PAGE LOG:' + msg.text().substring(0, 500));
    // });

    try {
      await page.goto(url, {waitUntil: 'networkidle'});
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
      logger.warn(`PTV Original extension detection timeout for ${url} - continuing with available data`);
      result["detection"] = [];
    }

    await browser.close();

    // Clean up temp user data directory
    try {
      fs.rmSync(browser._tempUserDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temp directory ${browser._tempUserDataDir}: ${cleanupError}`);
    }

    // ptv_original_result = path.join(__dirname,  '/site-js/', urlToDirectoryName(url), 'ptv-original-result.json')
    // LOGGER("writing result to ", ptv_original_result)
    // fs.writeFileSync(ptv_original_result, JSON.stringify(result))

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
    // Convert Puppeteer config to Playwright config
    const playwrightConfig = {
      channel: 'chromium',
      bypassCSP: true,
      headless: launchConfig.headless !== false,
      args: launchConfig.args || [],
      ignoreHTTPSErrors: true
    };

    console.log("ptv playwrightConfig", JSON.stringify(playwrightConfig))
    const browser = await launch_playwright(playwrightConfig.headless, playwrightConfig);
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
      await page.goto(url, {waitUntil: 'load'});
    } catch (error) {
      logger.error(`Failed visiting ${url}: ${error}`)
    }

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
      fs.rmSync(browser._tempUserDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temp directory ${browser._tempUserDataDir}: ${cleanupError}`);
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
        .option('--ProxyServerPath <path>', 'proxy server path', 'http://localhost:8002')
        .option('--PTVExtensionPath <path>', 'PTV extension path', '/JAW4C/JAW4C-PTV')
        .option('--PTVOriginalExtensionPath <path>', 'PTV original extension path', '/JAW4C/JAW4C-PTV-Original')
        .option('--headless [value]', 'run in headless mode', 'true')
        .option('--ignoreCertErrors [value]', 'ignore certificate errors', 'true')
        .option('--diskCacheDir <path>', 'disk cache directory', '/dev/null')
        .option('--diskCacheSize <size>', 'disk cache size', '1')
        .parse(process.argv);
        
    program.parse();
    const options = program.opts();
    const url = options?.['url'];
    dirPath = options?.['path'];
    
    // Extract configuration options
    const proxyServerPath = options.ProxyServerPath;
    const ptvExtensionPath = options.PTVExtensionPath;
    const ptvOriginalExtensionPath = options.PTVOriginalExtensionPath;
    const headless = options.headless === 'true' || options.headless === true;
    const ignoreCertErrors = options.ignoreCertErrors === 'true' || options.ignoreCertErrors === true;
    const diskCacheDir = options.diskCacheDir;
    const diskCacheSize = parseInt(options.diskCacheSize);
    
    // Create playwright configurations
    const PTVPlaywrightConfig = createPTVPlaywrightConfig(ptvExtensionPath, proxyServerPath, headless, ignoreCertErrors, diskCacheDir, diskCacheSize);
    const PTVOriginalPlaywrightConfig = createPTVOriginalPlaywrightConfig(ptvOriginalExtensionPath, proxyServerPath, headless, ignoreCertErrors, diskCacheDir, diskCacheSize);
    
    let hashdirPath = ""
    
    if(url){
      const BASE_DIR = path.resolve(__dirname, '..')
      const dataStorageDirectory = path.join(BASE_DIR, 'data');
      const folderName = crawler.getNameFromURL(url);
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
        res[url]['PTV-Original'] = await PTVOriginal(url, PTVOriginalPlaywrightConfig, crawlJs=false)
        if(res[url]['PTV-Original']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV-Original']['detection']))        
        res[url]['PTV'] = await PTV(url, PTVPlaywrightConfig, dataDir=hashdirPath);
        if(res[url]['PTV']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV']['detection']))
      }
      fs.writeFileSync(path.join(hashdirPath, "lib.detection.json"), JSON.stringify(res,null, "\t"))
    }
    else{
      LOGGER(`Error [dlv.js]: no operation done`)
    }

  })();
}
