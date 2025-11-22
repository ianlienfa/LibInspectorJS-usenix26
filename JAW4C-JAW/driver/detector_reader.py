
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

def read_raw_result_with_url(data_dir, url):
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
    hash_mapping_path = os.path.join(data_storage_directory, data_dir, 'urls.hashes.out')
    with open(hash_mapping_path, 'r') as f:
        hash_mapping = json.load(f)
    if hash_mapping and (url_hash := hash_mapping.get(url, None)):
        detection_res_path = os.path.join(data_storage_directory, data_dir, url_hash, 'lib.detection.json')    
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
    url_data = raw_detection_obj.get(url, {})
    mod_lib_mapping = {}

    # Track <library, version> pairs to ensure uniqueness, favoring PTV
    seen_lib_version_pairs = set()

    # Process PTV first (highest priority)
    ptv_detection_list = url_data.get('PTV', {}).get('detection', [])
    ptv_detection_list = ptv_detection_list[0] if len(ptv_detection_list) else []
    ptv_detection_list = []

    for detected_lib in ptv_detection_list:
        print("detected_lib", detected_lib)
        if 'mod_' not in detected_lib['location']:
            mod = False
            detected_lib['location'] = detected_lib['location'].replace('window.', '') # trim window
        else:
            mod = True
            detected_lib['location'] = detected_lib['location'].split('_')[1]

        libname = detected_lib['libname']
        version = detected_lib['version']

        if libname not in mod_lib_mapping:
            mod_lib_mapping[libname] = []

        mod_lib_mapping[libname].append({
            'mod': mod,
            'location': detected_lib['location'],
            'version': version,
            'accurate': detected_lib.get('accurate', True)  # Default to True if not present
        })

        # Track this pair
        seen_lib_version_pairs.add((libname, version, detected_lib['location']))

    # Process PTV-Original second
    ptv_original_detection_list = url_data.get('PTV-Original', {}).get('detection', [])
    ptv_original_detection_list = ptv_original_detection_list[0] if len(ptv_original_detection_list) else []

    for detected_lib in ptv_original_detection_list:
        libname = detected_lib['libname']
        version = detected_lib['version']
        location = detected_lib['location']

        # Skip if already detected by PTV
        if (libname, version, location) in seen_lib_version_pairs:
            continue

        if libname not in mod_lib_mapping:
            mod_lib_mapping[libname] = []

        mod_lib_mapping[libname].append({
            'mod': False,
            'location': location if location != 'window' else libname,
            'version': version,
            'accurate': detected_lib.get('accurate', True)  # Default to True if not present
        })

        seen_lib_version_pairs.add((libname, version, location))

    # Process DEBUN last (lowest priority)
    debun_detection_list = url_data.get('DEBUN', {}).get('detection', [])
    debun_detection_list = debun_detection_list[0] if len(debun_detection_list) else []

    for detected_lib in debun_detection_list:
        libname = detected_lib['libname']
        version = detected_lib['version']
        location = 'window'

        # Skip if already detected by PTV or PTV-Original
        if (libname, version, location) in seen_lib_version_pairs:
            continue

        if libname not in mod_lib_mapping:
            mod_lib_mapping[libname] = []

        mod_lib_mapping[libname].append({
            'mod': False,
            'location': libname,
            'version': version,
            'accurate': detected_lib.get('accurate', True)  # Default to True if not present
        })

        seen_lib_version_pairs.add((libname, version))

    return mod_lib_mapping

    