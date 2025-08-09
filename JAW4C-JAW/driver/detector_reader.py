
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

def read_result_with_url(url):
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_storage_directory = os.path.join(BASE_DIR, 'data')
    detection_res_path = os.path.join(data_storage_directory, get_name_from_url(url), 'lib.detection.json')
    with open(detection_res_path, 'r') as f:
        obj = json.load(f)
        return obj