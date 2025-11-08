
"""

	Description:
	------------
	Simple reader for site library detector output
	

	Usage:
	------------
	> import driver.detector_reader as DetectorReader

"""

import os
import re
import json
from utils.utility import get_name_from_url

def read_raw_result_with_url(url):
    """
    @return  
    {
        "<url>": {
            "PTV": {
                "detection": [[
                    {}, ... , {}
                ]]
            }
            "PTV-Original": {}
        }
    }
    """
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_storage_directory = os.path.join(BASE_DIR, 'data')
    hash_mapping_path = os.path.join(data_storage_directory, get_name_from_url(url), 'urls.hashes.out')
    with open(hash_mapping_path, 'r') as f:
        hash_mapping = json.load(f)
    if hash_mapping and (url_hash := hash_mapping.get(url, None)):
        detection_res_path = os.path.join(data_storage_directory, get_name_from_url(url), url_hash, 'lib.detection.json')    
    try:
        with open(detection_res_path, 'r') as f: # type: ignore
            obj = json.load(f)
            return obj
    except Exception as e:
        print(f"Error loading detection result {detection_res_path}:", e) # type: ignore
        raise e

# Take raw detection_obj then return the mod_lib_mapping
def get_mod_lib_mapping(raw_detection_obj, url):
    """
    Return metadata for a given library.

    Returns:
        dict: {
            "#libname#": {
                "location": str,
                "version": str,
                "accurate": bool
            }
        }
    """
    detection_list = raw_detection_obj.get(url, {}).get('PTV', {}).get('detection', [])    
    detection_list = detection_list[0] if len(detection_list) else []
    mod_lib_mapping = {}						
    for detected_lib in detection_list:
        print("detected_lib", detected_lib)
        if 'mod_' not in detected_lib['location']:
            mod = False
            detected_lib['location'] = detected_lib['location'].replace('window.', '') # trim window
        else:
            mod = True
            detected_lib['location'] = detected_lib['location'].split('_')[1]     
        if detected_lib['libname'] not in mod_lib_mapping:
            mod_lib_mapping[detected_lib['libname']] = []
        mod_lib_mapping[detected_lib['libname']].append({'mod': mod, 'location': detected_lib['location'], 'version': detected_lib['version'], 'accurate': detected_lib['accurate']})
    return mod_lib_mapping

    