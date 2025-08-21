const puppeteer = require('puppeteer');
const path = require('path');
const lift = require('./utilities/lift');
const crawl = require('./utilities/crawl');
const fs = require('fs');
const logger = require('./utilities/logger');
const {urlToDirectoryName} = require('./utilities/webtools');
// const { includes, result } = require('lodash');
const { PTdetectorExtensionPath, PTdetectorExtensionId, PTVExtensionPath, PTVOriginalExtensionPath, ProxyServerPath, PTVPuppeteerLaunchConfig, PTVOriginalLaunchConfig } = require('./utilities/ptv-constants');
const { time } = require('console');


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

  return `http://240.240.240.240/?${query.toString()}`;
}

const PTV = async (url, PTVPuppeteerLaunchConfig, crawlJs=true, do_lift=true, timeoutMs = 30000) => {
    let result = {}
    // prefetch js files from the site
    if(do_lift){
      if(crawlJs){        
          overrideMapping = await crawl.crawlJsFiles(url, PTVPuppeteerLaunchConfig);
      }
      else{
          try {
            console.log('override bf: ', url)
            overrideMappingPath = path.join(__dirname,  '/site-js/', urlToDirectoryName(url), 'override-mapping.json');
            logger.info(`loading override mapping for the site: ${overrideMappingPath}`);
            overrideMapping = JSON.parse(fs.readFileSync(overrideMappingPath));
          } catch (error) {
            logger.info(`No override mapping found for the site: ${url}, still crawling js files`);
            overrideMapping = await crawl.crawlJsFiles(url, PTVPuppeteerLaunchConfig);
          }
      }

      // lift the js files
      lift_mapping = []
      for (const [_, filePath] of Object.entries(overrideMapping)) {
        // logger.info(`filepath ${filePath}`);
        try{
          // logger.info(`lifting ${filePath}`);
          code = fs.readFileSync(filePath);
          if(code){
            lifted = await lift(code);  
            if(lifted !== ""){
              fs.writeFileSync(filePath, lifted);
              lift_mapping.push(filePath.split('/').at(-1))
              // logger.info(`lifted code written back to ${filePath}`);
            } // else leave it as is          
          }
        }
        catch(e){
          logger.error('Error lifting js files: ', e);
        }
      }    
    }

  // visit a page
  let browser;
  try {
    browser = await puppeteer.launch(PTVPuppeteerLaunchConfig);
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window._eventLog = [];
      window.addEventListener("message", e => {
          if (e.data.type == 'response') {
            console.log("PTV message received!", JSON.stringify(e.data));
            _eventLog.push(e.data.detected_libs);
            window.detectionReady = true;
          }
      });
    })      

    // page.on('console', msg => {
    //   logger.info('PAGE LOG:' + msg.text().substring(0, 500));
    // });

    if(do_lift){
      await page.setRequestInterception(true);  

      // intercept request for file override
      page.on('request', interceptedRequest => {   
        if(typeof overrideMapping !== "undefined"){
          if (interceptedRequest.url() in overrideMapping) {
            // logger.log('info', 'intercepting %s', interceptedRequest.url());
            // logger.log('info', 'reading file at %s', overrideMapping[interceptedRequest.url()]);
            interceptedRequest.respond({              
                // status: 200,
                // contentType: 'application/javascript',
                body: fs.readFileSync(overrideMapping[interceptedRequest.url()])
            });
        } else {
              interceptedRequest.continue();
          }
        }
      }
      );    
    }

    // await page.goto(url, {waitUntil: 'networkidle2'});
    await page.goto(url, {
        timeout: timeoutMs,
        waitUntil: 'load'
      }
    ); // temporary set for ground truth verification

    // add event listener to trap library detector response
    // result["lift_arr_str"] = await page.evaluate(() => {
    //   try {
    //     if (typeof lift_arr !== 'undefined') {
    //       console.log("lift_arr:", JSON.stringify(lift_arr));
    //       return lift_arr;
    //     } else {
    //       console.log("lift_arr is not defined on this page.");
    //     }
    //   } catch (e) {
    //     console.log("Error checking lift_arr:", e.toString());
    //   }      
    //   return "";
    // })

    // result["webpackObjStr"] = await page.evaluate(() => {
    //   const webpackObjs = Object.getOwnPropertyNames(window).filter(x => x.includes('webpack'));
    //   let returnObj = {};
    //   str = ""
    //   for (const i of webpackObjs) {
    //     let mod_wrap;
    //     try {
    //       mod_wrap = eval(`window.${i}`);
    //     } catch (e) {
    //       console.log(`Failed to eval window.${i}:`, e.message);
    //       continue;
    //     }
            
    //     returnObj["mod_wrap"] = mod_wrap;        
            
    //     // Safely check if mod_wrap is iterable
    //     if (mod_wrap && typeof mod_wrap[Symbol.iterator] === 'function') {
    //       for (const j of mod_wrap) {
    //         if (j?.[1]) {
    //           const keys = Object.keys(j[1]);
    //           str += JSON.stringify(keys) + ";";
    //         }
    //       }
    //     } else {
    //       str += `[non-iterable:${i}];`;
    //     }
    //   }
    //   returnObj["str"] = str;  
    
    //   return returnObj;
    // });        

    logger.info("waiting for extension detection...")
    await page.waitForFunction(() => window.detectionReady === true, { timeout: 30000 });

    logger.info("waiting for eventLog")
    result["detection"] = await page.evaluate(() => {      
      return window._eventLog
    });  

    result = Object.fromEntries(
      Object.entries(result).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    );
    // console.log("result after", JSON.stringify(result))
    // ptv_result_dir = path.join(__dirname,  '/site-js/', urlToDirectoryName(url))
    // fs.mkdirSync(ptv_result_dir, { recursive: true }); // create it if it doesn't exist
    // ptv_result = path.join(ptv_result_dir, 'ptv-result.json')
    // logger.info(`writing result to ${ptv_result}`)
    // fs.writeFileSync(ptv_result, JSON.stringify(result))    

    return result;

  } catch (error) {
    logger.error(`error visiting ${url}`, error)
    return null; // Return null instead of undefined on error
  } finally {
    // CRITICAL: Always close browser to prevent memory leaks
    if (browser) {
      try {
        logger.info("cleaning up browser instance...")
        await browser.close();
      } catch (closeError) {
        logger.error(`error closing browser: ${closeError}`);
      }
    }
  }
};

