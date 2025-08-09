const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { urlToDirectoryName } = require('./webtools'); 
const logger = require('./logger');


// Configurations
const inlineScriptDynamicContentOn = false;
// returns the directory name of the site
async function crawlJsFiles(url, config) {
  // Launch the browser
  const browser = await puppeteer.launch(config);
  const page = await browser.newPage();

  // Create a directory to save JS files
  let overrideMapping = {}; // link to file
  logger.info("crawlJsfiles: " + url);
  const outputDir = path.join(__dirname, '../site-js/', urlToDirectoryName(url));  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // Store all script URLs to avoid duplicates
  const scriptUrls = new Set();
  
  // Listen for script requests
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    // Check if it's a JavaScript file, avoid taking the detector script
    if ((contentType.includes('javascript') || url.endsWith('.js')) && (!url.endsWith('detect.js'))) {
      // Avoid downloading the same script twice
      if (!scriptUrls.has(url)) {
        scriptUrls.add(url);
        
        try {
          // Get filename from URL
          const parsedUrl = new URL(url);
          const fileName = path.basename(parsedUrl.pathname);
          
          // Some URLs might not have a file name
          const safeFileName = fileName || `script-${scriptUrls.size}.js`;
          const filePath = path.join(outputDir, safeFileName);
          
          // Get script content
          const content = await response.text();
          
          // Save file
          fs.writeFileSync(filePath, content);

          // update mapping
          overrideMapping[url] = filePath;

          // logger.info(`Saved: ${safeFileName}`);
        } catch (error) {
          logger.error(`Failed to save script from ${url}: ${error.message}`);
        }
      }
    }
  });
  
  // Navigate to the target page
  logger.info(`Navigating to ${url}...`);
  // await page.goto(url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    // Get inline scripts too
  if(inlineScriptDynamicContentOn){
    const inlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])')).map(
        (script, index) => ({ content: script.textContent, index })
      );
    });
    
    // Save inline scripts
    inlineScripts.forEach((script, i) => {
      if (script.content && script.content.trim() !== '') {
        const fileName = `inline-script-${script.index}.js`;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, script.content);
        logger.info(`Saved inline script: ${fileName}`);
        }
      });
        
      // Get any dynamically loaded scripts that might have been missed
      try {
        await page.evaluate(async () => {
          // Scroll to bottom to trigger lazy-loaded scripts
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
              
              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });  
      } catch (error) {
        logger.error('dynamic evaluation failed: ', error)
      }  
    }
  } catch (error) {
    logger.error(`error visiting ${url}, ${error}`)
  }
  
  
  // Wait a bit for any final scripts to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await browser.close();
  logger.info(`JS files saved to: ${outputDir}`);
  if(inlineScriptDynamicContentOn){
    logger.info(`Total scripts downloaded: ${scriptUrls.size + inlineScripts.length}`);
  }
  else{
    logger.info(`Total scripts downloaded: ${scriptUrls.size}`);
  }

  // Write override mapping to JSON file
  const mappingPath = path.join(outputDir, 'override-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(overrideMapping, null, 2));
  logger.info(`Override mapping saved to: ${mappingPath}`);

  return overrideMapping;
}

// Example usage

module.exports = {
  crawlJsFiles
};

if(require.main == module){
    (async () => {
        const overrideMapping = await crawlJsFiles('http://localhost:9000');
        console.log(overrideMapping);
    })();
}