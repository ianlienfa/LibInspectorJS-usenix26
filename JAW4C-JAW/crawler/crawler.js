
/**
 * ------------------------------------------------
 *   			third-party imports
 * ------------------------------------------------
**/
const { chromium } = require('playwright');
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");
const os = require('os');

// https://github.com/beautify-web/js-beautify
const js_beautify = require('js-beautify').js;
const elapsed = require("elapsed-time-logger");
var psl = require('psl');
const { URL } = require('url');

const lift = require('../driver/utilities/lift');
const transform = require('../driver/utilities/transform');
const logger = require('../driver/utilities/logger');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var js_beautify_sourcemap = require('js-beautify-sourcemap');

/**
 * ------------------------------------------------
 *  			constants and globals
 * ------------------------------------------------
**/

// directory where the data of the crawling will be saved

const BASE_DIR = pathModule.resolve(__dirname, '..')
const dataStorageDirectory = pathModule.join(BASE_DIR, 'data');

// maximum number of URLs to be tested per website by default
// this default number can be overridden in the input config.yaml file
var maxVisitedUrls = 100;

// when true, nodejs will log the current step for each webpage to the console 
const DEBUG = true; 		

// when true, nodejs will log the browser console logs to the console as they arrive
const BROWSER_LOG = true; 	


// additional data that the crawler should store
const COLLECT_AND_CREATE_PAGE = true;
const COLLECT_REQUESTS = true;
const COLLECT_RESPONSE_HEADERS = true;
const COLLECT_WEB_STORAGE = true;
const COLLECT_COOKIES = true;
const COLLECT_DOM_SNAPSHOT = true;
const COLLECT_SCRIPTS = true;

// valid script types for javascript
const SCRIPT_MIME_TYPES_FOR_JS = [
	"text/javascript",
	"application/javascript",
	"application/ecmascript",
	"application/x-ecmascript",
	"application/x-javascript",
	"text/ecmascript",
	"text/javascript1.0",
	"text/javascript1.1",
	"text/javascript1.2",
	"text/javascript1.3",
	"text/javascript1.4",
	"text/javascript1.5",
	"text/jscript",
	"text/livescript",
	"text/x-ecmascript",
	"text/x-javascript"]

const TYPE_SCRIPT_EXTERNAL = 'external';
const TYPE_SCRIPT_INTERNAL = 'inline';


/**
 * ------------------------------------------------
 *  			utility functions
 * ------------------------------------------------
**/


/** 
 * @function readFile 
 * @param file_path_name: absolute path of a file.
 * @return the text content of the given file if it exists, otherwise -1.
**/
function readFile(file_path_name){
	try {
		const data = fs.readFileSync(file_path_name, 'utf8')
		return data;
	} catch (err) {
		// console.error(err)
		return -1;
	}
}