const PTVOriginal = async (url, PTVPuppeteerLaunchConfig, crawlJs=true) => {
  // visit a page
  let result = {}
  let browser = undefined
  try {
    browser = await puppeteer.launch(PTVPuppeteerLaunchConfig);
    const page = await browser.newPage();
    // page.on('console', msg => {
    //   logger.info('PAGE LOG:' + msg.text().substring(0, 500));
    // });

    // intercept request for file override
    if(typeof overrideMapping !== 'undefined'){
      await page.setRequestInterception(true);  
      page.on('request', interceptedRequest => {      
        if (interceptedRequest.url() in overrideMapping) {
            // logger.log('info', 'intercepting %s', interceptedRequest.url());
            // logger.log('info', 'reading file at %s', overrideMapping[interceptedRequest.url()]);
            f = fs.readFileSync(overrideMapping[interceptedRequest.url()])
            interceptedRequest.respond({ 
                status: 200,
                contentType: 'application/javascript',             
                body: f
            });
        } else {
            interceptedRequest.continue();
        }
      });    
    }

    await page.goto(url, {waitUntil: 'networkidle0'});

    logger.info("waiting for message eval...")
    await page.evaluate(() => {
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
    logger.info("waiting for extension detection...")
    await page.waitForFunction(() => window.detectionReady === true, { timeout: 10000 }); // temporarilly reduced timeout for verification test, usual:30000
  
    result["detection"] = await page.evaluate(() => {
      return window._eventLog
    });  

    ptv_original_result = path.join(__dirname,  '/site-js/', urlToDirectoryName(url), 'ptv-original-result.json')
    logger.info("writing result to ", ptv_original_result)
    fs.writeFileSync(ptv_original_result, JSON.stringify(result))    
    
    return result;

  } catch (error) {
    logger.error(`error visiting ${url}`, error)
    return null; // Return null instead of undefined on error
  } finally {
    // CRITICAL: Always close browser to prevent memory leaks
    if (browser) {
      try {
        logger.info("cleaning up browser instance...")
        await browser.close();
      } catch (closeError) {
        logger.error(`error closing browser: ${closeError}`);
      }
    }
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
    // target_url = "https://www.google.com.pr:443/imghp?hl=en&ogbl";
    // const url = createStartCrawlUrl(target_url);
    // const url = 'http://240.240.240.240/\?target\=http%3A%2F%2Ftvprogram.idnes.cz%2Ftvprogram.aspx%3Fchannel%3D4%26date%3D2025-03-07%2391835217\&type\=s_d6ed3d76/sdk.3fa17537af3c5a48fed3cac3915a59eeab1a0ddf.js\&type\=soak';
    const url = "http://localhost:9000/"
    resPTV = await PTV(url, PTVPuppeteerLaunchConfig); 
    resOriginalPTV = await PTVOriginal(url, PTVOriginalLaunchConfig);    
    console.log("resPTV", JSON.stringify(resPTV));
    console.log("resOriginalPTV", JSON.stringify(resOriginalPTV));
    // fs.writeFileSync('detection-results/mod' + urlToDirectoryName(url), JSON.stringify(resPTV))
    // fs.writeFileSync('detection-results/original' + urlToDirectoryName(url), JSON.stringify(resOriginalPTV))

    // archive_detection(18);

  })();
}
