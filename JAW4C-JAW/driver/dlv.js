const puppeteer = require('puppeteer');
const { chromium } = require('playwright');
const path = require('path');
const lift = require('./utilities/lift');
const crawl = require('./utilities/crawl');
const crawler = require('../crawler/crawler');
const fs = require('fs');
const logger = require('./utilities/logger');
const LOGGER = logger.info
const {urlToDirectoryName} = require('./utilities/webtools');
const { PTdetectorExtensionPath, PTdetectorExtensionId, PTVExtensionPath, PTVOriginalExtensionPath, ProxyServerPath, PTVPuppeteerLaunchConfig, PTVOriginalLaunchConfig } = require('./config')
const { Command } = require('commander');
const { exit } = require('process');


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

// const PTV = async (url, PTVPuppeteerLaunchConfig, crawlJs=true, do_lift=true, dataDir = "") => {
//   let result = {}
    

//   // visit a page
//   try {
//     const browser = await puppeteer.launch(PTVPuppeteerLaunchConfig);
//     const page = await browser.newPage();
//     await page.evaluateOnNewDocument(() => {
//       window._eventLog = [];
//       window.addEventListener("message", e => {
//           if (e.data.type == 'response') {
//             console.log("PTV message received!", JSON.stringify(e.data));
//             _eventLog.push(e.data.detected_libs);
//             window.detectionReady = true;
//           }
//       });
//     })      

//     page.on('console', msg => {
//       LOGGER('PAGE LOG:' + msg.text());      
//     });    
//     /*
//     LOG:Failed to load resource: the server responded with a status of 404 ()
//     -> This is probably due to the bug in PTV where there's sometime CORS limit to chrome://extension files
//     */

//     if(fs.existsSync(dataDir)){
//       await page.setRequestInterception(true);  
//       const overrideMappingPath = path.join(dataDir, 'override_mapping.json')
//       const overrideMappingData = JSON.parse(fs.readFileSync(overrideMappingPath, 'utf8'))

//       // Library detection should only use lift mapping (not transform)
//       let overrideMapping = {};
//       if(overrideMappingData.lift) {
//         // New nested structure - use lift for library detection
//         overrideMapping = overrideMappingData.lift;
//       } else {
//         // Old flat structure (backward compatibility)
//         overrideMapping = overrideMappingData;
//       }
//       for(key of Object.keys(overrideMappingData.original)){
//         if(overrideMapping[key] === undefined){
//           overrideMapping[key] = overrideMappingData.original[key]
//         }
//       }
      
//       // intercept request for file override: override all files from local directory to mitigate the effect of lazy loading
//       page.on('request', interceptedRequest => {   
//         if(typeof overrideMapping !== "undefined"){
//           logger.log('info', 'intercepting %s', interceptedRequest.url());
//           if (interceptedRequest.url() in overrideMapping) {
//             logger.log('info', 'overriding file at %s', overrideMapping[interceptedRequest.url()]);
//             const response = {              
//                 status: 200,
//                 contentType: 'application/javascript',
//                 body: fs.readFileSync(overrideMapping[interceptedRequest.url()])
//             }            
//             interceptedRequest.respond(response);
//         } else {
//               interceptedRequest.continue();
//               logger.log('info', 'not a overridden file, skipping...');
//           }
//         }
//       }
//       );    
//     }

//     try {
//       await page.goto(url, {waitUntil: 'domcontentloaded'}); // temporary set for ground truth verification
//     } catch (error) {
//       logger.error(`Failed visiting ${url}: ${error}`)
//     }


//     // add event listener to trap library detector response
//     result["lift_arr_str"] = await page.evaluate(() => {
//       try {
//         if (typeof lift_arr !== 'undefined') {
//           console.log("lift_arr:", JSON.stringify(lift_arr));
//           return lift_arr;
//         } else {
//           console.log("lift_arr is not defined on this page.");
//         }
//       } catch (e) {
//         console.log("Error checking lift_arr:", e.toString());
//       }      
//       return "";
//     })

//     result["webpackObjStr"] = await page.evaluate(() => {
//       const webpackObjs = Object.getOwnPropertyNames(window).filter(x => x.includes('webpack'));
//       let returnObj = {};
//       str = ""
//       for (const i of webpackObjs) {
//         let mod_wrap;
//         try {
//           mod_wrap = eval(`window.${i}`);
//         } catch (e) {
//           console.log(`Failed to eval window.${i}:`, e.message);
//           continue;
//         }
            
//         returnObj["mod_wrap"] = mod_wrap;        
            
//         // Safely check if mod_wrap is iterable
//         if (mod_wrap && typeof mod_wrap[Symbol.iterator] === 'function') {
//           for (const j of mod_wrap) {
//             if (j?.[1]) {
//               const keys = Object.keys(j[1]);
//               str += JSON.stringify(keys) + ";";
//             }
//           }
//         } else {
//           str += `[non-iterable:${i}];`;
//         }
//       }
//       returnObj["str"] = str;  
    
//       return returnObj;
//     });        
    
//     LOGGER("waiting for extension detection...")
//     await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });
    

//     LOGGER("waiting for eventLog")
//     result["detection"] = await page.evaluate(() => {      
//       return window._eventLog
//     });  