const stringIsAValidUrl = (s, protocols) => {
    try {
        let url = new URL(s);
        return protocols
            ? url.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(url.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};


function checkIfEmailInString(text) { 
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
}

function isValid(link){
	if(link.startsWith('mailto:')){
		return false
	}
	// if(checkIfEmailInString(link)){
	// 	return false
	// }

	return stringIsAValidUrl(link);
}


/**
 * @function getNameFromURL
 * @param url: full URL string
 * @return converts the url to a short directory name using domain + SHA256 hash
 *
 * IMPORTANT: This function must remain synchronized with the Python version:
 *   - Python: get_name_from_url() in analyses/cve_vuln/cve_vuln_neo4j_traversals.py
 *   - Python: get_name_from_url() in utils/utility.py
 * Both must produce identical output for the same input URL.
 * Hash algorithm: SHA256 (via hashURL function)
 * Domain sanitization: replace non-alphanumeric (except dash) with underscore
**/
function getNameFromURL(url) {
  // Generate SHA256 hash of the URL
  const urlHash = hashURL(url);

  // Extract and sanitize domain for readability
  let domain = '';
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace(/[^a-zA-Z0-9-]/g, '_');
  } catch (e) {
    // If URL parsing fails, use 'unknown'
    domain = 'unknown';
  }

  // Format: domain-hash (e.g., www_ebay_de-abc123...)
  return `${domain}-${urlHash}`;
}


/** 
 * @function hashURL 
 * @param url: string
 * @return returns the SHA256 hash of the given input in hexa-decimal format
**/
function hashURL(url){
	const hash = crypto.createHash('sha256').update(url, 'utf8').digest('hex');
	return hash;
}


/** 
 * @function getOrCreateDataDirectoryForWebsite 
 * @param url: string
 * @return creates a directory to store the data of the input url and returns the directory name.
**/
function getOrCreateDataDirectoryForWebsite(url){
	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	console.log("folderPath", folderPath)
	if(!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
	return folderPath;
}


function directoryExists(url){

	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(fs.existsSync(folderPath)){
		return true;
	}
	else{
		return false;
	}

}


function cleanDirectory(url){

	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(fs.existsSync(folderPath)){
		// Recursively remove everything inside folderPath
        fs.rmSync(folderPath, { recursive: true, force: true });
	}
}

function getMD5Hash(string){
	return crypto.createHash('md5').update(string).digest("hex");
}

function getValueFromDictOrNull(dictionary, key){
	if(key in dictionary){
		return dictionary[key]
	}
	return null;
}

/**
 * Given the html file, finds the line ranges of the script tags inside it
 * @param  {string} html
 * @return {dict}
 */
function getScriptLineRanges(html){
	let out = {};

	const lines = html.split(/\r?\n/);

	var script_id = 0;
	var start_range = 0;
	var end_range = 0;

	for(let line_i = 0; line_i < lines.length; line_i++){

		let line = lines[line_i];
		if(line.includes('<script')){
			start_range = line_i + 1;
		}
		else if(line.includes('</script>')){
			end_range = line_i + 1;

			// save
			out[''+ script_id] = [start_range, end_range];
			script_id = script_id + 1;
		}
	}


	return out;
}

/**
 * @function getScriptSourceMappingObject
 * @param script_content: javascript code
 * @return returns the script sourcemapping object output by `js-beautify-sourcemap` library
**/
async function getScriptSourceMappingObject(script_content, apply_transform = false) {

	try{
		if(script_content && script_content.length){

			// Keep the original code
			let original_code = script_content;

			// Apply babel transformation for static analysis purpose
			transform_success = false
			logger.info("Transforming script", script_content.slice(0, 20))
			if(apply_transform){
				let transformed = transform(script_content);
				if(transformed !== ""){
					script_content = transformed;
					transform_success = true
					logger.info("Transforming done!", script_content.slice(0, 20))
				}
			}

			// define an offset for the sourcemap
			let mapping_offset =  {line: 1, column: 0};

			// get the beautified code + sourcemap (from transformed or original)
			let beautified_script_obj = await js_beautify_sourcemap(script_content, { indent_size: 2, space_in_empty_paren: true }, mapping_offset);

			// keep the original code (before transformation)
			beautified_script_obj.original_code = original_code;
			beautified_script_obj.transformed = (transform_success) ? true : false;

			return beautified_script_obj;

		}
		return "";
	}catch{
		// Protocol error (Debugger.getScriptSource): No script for id: <ID>
		return ""
	}
}

/**
 * @function savePageData
 * @param url: string
 * @param html: string
 * @param scripts: list of [scriptKind, scriptSourceMappingObject] or [scriptKind, scriptSourceMappingObject, scriptSrc, 'SCRIPT_SRC_REPLACED_WITH_CONTENT']
 * @param dataDirectory: string of the base directory to store the data for the current website.
 * @return stores the input webpage data and returns the absolute folder name where the data is saved.
**/
function savePageData(url, html, scripts, cookies, webStorageData, httpRequests, httpResponses, dataDirectory, lift_enabled, transform_enabled){

	DEBUG && console.log("[IO] started saving webpage.");
	const webpageFolderName = hashURL(url);
	const webpageFolder = pathModule.join(dataDirectory, webpageFolderName);

	// append url in urls.out in the website-specific directory
	let URLsdata
	if(fs.existsSync(pathModule.join(dataDirectory, "urls.out"))){
		URLsdata = fs.readFileSync(pathModule.join(dataDirectory, "urls.out"));
	}
	const existingUrls = URLsdata ? URLsdata.toString().trim().split('\n') : [];
	const urlSet = new Set([...existingUrls, url]);
	fs.writeFileSync(pathModule.join(dataDirectory, "urls.out"), [...urlSet].join('\n'));
	let override_mapping = {
		'lift': {},
		'transform': {},
		'original': {}
	}

	if(COLLECT_AND_CREATE_PAGE){

		if(!fs.existsSync(webpageFolder)){
			fs.mkdirSync(webpageFolder);
		}

		// Only create directories and process scripts if needed
		const liftedFolder = pathModule.join(webpageFolder, "lifted")
		const originalFolder = pathModule.join(webpageFolder, "original")
		const transformedFolder = pathModule.join(webpageFolder, "transformed")
		if(lift_enabled || transform_enabled){
			if(!fs.existsSync(originalFolder)){
				fs.mkdirSync(originalFolder);
			}
			if(lift_enabled && !fs.existsSync(liftedFolder)){
				fs.mkdirSync(liftedFolder);
			}
			if(transform_enabled && !fs.existsSync(transformedFolder)){
				fs.mkdirSync(transformedFolder);
			}
		}

		// store url in url.out in the webpage-specific directory
		fs.writeFileSync(pathModule.join(webpageFolder, "url.out"), url);

		try{
			COLLECT_DOM_SNAPSHOT && fs.writeFileSync(pathModule.join(webpageFolder, "index.html"), html, 'utf8');
		}catch(e){
		}

		if(COLLECT_SCRIPTS){

			let scriptMapping = {};
			let scriptLineRanges = getScriptLineRanges(html);

			DEBUG && console.log('[Crawler] collecting scripts, length:', scripts.length);

			var sid = 0;
			for(let i=0; i< scripts.length; i++){
				let s = scripts[i];

				let script_path_name = pathModule.join(webpageFolder, `${sid}.js`);
				let script_path_name_org = pathModule.join(webpageFolder, `${sid}.min.js`); // non-beautified code
				let script_path_name_source_map =  pathModule.join(webpageFolder, `${sid}.js.map`); // sourcemap

				let scriptKind = s[0];
				let scriptSourceMappingObject = s[1];
				let sourcemap = undefined;

				// include the real filenames in the sourcemap
				// instead of having the __fakename included by the `js-beautify-sourcemap` library
				if (scriptSourceMappingObject.sourcemap) {
							sourcemap = JSON.parse(scriptSourceMappingObject.sourcemap);
							sourcemap.file = script_path_name_source_map; // sourcemap file name
							sourcemap.sources = [ `${sid}.js` ]; // original filename
				}

				if(scriptSourceMappingObject.code && scriptSourceMappingObject.code.length > 0){

					// calculate the script MD5 hash of the 'transformed' code (for taint analysis compatibility)
					let scriptHash = getMD5Hash(scriptSourceMappingObject.code);

					// save the script
					if(scriptKind === TYPE_SCRIPT_INTERNAL){

						scriptMapping[`${sid}.js`] = {
							'type': scriptKind,
							'src': '',
							'lines': getValueFromDictOrNull(scriptLineRanges, ''+ sid),
							'hash': scriptHash
						};

						// Save processed version if lifting or transformation is enabled
						if((lift_enabled || transform_enabled) && scriptSourceMappingObject.code){
							const originalpathToWrite = pathModule.join(originalFolder, `${sid}.js`)
							fs.writeFileSync(originalpathToWrite, scriptSourceMappingObject.code, 'utf8')

							// We want to directly apply lift on the original code before babel transform 
							if(lift_enabled && scriptSourceMappingObject.original_code){
								let lifted = lift(scriptSourceMappingObject.original_code);
								if(lifted !== ""){
									const liftedpathToWrite = pathModule.join(liftedFolder, `${sid}.js`)
									fs.writeFileSync(liftedpathToWrite, lifted, 'utf8')									
								}
							} 
							if(scriptSourceMappingObject.transformed){
								const transformedpathToWrite = pathModule.join(transformedFolder, `${sid}.js`)
								const transformedpathToWriteParent = pathModule.join(webpageFolder, `${sid}.js`)
								fs.writeFileSync(transformedpathToWrite, scriptSourceMappingObject.code, 'utf8')
								fs.writeFileSync(transformedpathToWriteParent, scriptSourceMappingObject.code, 'utf8')							
							}
						}

						 // Main files use beautified code (not lifted) for taint analysis
						 fs.writeFileSync(script_path_name, scriptSourceMappingObject.code, 'utf8');
						 fs.writeFileSync(script_path_name_org, scriptSourceMappingObject.original_code);
						 fs.writeFileSync(script_path_name_source_map, JSON.stringify(sourcemap));

						 sid = sid + 1;
					}else{
						if(s.length === 4){ // checks if `SCRIPT_SRC_REPLACED_WITH_CONTENT` is in `s`

							let scriptSrc = s[2];
							scriptMapping[`${sid}.js`] = {
								'type': scriptKind,
								'src': scriptSrc,
								'lines': getValueFromDictOrNull(scriptLineRanges, ''+ sid),
								'hash': scriptHash
							};

							// Add to override_mapping for external scripts with .js URLs
							if(scriptSrc && scriptSrc.endsWith('.js')){			
								// Save processed version if lifting or transformation is enabled

								if(scriptSourceMappingObject.original_code){
									// we want to always save the original version
									const originalpathToWrite = pathModule.join(originalFolder, `${sid}.js`)
									fs.writeFileSync(originalpathToWrite, scriptSourceMappingObject.original_code, 'utf8')	// backup
									override_mapping.original[scriptSrc] = originalpathToWrite; // always save original version

									if((lift_enabled || transform_enabled)){										
										if(lift_enabled){
											let lifted = lift(scriptSourceMappingObject.original_code);
											if(lifted !== ""){
												const liftedpathToWrite = pathModule.join(liftedFolder, `${sid}.js`)
												fs.writeFileSync(liftedpathToWrite, lifted, 'utf8')
												// Update override_mapping to point to lifted version for .js URLs
												override_mapping.lift[scriptSrc] = liftedpathToWrite;											
											}
										} 

										// If transferrable, place transferred file under the website hash directory, else write original
										if(transform_enabled && scriptSourceMappingObject.transformed){
											const transformedpathToWrite = pathModule.join(transformedFolder, `${sid}.js`)
											fs.writeFileSync(transformedpathToWrite, scriptSourceMappingObject.code, 'utf8')
											// Update override_mapping to point to transformed version for .js URLs
											override_mapping.transform[scriptSrc] = transformedpathToWrite;										
										}
									}									
								}									
							
							}

							// Main files use beautified code (not lifted) for taint analysis
							fs.writeFileSync(script_path_name, scriptSourceMappingObject.code ? scriptSourceMappingObject.code : "", 'utf8');
							fs.writeFileSync(script_path_name_org, scriptSourceMappingObject.original_code ? scriptSourceMappingObject.original_code : "");
						    fs.writeFileSync(script_path_name_source_map, sourcemap ? JSON.stringify(sourcemap) : "");
							sid = sid + 1;

						}
					}
				}else{

					// Sanity check only; this case should not happen.
					// If it does, it indicates a problem either in a third-party library we are using, i.e.,
					// script collection via playwright/puppeteer, or the virtual dom processing
					if(s[1].trim && s[1].trim().length> 0){
						DEBUG && console.log('[Warning] script content not found for:', s[0], s[1]);
					}


				}


			}; // end forloop

			try{
				// store the mapping between scripts
				fs.writeFileSync(pathModule.join(webpageFolder, "scripts_mapping.json"),  JSON.stringify(scriptMapping, null, '\t'), 'utf8');
			}catch(e){
				console.log('[ScriptMappingFileSaveError]', e);
			}

			try{
				// write override_mapping
				fs.writeFileSync(pathModule.join(webpageFolder, "override_mapping.json"), JSON.stringify(override_mapping, null, '\t'), 'utf8');
			}catch(e){
				console.log('[OverrideMappingFileSaveError]', e);
			}
		}


		try{
			COLLECT_COOKIES     && fs.writeFileSync(pathModule.join(webpageFolder, "cookies.json"), JSON.stringify(cookies, null, '\t'), 'utf8');
		}catch(e){
			console.log('[CookieSaveError]', e);
		}

		try{
			COLLECT_WEB_STORAGE && fs.writeFileSync(pathModule.join(webpageFolder, "webstorage.json"), JSON.stringify(webStorageData, null, '\t'), 'utf8');
		}catch(e){
			console.log('[StorageSaveError]', e);
		}

		try{
			COLLECT_REQUESTS && fs.writeFileSync(pathModule.join(webpageFolder, "requests.json"), JSON.stringify(httpRequests, null, '\t'), 'utf8');
		}catch(e){
			console.log('[RequestsSaveError]', e);
		}


		try{
			COLLECT_RESPONSE_HEADERS  && fs.writeFileSync(pathModule.join(webpageFolder, "responses.json"), JSON.stringify(httpResponses, null, '\t'), 'utf8');
		}
		catch(e){
			console.log('[ResponsesSaveError]', e);
		}



	}


	DEBUG && console.log("[IO] finished saving webpage.");

	return webpageFolder;
}


/** 
 * @function getSourceFromScriptId 
 * @param session: chrome dev tools protocol (CDP) session.
 * @param scriptId: script id given by the CDP.
 * @return returns the script content of a given script id in a CDP session.
**/
async function getSourceFromScriptId(session, scriptId) {

	try{
		let res =  await session.send('Debugger.getScriptSource', {scriptId: scriptId});
		let script_content = res.scriptSource;
		let beautified_script_content = js_beautify(script_content, { indent_size: 2, space_in_empty_paren: true });
		return beautified_script_content;
	}catch{
		// Protocol error (Debugger.getScriptSource): No script for id: <ID>
		return ""
	}
}



/**
 * ------------------------------------------------
 *  			Main Crawler Thread
 * ------------------------------------------------
**/


/**
 * Playwright version of crawlWebsite function
 * Uses JSDOM-based script collection approach from crawler-taint.js
 */
async function crawlWebsitePlaywright(browser, url, domain, frontier, dataDirectory, debug_run, wait_before_next_url, lift_enabled, transform_enabled, pure_crawl){

	DEBUG && console.log("crawlWebsitePlaywright called on ", url)

	var externalScripts = {};
	let finished = false;
	let page = await browser.newPage();
	var closePage = true;

	/**
	* Disable Content-Security Policy (CSP) to avoid breaking when adding cross-domain scripts
	*/
	await page.setViewportSize({ width: 1366, height: 768});

	// Playwright request/response tracking - capture external scripts
	let httpResponses = {};
	let externalScriptPromises = [];
	let seenScriptHashes = new Set();
	page.on('response', async response => {
		const url = response.url();
		httpResponses[''+url] = await response.allHeaders();

		console.log("[response] response.url():", response.url())
		console.log("[response] response.status:", response.status())

		if (response.request().resourceType() === 'script') {
			const scriptPromise = response.text().then(async (script_content) => {
				let scriptHash = getMD5Hash(script_content);				
				if(seenScriptHashes.has(scriptHash)){
					console.log("[response] skipping duplicate script for url:", url)
					return; // skip duplicate scripts
				}
				seenScriptHashes.add(scriptHash);
				let scriptSourceMappingObject = await getScriptSourceMappingObject(script_content, transform_enabled);
				externalScripts[url] = scriptSourceMappingObject;
			}).catch( e => {
				// Response body is unavailable for redirect responses
				// PASS
			});
			externalScriptPromises.push(scriptPromise);
		}
	});

	let httpRequests = {};
	page.on('request', async (request) => {
		let requestUrl = request.url();
		// filter out data:image urls
		if (!requestUrl.startsWith('data:image')){
			let requestHeaders = await request.allHeaders();
			let requestBody = request.postData();
			httpRequests[requestUrl] = {
				'headers': requestHeaders,
				'postData': requestBody,
			}
		}
	});

	let html = undefined, cookies = undefined, webStorageData = undefined
	try{
		DEBUG && console.log('[pageLoad] loading new URL: ' + url);

		// redirect browser console log in the browser to node js log
		BROWSER_LOG && page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));

		response = await page.goto(url, {waitUntil: 'load', timeout: 60000});
		await page.waitForTimeout(1000);
		DEBUG && console.log('[pageLoad] new page loaded successfully');

		// wait for page to load and scripts to be captured
		DEBUG && console.log('[pageLoad] waiting for 5 seconds.');
		await page.waitForTimeout(5000);

		DEBUG && console.log('[pageLoadCompleted] new page loaded successfully');

		frontier.visited.push(url);
		frontier.unvisited = frontier.unvisited.filter(e => e !== url); // remove visited url from unvisited list

		/*
		*  ----------------------------------------------
		*  [START] Saving Web Page Data
		*  ----------------------------------------------
		*  0: Store the HTML snapshot
		*  1: Store each script
		*
		*  @note: relevant resources for storing webpages
		*    - https://github.com/puppeteer/puppeteer/issues/2433
		*    - https://github.com/microsoft/playwright/issues/592
		*    - https://github.com/markusmobius/nodeSavePageWE
		*    - https://github.com/puppeteer/puppeteer/issues/1820
		*/

		html = await page.content();
		DEBUG && console.log('[Crawler] Done retrieving page content.');

		finished = true; // lock scripts for saving

		// console.log("html:", html)
		const virtualDOM = new JSDOM(html);
		const scriptTagsDOM = virtualDOM.window.document.querySelectorAll('script')
		// DEBUG && console.log("scriptTags bf slice", JSON.stringify(scriptTags))		
		// scriptTags = Array.prototype.slice.call(scriptTags); // cast HTMLCollection to Array

		var allScripts = [];
		var idx = 0;
		for(const scriptTag of scriptTagsDOM){

			// check if we have an internal script
			let scriptSrc = scriptTag.getAttribute('src');			
			if(!scriptSrc){

				// check if the script contains JS code or json data?
				let scriptType = scriptTag.getAttribute('type');
				let scriptKind = TYPE_SCRIPT_INTERNAL;
				if(!scriptType){
					// CASE 1: `type` attribute does not exist
					allScripts[idx] = [scriptKind, scriptTag.textContent];
					idx = idx + 1;
				}
				else if(scriptType && SCRIPT_MIME_TYPES_FOR_JS.includes(scriptType)){
					// CASE 2: `type` attribute exists and is a valid JS mime type
					allScripts[idx] = [scriptKind, scriptTag.textContent];
					idx = idx + 1;
				}

			}
			else if(scriptSrc && scriptSrc.trim().length > 0){
				// the script is external
				let scriptKind = TYPE_SCRIPT_EXTERNAL;
				let scriptType = scriptTag.getAttribute('type');

				if(!scriptType){
					allScripts[idx] = [scriptKind, scriptSrc.trim()];
					idx = idx + 1;

				}else if(scriptType && SCRIPT_MIME_TYPES_FOR_JS.includes(scriptType)){
					allScripts[idx] = [scriptKind, scriptSrc.trim()];
					idx = idx + 1;
				}

			}
		}		

		// wait for all external script promises to resolve before accessing externalScripts
		DEBUG && console.log('[Crawler] Waiting for external script promises to resolve...');
		await Promise.allSettled(externalScriptPromises);
		DEBUG && console.log('[Crawler] All external scripts loaded.');

		for(const [index, scriptItem] of allScripts.entries()){
			console.log(`index: ${index}, script: ${scriptItem}`)

			let scriptKind = scriptItem[0];

			if(scriptKind === TYPE_SCRIPT_INTERNAL){
				let scriptContent = scriptItem[1];
				allScripts[index][1] = await getScriptSourceMappingObject(scriptContent, transform_enabled);
			}else{

				let scriptSrc = scriptItem[1];

				// the script `src` obtained here must be present in the `externalScript` list intercepted via playwright
				// but there is no guarantee that the URL is present in a verbatim form there,
				// i.e., this URL could be a substring of the URL present in the `externalScript`
				// thus we search for this URL, and replace the external script url with its content				
				let externalScriptUrls = Object.keys(externalScripts);
				console.log("[DEBUG] externalScriptUrls:", externalScriptUrls)
				
				for(const url of externalScriptUrls){
					if(url.includes(scriptSrc)){
						allScripts[index][1] = await externalScripts[url];						
						allScripts[index].push(url);
						// note: if a script is external and does not have the `SCRIPT_SRC_REPLACED_WITH_CONTENT`
						// item, then the script url has not been replaced with its content.
						allScripts[index].push('SCRIPT_SRC_REPLACED_WITH_CONTENT');
						delete externalScripts[url];
						break;
					}
				}

			}
		}
		
		debugger;
		for(const [url, scriptSourceMappingObject] of Object.entries(externalScripts)){
			allScripts.push(['external', scriptSourceMappingObject, url, 'SCRIPT_SRC_REPLACED_WITH_CONTENT'])
			console.log("[DEBUG] url:", url)
		}				


		try {
			allScripts.forEach((e) => {	
			debugger		
			if(e[2]){
				DEBUG && console.log(`"[DEBUG] ${e[2]}": ${e[1]['code'].slice(0, 25)}`)
			}
		})
		} catch (error) {}
		
		// insert External Scripts leftover handle code here..

		DEBUG && console.log('[Crawler] Done collecting scripts.');

		// web storage data
		webStorageData = await page.evaluate( () => {

			function getWebStorageData() {
			    let storage = {};
			    let keys = Object.keys(window.localStorage);
			    let i = keys.length;
			    while ( i-- ) {
			        storage[keys[i]] = window.localStorage.getItem(keys[i]);
			    }
			    return storage;
			}

			let webStorageData = getWebStorageData();
			return webStorageData;
		});
		DEBUG && console.log('[Crawler] Done getting webstorages.');

		// cookies and local storage (Playwright uses context.storageState())
		cookies = await page.context().storageState();
		DEBUG && console.log('[Crawler] Done getting cookies.');

		try{
			// save the collected data
			await savePageData(url, html, allScripts, cookies, webStorageData, httpRequests, httpResponses, dataDirectory, lift_enabled, transform_enabled);
		}catch(e){
			DEBUG && console.log('[PageSaveError] error while saving the webpage data');
			DEBUG && console.log('[PageSaveError]', e);
		}
		DEBUG && console.log('[Crawler] Done saving page data.');

		/**
		* @warning
		* We need to prevent auto navigation / auto page refresh
		* during the vulnerability detection process. This is because we force execute
		* the Iroh's instrumentation engine and webpage's instrumented scripts, and store the
		* internal processing results within page JS variable. If the page get's reloaded,
		* these JS variables will become undefined for the next processing steps during the
		* vulnerability detection, which in turn can produce false negative results.
		*
		* To workaround this issue, we cancel the navigation / page refresh
		* everytime the `beforeunload` event fires.
		* Thanks to: https://stackoverflow.com/questions/821011/prevent-a-webpage-from-navigating-away-using-javascript
		*/
		await page.evaluate( () => {
			window.addEventListener('beforeunload', (event) => {
				// cancel the event as stated by the standard.
				event.preventDefault();
				// chrome requires returnValue to be set.
				event.returnValue = 'locking auto-page refresh.';
				return "";
			});
		})

		DEBUG && console.log('[Crawler] collecting webpage URLs.');

		//// fetch new urls
		let hrefs = await page.$$eval('a', as => as.map(a => a.href));

		for(let href of hrefs){

			// check if href belong to the same eTLD+1 / domain
			// see: https://www.npmjs.com/package/psl
			if(href.includes(domain) && isValid(href)){

				// add if href does not exist already
				if(frontier.all.indexOf(href) === -1){
					frontier.all.push(href);
				}
				if(frontier.unvisited.indexOf(href) === -1){
					frontier.unvisited.push(href);
				}
			}
		}

		await page.waitForTimeout(1000);

	} catch (e) {
		console.log('[exception] error while navigating/saving the page', e)
		try{
			// close the previous browser and clean up temp directory
			const tempDir = browser._tempUserDataDir;
			await browser.close()
			if(tempDir && fs.existsSync(tempDir)){
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		}catch(e2){
			// PASS
			console.log('[exception] error while closing context', e2);
		}
		frontier.visited.push(url);
		frontier.unvisited = frontier.unvisited.filter(e => e !== url); // remove visited url from unvisited list
		browser = await launch_playwright(true);
		closePage = false
	}

	/*
	*  ------------------------------------
	*  Next URL and Termination Criteria
	*  ------------------------------------
	*/

	DEBUG && console.log('[Crawler] moving to the next URL.');
	if(closePage){
		await page.close();
	}


	// terminate if this was only a debug run to test a single URL
	if(debug_run) {
		console.log('[Crawler] this is a debug run, thus stopping!')
		return browser;
	}

	// termination criteria
	if(frontier.visited.length >= maxVisitedUrls){
		console.log('[Crawler] max urls visited, thus stopping!')
		return browser;
	}

	if(frontier.unvisited.length === 0){
		console.log('[Crawler] frontier is empty, thus stopping!')
		return browser;
	}

	// pick a new url randomly such that it is not visited before
	let nextURL = await frontier.unvisited[Math.floor(Math.random()*frontier.unvisited.length)];

	// recurse
	ret_browser_instance = await crawlWebsitePlaywright(browser, nextURL, domain, frontier, dataDirectory, false, 0, lift_enabled, transform_enabled, pure_crawl);
	console.log(ret_browser_instance)
	logger.info(`ret_browser_instance: ${ret_browser_instance}`)
	return ret_browser_instance
}


async function launch_playwright(headless_mode, additional_args=undefined){
	// Create temp user data directory for session isolation
	const userDataDir = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'playwright-'));
	
	console.log('additional_args', JSON.stringify(additional_args, 4))

	let options = {
		channel: 'chromium',
		bypassCSP: true,
		headless: headless_mode,
		ignoreHTTPSErrors: true,		
	}

	options = {...options, ...additional_args} // additional args will override this setting if provided

	console.log("playwright options: ", JSON.stringify(options, 4))

	// Use launchPersistentContext for isolated sessions
	var browser = await chromium.launchPersistentContext(userDataDir, options);

	// Attach temp directory path to browser object for cleanup later
	browser._tempUserDataDir = userDataDir;

	return browser;
}

