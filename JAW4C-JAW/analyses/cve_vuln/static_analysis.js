/*
		Copyright (C) 2022  Soheil Khodayari, CISPA
		This program is free software: you can redistribute it and/or modify
		it under the terms of the GNU Affero General Public License as published by
		the Free Software Foundation, either version 3 of the License, or
		(at your option) any later version.
		This program is distributed in the hope that it will be useful,
		but WITHOUT ANY WARRANTY; without even the implied warranty of
		MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
		GNU Affero General Public License for more details.
		You should have received a copy of the GNU Affero General Public License
		along with this program.  If not, see <http://www.gnu.org/licenses/>.


		Description:
		------------
		Static analysis for CVE vulnerabilities
*/


/**
 * ------------------------------------------------
 *   			third-party imports
 * ------------------------------------------------
**/
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");
const elapsed = require("elapsed-time-logger");

/**
 * ------------------------------------------------
 *   				module imports
 * ------------------------------------------------
**/
const constantsModule = require('./../../engine/lib/jaw/constants')
const SourceSinkAnalyzerModule = require('./cve_vuln_traversals.js');
const globalsModule = require('./globals.js');
const SourceSinkAnalyzer = SourceSinkAnalyzerModule.CVESourceSinkAnalyzer;


const GraphExporter = require('./../../engine/core/io/graphexporter');

// For smarter chunk heuristics
const acorn = require('acorn');
const walk = require('acorn-walk');
const { has } = require('core-js/core/dict');

/**
 * ------------------------------------------------
 *  			constants and globals
 * ------------------------------------------------
**/

// directory where the data of the crawling will be saved
const BASE_DIR = pathModule.resolve(__dirname, '../..')
const dataStorageDirectory = pathModule.join(BASE_DIR, 'data');

// when true, nodejs will log the current step for each webpage to the console 
const DEBUG = true; 		

const do_ast_preprocessing_passes = false;
var do_compress_graphs = true;
var overwrite_hpg = false;
var iterative_output = false;
var all_patterns = [];


/**
 * ------------------------------------------------
 *  			utility functions
 * ------------------------------------------------
**/

function acron_parse(code){
	const acron_config_obj = {ecmaVersion: 2022}    
	try {
		return acorn.parse(code, acron_config_obj);
	} catch (error) {
		;    
	}
	try {
		config = acron_config_obj
		config.sourceType = "module"
		return acorn.parse(code, config);
	} catch (error) {
		console.log("Error parsing.")
		return undefined;
	}
}

function is_webpack_identifier(node){
	// Check if the assignment target contains webpack-related keywords
	if(!node) return false;
	if(node.type === 'MemberExpression' && node.property){
		const propName = (node.property.name || node.property.value || '').toLowerCase();
		return /webpack|chunk|loadable/.test(propName);
	}
	return false;
}

function is_bundle_chunk(ast){
	try{
		walk.simple(ast, {
			CallExpression(callexpr){
				if(
					callexpr.start < 200 // must appear near the beginning of the file (allows for "use strict" or license comments)
					&& callexpr.callee
					&& callexpr.callee.type === 'MemberExpression'
					&& callexpr.callee.property.name && callexpr.callee.property.name === "push" // pushing chunks to WEBPACK_CHUNKS
					&& callexpr.callee.object && callexpr.callee.object.type === "AssignmentExpression" // fingerprint: self.__LOADABLE_LOADED_CHUNKS__ = self.__LOADABLE_LOADED_CHUNKS__ || []
					&& is_webpack_identifier(callexpr.callee.object.left) // check for webpack-related identifier
					&& callexpr.callee.object.right && callexpr.callee.object.right.type === "LogicalExpression" // self.__LOADABLE_LOADED_CHUNKS__ || []
					&& callexpr.callee.object.right.operator && callexpr.callee.object.right.operator == "||" // ||
					&& callexpr.callee.object.right.right && callexpr.callee.object.right.right.type == "ArrayExpression" // []
				){
					throw { found: true }; // Early exit
				}
			}
		})
	}
	catch(err){
		if(err.found){
			return true;
		}
		return false;
	}
	return false;
}