//     LOGGER("waiting for browser close...")     
//     await browser.close();  
//     result = Object.fromEntries(
//       Object.entries(result).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
//     );

//     return result;

//   } catch (error) {
//     logger.error(`error visiting ${url}`, error)
//     return {};
//   }  
// };

const PTVOriginal = async (url, PTVPuppeteerLaunchConfig, crawlJs=true) => {
  // visit a page
  let result = {}
  try {
    const browser = await puppeteer.launch(PTVPuppeteerLaunchConfig);
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window._eventLog = [];
      window.addEventListener("message", e => {
          console.log("data", JSON.stringify(e.data))
          if (e.data.type == 'response') {
            console.log("PTV Original message received!");
            _eventLog.push(e.data.detected_libs);
            window.detectionReady = true;
          }
      });
    })

    // page.on('console', msg => {
    //   LOGGER('PAGE LOG:' + msg.text().substring(0, 500));
    // });

    await page.goto(url, {waitUntil: 'networkidle2'});

    LOGGER("waiting for extension detection...")
    await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

    result["detection"] = await page.evaluate(() => {
      return window._eventLog
    });

    await browser.close();

    // ptv_original_result = path.join(__dirname,  '/site-js/', urlToDirectoryName(url), 'ptv-original-result.json')
    // LOGGER("writing result to ", ptv_original_result)
    // fs.writeFileSync(ptv_original_result, JSON.stringify(result))

    return result;

  } catch (error) {
    logger.error(`error visiting ${url}`, error)
    return {};
  }
};

const PTV = async (url, launchConfig, dataDir = "") => {
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
    return {};
  }
};


async function archive_detection(start=0, end = undefined, mapping_path="/Users/ian/cmu/Cylab-JSBundle/jalangi2/archive-70/name_mapping.json"){
  // mapping_path = "/Users/ian/cmu/Cylab-JSBundle/jalangi2/archive-70/name_mapping.json"
  const mapping = JSON.parse(fs.readFileSync(mapping_path))
  for(i = start; i < ((end) ? end : Object.keys(mapping).length); i++){
    logger.debug(`Archive Id: ${i}`)
    url = Object.keys(mapping)[i]
    const target_url = createStartCrawlUrl(url);
    resPTV = await PTV(target_url, PTVPuppeteerLaunchConfig); 
    resOriginalPTV = await PTVOriginal(target_url, PTVOriginalLaunchConfig);    
    // console.log("resPTV", resPTV["detection"]);
    // console.log("resOriginalPTV", resOriginalPTV["detection"]);    
    if(resPTV){
      fs.writeFileSync('detection-results/unique/' + i + '_' + urlToDirectoryName(url) + ".json", JSON.stringify(resPTV))
    }
    if(resOriginalPTV){
      fs.writeFileSync('detection-results/original/' + i + '_' + urlToDirectoryName(url) + ".json", JSON.stringify(resOriginalPTV))
    }
  }
}

module.exports = {PTV, PTVOriginal};



// Run PTdetector if this file is run directly
if (require.main === module) {
  (async () => {

    // Uncomment for comparison with original
    // resPTV = await PTV(testUrl, PTVPuppeteerLaunchConfig);
    // console.log("PTV (Puppeteer) result:", JSON.stringify(resPTV, null, 2));


    // target_url = "https://www.google.com.pr:443/imghp?hl=en&ogbl";
    // const url = createStartCrawlUrl(target_url);
    // const url = 'http://240.240.240.240/\?target\=http%3A%2F%2Ftvprogram.idnes.cz%2Ftvprogram.aspx%3Fchannel%3D4%26date%3D2025-03-07%2391835217\&type\=s_d6ed3d76/sdk.3fa17537af3c5a48fed3cac3915a59eeab1a0ddf.js\&type\=soak';
    // const url = "http://localhost:9000/"
    // resPTV = await PTV(url, PTVPuppeteerLaunchConfig);
    // resOriginalPTV = await PTVOriginal(url, PTVOriginalLaunchConfig);
    // console.log("resPTV", JSON.stringify(resPTV));
    // console.log("resOriginalPTV", JSON.stringify(resOriginalPTV));
    // fs.writeFileSync('detection-results/mod' + urlToDirectoryName(url), JSON.stringify(resPTV))
    // fs.writeFileSync('detection-results/original' + urlToDirectoryName(url), JSON.stringify(resOriginalPTV))

    // archive_detection(18);

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
        // res[url]['PTV-Original'] = await PTVOriginal(url, PTVOriginalLaunchConfig, crawlJs=false)
        // if(res[url]['PTV-Original']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV-Original']['detection']))
        // const resPTVPlaywright = await PTV(url, PTVPuppeteerLaunchConfig, dataDir=hashdirPath);
        // console.log("PTV result:", JSON.stringify(resPTVPlaywright, null, 2));
        res[url]['PTV'] = await PTV(url, PTVPuppeteerLaunchConfig, dataDir=hashdirPath);
        if(res[url]['PTV']?.['detection'])LOGGER(JSON.stringify(res[url]['PTV']['detection']))
      }
      fs.writeFileSync(path.join(hashdirPath, "lib.detection.json"), JSON.stringify(res,null, "\t"))
    }
    else{
      LOGGER(`Error [dlv.js]: no operation done`)
    }

  })();
}
