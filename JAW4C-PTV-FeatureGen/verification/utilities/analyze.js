const fs = require('fs');
const path = require('path');
const {PTV, PTVOriginal} = require('../index.js'); 
const logger = require('./logger.js')
const { checkPrimeSync } = require('crypto');
const { error } = require('console');
const { tree } = require('d3');
const { forEach } = require('lodash');
const { start } = require('repl');

const detectorLibraryPath = '/Users/ian/cmu/Cylab-JSBundle/Bundle-PTV/data/libraries.json';
const libDataPath = '/Users/ian/cmu/Cylab-JSBundle/PTdetector-feature-gen/static/libs_data';
const PTVExtensionPath = '/Users/ian/cmu/Cylab-JSBundle/Bundle-PTV'
const PTVOriginalExtensionPath = '~/cmu/Cylab-JSBundle/PTV';
const app_py_base_url = "http://127.0.0.1:6548/test"


const {compare, validate} = require('compare-versions');
function version_matching(version_str, detector_str){
    if(version_str === detector_str){
        return true;
    }
    else{
        // parse truth version        
        right_versions = detector_str.split(",")
        right_versions = right_versions.map(element => {
            start_end = element.split('~')
            start_end = start_end.map(x => x.trim())
            return start_end
        });
        console.log("right_versions", right_versions)
        return right_versions.some(start_end => {
            match = false            
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
// version_matching('1.0.0', '1.0.0, 1.1.0')

if (require.main === module) {
    (async () => {
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
        detector_libs = {}
        detector_libs_file = fs.readFileSync(detectorLibraryPath, 'utf8')
        detector_libs = JSON.parse(detector_libs_file) // [{"libname": ..., ...}, {}, {}]
        
        // Matching detector library with their versions and do verification
        i = 0; // Bundle-PTV
        // "gremlins.js", "hprose-html5", "html5media", "html5shiv", "ieBetter.js", "jade", "jointjs", "joopl", "jquery-tools", "jquery.isotope", "js-combinatorics", "jsel", "jsencrypt", "jsondiffpatch", "kineticjs", "kissui.scrollanim", "knockout", "layui", "leaflet-omnivore", "leaflet", "libil", "libsodium-wrappers", "livereload-js", "materialize", "mediaelement", "metro",
        test_arr = [ "mithril", "mixitup", "mobile-angular-ui", "modernizr", "mootools", "nomnoml", "nprogress", "oauth-io", "ol3", "omi", "openpgp", "oppia", "pouchdb", "powerbi-client", "primish", "prototype", "pusher", "rax", "san", "shopify-cartjs", "soga", "soundmanager2"]
        for(;i < detector_libs.length; i++){
            error_count = 0
            lib = detector_libs[i]
            libname = lib["libname"]   
            if(!test_arr.includes(libname)){
                continue
            }            
            matches = 0
            version_obj = fileList?.[libname]
            for(index of Object.keys(version_obj)){
                url = `${app_py_base_url}/${libname}/${index}`
                const PTVPuppeteerLaunchConfig = {
                headless: true, // Extensions won't work in headless mode
                args: [              
                    `--disable-extensions-except=${PTVExtensionPath}`,
                    `--load-extension=${PTVExtensionPath}`,
                    `--ignore-certificate-errors`,
                    `--disk-cache-dir=/dev/null`, 
                    `--disk-cache-size=1`
                ]
                }            
                resPTV = await PTV(url, PTVPuppeteerLaunchConfig, false, false)  
                truth_version = fileList?.[libname]?.[index]?.['version']
                lib_match = false;
                if(!resPTV?.["detection"]?.[0].some((x) => {
                    try {
                        if(x?.['libname'] === libname){
                            lib_match = true;
                            if(version_matching(truth_version, x?.['version'])){                        
                                logger.info(`[${index}] - [${matches}/${Object.keys(version_obj).length}] [${i}]${libname} at version ${truth_version} matched`)
                                matches += 1
                                return true;
                            }
                            logger.error(`[${index}] - [${matches}/${Object.keys(version_obj).length}] version unmatch for [${i}]${libname}, detector: ${x?.['version']}, truth: ${truth_version}`)                    
                            return false;
                        }                    
                        return false;
                    } catch (error) {
                        logger.error(`[${index}] - [${matches}/${Object.keys(version_obj).length}] version error for [${i}]${libname}, detector: ${x?.['version']}, truth: ${truth_version}, error: ${error}`)                    
                    }
                })){
                    //
                }
                if(!lib_match){
                    logger.error(`[${index}] - [${matches}/${Object.keys(version_obj).length}] library unmatch for [${i}]${libname}, detector: ${JSON.stringify(resPTV?.["detection"]?.[0])}, truth: ${truth_version}`)                                        
                }
            }                    
            logger.error(`[${i}]${libname} detection rate: ${matches}/${Object.keys(version_obj).length} = ${matches/Object.keys(version_obj).length}`)
        }        
    })();
  }
  

