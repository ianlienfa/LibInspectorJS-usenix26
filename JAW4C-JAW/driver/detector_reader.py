
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

def get_name_from_url(url: str) -> str:
    return (
        url.replace(":", "-")
           .replace("/", "")
           .replace("&", "%26")
           .replace("=", "%3D")
           .replace("?", "%3F")
    )

def read_raw_result_with_url(url):
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_storage_directory = os.path.join(BASE_DIR, 'data')
    hash_mapping_path = os.path.join(data_storage_directory, get_name_from_url(url), 'urls.hashes.out')
    with open(hash_mapping_path, 'r') as f:
        hash_mapping = json.load(f)
    if hash_mapping and (url_hash := hash_mapping.get(url, None)):
        detection_res_path = os.path.join(data_storage_directory, get_name_from_url(url), url_hash, 'lib.detection.json')    
    try:
        with open(detection_res_path, 'r') as f:
            obj = json.load(f)
            return obj
    except Exception as e:
        print(f"Error loading detection result {detection_res_path}:", e)
        raise e

# Take raw detection_obj then return the mod_lib_mapping
def get_mod_lib_mapping(raw_detection_obj, url, filter_library_only=True):
    detection_list = raw_detection_obj.get(url, {}).get('PTV', {}).get('detection', [])
    detection_list = detection_list[0] if len(detection_list) else []
    mod_lib_mapping = {}						
    for detected_lib in detection_list:
        print("detected_lib", detected_lib)
        if filter_library_only:
            if 'mod_' not in detected_lib['location']:
                continue
            detected_lib['location'] = detected_lib['location'].split('_')[1]     
        if detected_lib['libname'] not in mod_lib_mapping:
            mod_lib_mapping[detected_lib['libname']] = []
        mod_lib_mapping[detected_lib['libname']].append({'location': detected_lib['location'], 'version': detected_lib['version'], 'accurate': detected_lib['accurate']})
    return mod_lib_mapping

    