/**
 * Cleanup helper function for Playwright browser context
 * Closes the browser and removes the temporary user data directory
 */
async function cleanup_playwright(browser){
	const tempDir = browser._tempUserDataDir;
	try {
		await browser.close();
	} catch (error) {
		logger.warn('Error closing Playwright browser:', error);
	}

	// Clean up temp user data directory
	if(tempDir && fs.existsSync(tempDir)){
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch (cleanupError) {
			logger.warn(`Failed to clean up temp directory ${tempDir}:`, cleanupError);
		}
	}
}

/*
* entry point of crawler
*/
if (require.main === module) {

(async function(){

    const processArgv = argv(process.argv.slice(2));
    const config = processArgv({}) || {};
    const url = config.seedurl;
    const overwrite_results = (config.overwrite && config.overwrite.toLowerCase() === 'true')? true: false;
	const lift_enabled = (config.lift && config.lift.toLowerCase() === 'true')? true: false;
	const transform_enabled = (config.transform && config.transform.toLowerCase() === 'true')? true: false;
	const pure_crawl = (config.pure && config.pure.toLowerCase() === 'true')? true: false;

    if(config.maxurls){
    	maxVisitedUrls = config.maxurls;
    }
    const headless_mode = (config.headless && config.headless.toLowerCase() === 'false')? false: true;
	const debug_run = false;
	const wait_before_next_url = 0; // 5 * 60000; // wait 5 minutes
	const additional_args = ((!config.additionalargs) || (config.additionalargs && config.additionalargs.toLowerCase() === 'false')) ? undefined : JSON.parse(config.additionalargs);	

	if(!overwrite_results && directoryExists(url)){
		DEBUG && console.log('site already crawled: '+ url);
		return 1;
	}
	else{
		cleanDirectory(url)
	}

	/** 
	* @note
	* To add support for other browsers via browser stack, change the 
	* below puppeteer initialization config. 
	* For documentation on browser stack, see here:
	* https://www.browserstack.com/docs/automate/puppeteer/local-testing
	*/

	// Temporarily using Playwright instead of Puppeteer
	var browser = await launch_playwright(headless_mode, additional_args)

	var frontier = {
		'all': [url],
		'visited': [],
		'unvisited': [url],
	}
	const dataDirectory = getOrCreateDataDirectoryForWebsite(url);

	const globalTimer = elapsed.start('global_crawling_timer');

	// use public suffix list to restrict crawled urls to the same domain
	var domain = psl.get(url.replace('https://', '').replace('http://', ''));
	browser = await crawlWebsitePlaywright(browser, url, domain, frontier, dataDirectory, debug_run, wait_before_next_url, lift_enabled, transform_enabled, pure_crawl);

	const globalTime = globalTimer.get();
	globalTimer.end();

	// store elapsed time to disk
	fs.writeFileSync(pathModule.join(dataDirectory, "time.crawling.out"), JSON.stringify({
		"crawling_time": globalTime,
	}));


	const urls = await readFile(pathModule.join(dataDirectory, "urls.out"))

	if(urls !== -1){
			let hashes = {};
			urls.split('\n').forEach(u=>{
				if(u.trim() !== ''){
					hashes[u]= hashURL(u);
				}

			});
			fs.writeFileSync(pathModule.join(dataDirectory, "urls.hashes.out"), JSON.stringify(hashes));
	}


	await cleanup_playwright(browser);


})();
}

module.exports = {
	getNameFromURL,
	hashURL,
	crawlWebsitePlaywright,
	launch_playwright,
	cleanup_playwright
}