const withTimeout = (millis, promise) => {
    const timeout = new Promise((resolve, reject) =>
        setTimeout(
            () => reject(`Timed out after ${millis} ms.`),
            millis));
    return Promise.race([
        promise,
        timeout
    ]);
};


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
		// console.error(err);
		return -1;
	}
}


/** 
 * @function getNameFromURL 
 * @param url: eTLD+1 domain name
 * @return converts the url to a string name suitable for a directory by removing the colon and slash symbols
**/
function getNameFromURL(url){
	return url.replace(/\:/g, '-').replace(/\//g, '');
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
	if(!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
	return folderPath;
}

/** 
 * @function isCdnScript 
 * @param {object} script_object, Ex: {	
 * "20.js": {
		"type": "external",
		"src": "https://www.routledge.com/js/bootstrap.bundle.min.js",
		"lines": null,
		"hash": "53a5b59c96c89303d5fb5e51219f8eb2"
	},
}
 * @return {boolean} whether or not the input is a library script
**/

function isFromLibraryCDN(jsString) {
  const CDN_KEYWORDS = [
    // Public CDNs
    "code.jquery.com",
    "cdnjs.cloudflare.com",
    "ajax.googleapis.com",
    "cdn.jsdelivr.net",
    "jsdelivr.net",
    "unpkg.com",
    "cdn.bootcdn.net",
    "cdn.staticfile.org",
    "lib.baomitu.com",
    "ajax.aspnetcdn.com",
    "www.gstatic.com",
    "apis.google.com",

    // Analytics / SDK CDNs
    "www.googletagmanager.com",
    "www.google-analytics.com",
    "static.hotjar.com",
    "script.hotjar.com",
    "cdn.segment.com",
    "cdn.optimizely.com",
    "js-agent.newrelic.com",
    "cdn.mxpnl.com",
    "pagead2.googlesyndication.com",
    "adservice.google.com",

    // Social SDKs
    "connect.facebook.net",
    "platform.twitter.com",
    "cdn.syndication.twimg.com",
    "platform.linkedin.com",

    // Payment SDKs
    "js.stripe.com",
    "www.paypalobjects.com",
    "checkoutshopper-live.adyen.com",
    "sdk.razorpay.com",

	// static resouces
	"/assets"
  ];

  const lower = jsString.toLowerCase();
  return CDN_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isCdnScript(script_object){
	if(script_object === undefined){
		return false
	}
	else{
		if(script_object['src'] !== undefined){
			const has_version_str = /\d+\.\d+\.\d+/.test(script_object['src']); 
			const is_cdn_script = isFromLibraryCDN(script_object['src']) && has_version_str;
			return (is_cdn_script || has_version_str);
		}	
	}	
}


/** 
 * @function isLibraryScript 
 * @param {string} script: script src (when `mode: src`) or script content (when `mode: content`)
 * @param {string} options: determines the type of the `script` param (format `{mode: type}` with types being `src` or `content`)
 * @return {boolean} whether or not the input is a library script
**/
function isLibraryScript(scriptlink, scriptContent){

	let return_flag = false;
	let result_str = "";
	let script_src = scriptlink.toLowerCase();
	for(let h of globalsModule.lib_src_heuristics){
		if(script_src.includes(h)){ // check script src
			// console.log(`[Analyzer] Library heuristic match found for src: ${h} in ${script_src}`);
			result_str += `src heuristic: ${h}`;
			return_flag = true;
			break;
		}
	}


	let script_content = scriptContent;
	for(let h of globalsModule.lib_content_heuristics){
		if(script_content.includes(h)){ // check script content
			// console.log(`[Analyzer] Library heuristic match found for content heuristic: ${h}`);
			result_str += `content heuristic: ${h}`;
			return_flag = true;
			break;
		}
	}

	// check for webpack bundle chunks
	let ast = acron_parse(scriptContent);
	if(ast && is_bundle_chunk(ast)){
		// console.log(`[Analyzer] Library heuristic match found for webpack bundle chunk at src: ${script_src}`);
		result_str += `webpack bundle chunk`;
		return_flag = true;
	}

	return [return_flag, result_str];
}


/**
 * ------------------------------------------------
 *  		Main Static Analysis Thread
 * ------------------------------------------------
**/


async function staticallyAnalyzeWebpage(url, webpageFolder){
	console.log(`[staticallyAnalyzeWebpage]: ${url}, ${webpageFolder}`)
	let results_timing_file = pathModule.join(webpageFolder, "time.static_analysis.out");
	if(!overwrite_hpg && fs.existsSync(results_timing_file)){
		DEBUG && console.log('[skipping] results already exists for: '+ webpageFolder)
		return 1;
	}

	// read the crawled scripts from disk
	let scripts = [];
	var sourcemaps = {};
	let dirContent = fs.readdirSync( webpageFolder );


	let scripts_mapping = {};
	let scripts_mapping_content = await readFile(pathModule.join(webpageFolder, 'scripts_mapping.json'));
	if(scripts_mapping_content != -1){
		try{
			scripts_mapping = JSON.parse(scripts_mapping_content);
		}
		catch{
			// PASS
		}
	}
	
	var library_scripts = [];
	let scriptFiles = dirContent.filter(function( elm ) {return elm.match(/^\d+\.js$/i) && !elm.match(/\.min\.js$/i);});
	// sort scriptFiles based on the shortname
	scriptFiles.sort((a, b) => {
		const numA = parseInt(a.split('.')[0]);
		const numB = parseInt(b.split('.')[0]);
		return numA - numB;
	});
	console.log('scriptFiles:', scriptFiles)
	for(let script_short_name of scriptFiles){
		let script_full_name = pathModule.join(webpageFolder, script_short_name);
		let source_map_name = pathModule.join(webpageFolder, script_short_name + '.map');

		// read script content
		let script_content = await readFile(script_full_name);
		let result_str = []

		// Library based heuristics to see if we need to skip this script
		if(script_short_name in scripts_mapping){

			let script_object = scripts_mapping[script_short_name];
			if(script_object['type'] === 'external'){
				// Deprecated isLibraryScript removed, this heuristic is too strong for analyzing bundled code, which often skips the library object calls from the bundles
				// We only filter out the direct resources from cdn sites
				let is_cdn_script = isCdnScript(script_object);
				// readin the script content for library heuristics				
				let [is_library, library_result_str] = isLibraryScript(script_object['src'], script_content);
				if((is_cdn_script || is_library) && (!disable_heuristic_skip)){
					DEBUG && is_cdn_script && result_str.push(`cdn library object`)
					DEBUG && is_library && result_str.push(library_result_str)
					DEBUG && console.log(`[Heuristic Filter] Skipping ${script_short_name} (${script_object['src']}): ${result_str.join(' | ')}`)
					library_scripts.push(script_short_name);
					continue;
				}
			}
			else{
				// inline script, always process
				result_str.push(`inline script`);			
			}			
		}
		
		// Pattern matching to see if we need to process this script
		let has_pattern_in_script = false;		
		if(script_content !== -1){
			for(let pattern of all_patterns){
				// Escape special regex chars and use word boundary for identifier matching
			const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const identifierRegex = new RegExp(`\\b${escapedPattern}\\b`);
			if((!globalsModule.overly_common_patterns.includes(pattern)) && (!globalsModule.js_builtin.includes(pattern)) && identifierRegex.test(script_content)){
					// balance between overly common patterns, ex: lodash '_', 
					// skip builtin js objects too, for poc with those patterns, the existance of libobj itself will do its work 
					// ex: $.extend(), extend is a js builtin function, we don't look for files with extend pattern, but the existence of libObj $ will do its work
					has_pattern_in_script = true;					
					result_str.push(`pattern match: "${pattern}"`);
					break;
				}
			}
		}		
		if(!has_pattern_in_script){
			console.log(`[Heuristic Filter] Skipping ${script_short_name}: no pattern match found`)
			continue;
		}
		
		// [Test feature] Finally, skip code having more than 30000 lines, as they are mostly minified libraries
		// let num_lines = script_content.split('\n').length;
		// if(num_lines > 30000){
		// 	console.log(`[Heuristic Filter] Skipping ${script_short_name}: too many lines (${num_lines})`)
		// 	continue;
		// }

		if(script_content !== -1 && has_pattern_in_script){		
			console.log(`[Heuristic Filter] Processing ${script_short_name}: ${result_str.join(' | ')}`)	
			scripts.push({
				scriptId: script_short_name.split('.')[0],
				source: script_content,
				name: script_full_name,
			})
		}

		let sourcemap_content = await readFile(source_map_name);
		if(sourcemap_content != -1){
			sourcemaps[script_short_name] = JSON.parse(sourcemap_content);
		}
	}

	let library_scripts_path_name = pathModule.join(webpageFolder, 'library_scripts.json');
	fs.writeFileSync(library_scripts_path_name, JSON.stringify(library_scripts));
	DEBUG && console.log(`[Analyzer] scripts ${scripts.length}`)
	DEBUG && console.log(`Final scripts to be analyzed:`, scripts.map(s => `${s.scriptId}.js`))
	/*
	*  ----------------------------------------------
	*  [START] 
	*  ----------------------------------------------
	*  0: building the static model
	*  1: querying the model to find the sources 
	*/

	/** 
	* 0: Building the static model
	*/
	const totalTimer = elapsed.start('total_static_timer');
	const hpgConstructionTimer = elapsed.start('hpg_construction_timer');
	DEBUG && console.log('[StaticAnalysis] started static model construction.');
	let SourceSinkAnalyzerInstance = new SourceSinkAnalyzer();

	DEBUG && console.log('[StaticAnalysis] AST parsing.');

	let scriptsCode = '';
	let parsingErrors = [];
	for(let [idx, script] of scripts.entries()){
		let scriptName = script.name; // '' + idx + '.js';
		console.log(`[static_analysis] [${idx}/${scripts.length}] processing script: ${scriptName}`)
		let parsingError = await SourceSinkAnalyzerInstance.api.initializeModelsFromSource(scriptName, script.source, constantsModule.LANG.js, do_ast_preprocessing_passes)
		if(parsingError && parsingError === scriptName){
			parsingErrors.push(parsingError);
		}
		scriptsCode = scriptsCode + script.source + '\n\n';
	}

	fs.writeFileSync(pathModule.join(webpageFolder, "concat.js"), scriptsCode)
	DEBUG && console.log('[StaticAnalysis] Writing concatenated code to concat.js...');

	DEBUG && console.log('[StaticAnalysis] HPG construction.');
	let timeoutPDG = await SourceSinkAnalyzerInstance.api.buildInitializedModels();
	if(timeoutPDG){
		DEBUG && console.log('[StaticAnalysis] PDG construction timed out');
	}
	else{
		DEBUG && console.log('[StaticAnalysis] AST/CFG/PDG done.')
	}

	const basicHpgConstructionTime = hpgConstructionTimer.get(); // AST, CFG, PDG
	hpgConstructionTimer.end();



	const CsvHpgConstructionTimer = elapsed.start('csv_hpg_construction_timer');
	DEBUG && console.log('[StaticAnalysis] started HPG export: IPCG/ERDDG/SemTypes.')
	var graphBuilderOptions= { 'ipcg': true, 'erddg': true, 'output': webpageFolder, 'iterativeOutput': iterative_output };
	const graph = await SourceSinkAnalyzerInstance.api.buildHPG(graphBuilderOptions); // IPCG, ERDDG + SemanticTypes + node/edge format
	const graphid = hashURL(url);

	DEBUG && console.log('[StaticAnalysis] started mapping foxhound edges and semantic types.');
	// read taintflows, script_mapping and sourcemap files
	var taintflows = readFile(pathModule.join(webpageFolder, 'taintflows.json'));

	if(taintflows === -1){
		taintflows = false;
	}else{
		try{
			taintflows = JSON.parse(taintflows);
		}
		catch{
			taintflows = false;
		}
	}
	const foxhound_data = await SourceSinkAnalyzerInstance.api.getDynamicFoxhoundEdgesAndSemTypes(taintflows, scripts_mapping, sourcemaps);
	DEBUG && console.log('[StaticAnalysis] finished mapping foxhound edges and semantic types.')


	DEBUG && console.log('[StaticAnalysis] started HPG export to CSV.');
	GraphExporter.exportToCSVDynamic(graph, foxhound_data, graphid, webpageFolder);
	DEBUG && console.log('[StaticAnalysis] finished HPG export to CSV.');
	
	const pdgMarker =  pathModule.join(webpageFolder, "pdg.tmp");
	await fs.writeFileSync(pdgMarker, JSON.stringify({"pdg": timeoutPDG? 1: 0}));
	

	const CsvHpgConstructionTime = CsvHpgConstructionTimer.get();
	CsvHpgConstructionTimer.end();


	if(do_compress_graphs){
		DEBUG && console.log('[StaticAnalysis] started compressing HPG.');
		GraphExporter.compressGraph(webpageFolder);
		DEBUG && console.log('[StaticAnalysis] finished compressing HPG.');	
	}


	const totalTime = totalTimer.get();
	totalTimer.end();



	// store elapsed time to disk
	fs.writeFileSync(pathModule.join(webpageFolder, "time.static_analysis.out"), JSON.stringify({
		"total_static_timer": totalTime,
		"csv_hpg_construction_timer": CsvHpgConstructionTime,
		"in_memory_hpg_construction_timer": basicHpgConstructionTime,
	}));



}


/*
* entry point of exec
*/
(async function(){
    var processArgv = argv(process.argv.slice(2));
    var config = processArgv({}) || {};
    const seedurl = config.seedurl;
    const singleFolder = config.singlefolder;
    overwrite_hpg = (config.overwritehpg && config.overwritehpg.toLowerCase() === 'true')? true: false; 
    do_compress_graphs = (config.compresshpg && config.compresshpg.toLowerCase() === 'false')? false: true; 
  	iterative_output = (config.iterativeoutput && config.iterativeoutput.toLowerCase() === 'true')? true: false;
	all_patterns = (config.allpatterns && config.allpatterns.length > 0)? JSON.parse(config.allpatterns): [];	
	disable_heuristic_skip = (config.disable_heuristic_skip && config.disable_heuristic_skip.toLowerCase() === 'true')? true: false; 

	if(singleFolder && singleFolder.length > 10){

		if(fs.existsSync(singleFolder)){
				var urlContent = readFile(pathModule.join(singleFolder, "url.out"));
				if(urlContent != -1){
					var webpageUrl = urlContent.trim();
					await staticallyAnalyzeWebpage(webpageUrl, singleFolder);				
				}
		}else{
			console.log('[Warning] the following directory does not exists, but was marked for static analysis: '+ webpageFolder +'\n url is: '+ webpageUrl);
		}	

	}else{

	    const dataDirectory = getOrCreateDataDirectoryForWebsite(seedurl);
		const urlsFile = pathModule.join(dataDirectory, "urls.out");
		const urlsFileContent = readFile(urlsFile);

		if(urlsFileContent != -1){
			
			const globalTimer = elapsed.start('global_static_timer');
			
			const urls = new Set(urlsFileContent.split("\n")); // do not consider duplicate urls

			for(let webpageUrl of urls.values()){
				
				if(webpageUrl.trim().length > 1 ){ // eliminate empty strings
					let _hash = hashURL(webpageUrl);
					let webpageFolder = pathModule.join(dataDirectory, _hash);
					if(fs.existsSync(webpageFolder)){
							await staticallyAnalyzeWebpage(webpageUrl, webpageFolder);		

					}else{
						console.log('[Warning] the following directory does not exists, but was marked for static analysis: '+ webpageFolder +'\n url is: '+ webpageUrl);
					}			
				}	
			}

			const globalTime = globalTimer.get();
			globalTimer.end();
			fs.writeFileSync(pathModule.join(dataDirectory, "time.static_analysis.out"), JSON.stringify({
				"total_static_timer": globalTime,
			}));

		}
		else{
			console.log('[Warning] urls.out is empty for website: '+ seedurl +', thus exiting static-analysis pass.')
		}
	}

})();






