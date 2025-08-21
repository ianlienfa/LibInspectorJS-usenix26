### Induce dependencies for libraries

from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support.expected_conditions import text_to_be_present_in_element
import json
import os
import sys
import ultraimport
from concurrent.futures import ProcessPoolExecutor, as_completed
import random
logger = ultraimport('__dir__/../utils/logger.py').getLogger()

service = Service(executable_path="./bin/chromedriver")
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=chrome_options)

DEPS = ['jquery/2.2.4/jquery.min.js', 'jquery/3.7.1/jquery.min.js', 'core-js/3.35.1/minified.js', 'underscore.js/1.13.6/underscore-min.js']
CDN_PREFIX = 'https://cdnjs.cloudflare.com/ajax/libs/'
PORT_BASE_MIN = 6548
PORT_BASE_MAX = 6568


def updateOne(libname, file_index, file_list, port):
    version = file_list[file_index]['version']
    # print(version)

    if 'success' in file_list[file_index] and file_list[file_index]['success'] == True:
        return True

    # Random port selection between 6548-6552 for parallel testing    
    driver.get(f"http://127.0.0.1:{port}/test/{libname}/{file_index}")

    try:
        WebDriverWait(driver, timeout=10).until(text_to_be_present_in_element((By.ID, "js-load"), 'All libraries are loaded!'))
    except KeyboardInterrupt:
        pass
    except: 
        logger.error('Web page error.')
        file_list[file_index]['success'] = False
        return True     # Continue iterating subsequent versions

    error_div = driver.find_element(By.ID, 'js-errors')
    if not error_div.text:
        file_list[file_index]['success'] = True
        logger.custom('NO DEP NEEDED', '')
        return True
    
    
    
    for dep in DEPS:
        driver.get(f"http://127.0.0.1:{port}/test/{libname}/{file_index}?dep1={dep}")
        try:
            WebDriverWait(driver, timeout=10).until(text_to_be_present_in_element((By.ID, "js-load"), 'All libraries are loaded!'))
        except KeyboardInterrupt:
            pass
        except: 
            logger.error('Web page error.')
            file_list[file_index]['success'] = False
            return True     # Continue iterating subsequent versions
        error_div = driver.find_element(By.ID, 'js-errors')
        if not error_div.text:
            logger.custom('DEP FOUND', f'{libname}: {version} - {dep}')
            file_list[file_index]['out_deps'].append(f'{CDN_PREFIX}{dep}')  # Add dep to the file
            file_list[file_index]['success'] = True
            return True

    file_list[file_index]['success'] = False 
    logger.warning(f'  [Dep Not Found] {libname}: {version}')
    return False
        
    


def updateLibrary(libname, port, start_id=0):
    if not f'{libname}.json' in os.listdir('static/libs_data'):
        logger.error(f'library {libname} has no record in the static/libs_data directory.')
        return
    

    with open(f'static/libs_data/{libname}.json', 'r') as openfile:
        file_list = json.load(openfile)
    
    start = False
    for file_index in file_list:
        if int(file_index) >= start_id:
            start = True
        if not start:
            continue

        res = updateOne(libname, file_index, file_list, port)
        # if not res:
        #     # Don't continue if dep induce failed
        #     break
    
    with open(f'static/libs_data/{libname}.json', "w") as outfile:
        outfile.write(json.dumps(file_list))

def byFolderOrder(elem):
    return elem.lower()

def updateAll(startlib="", num_processes=1):
    # Iterate through all libraries with information under the static/libs_data folder
    libfiles_list = os.listdir('static/libs_data')
    libfiles_list.sort(key=byFolderOrder)

    # Filter libraries based on startlib parameter
    libraries_to_process = []
    start = True
    if startlib:
        start = False
    
    for fname in libfiles_list:
        libname = fname[:-5]
        if startlib and libname == startlib:
            start = True
        if not start:
            continue
        libraries_to_process.append(libname)

    if num_processes == 1:
        # Sequential processing (original behavior)
        cnt = 0
        for libname in libraries_to_process:
            logger.debug(f'Start examing {cnt}: {libname}')
            updateLibrary(libname)
            cnt += 1
    else:
        # Parallel processing with dynamic job submission
        logger.debug(f'Processing {len(libraries_to_process)} libraries with {num_processes} processes')
        with ProcessPoolExecutor(max_workers=num_processes) as executor:
            future_to_lib = {}
            lib_iterator = iter(enumerate(libraries_to_process))
            
            # Submit initial batch of jobs
            for _ in range(min(num_processes, len(libraries_to_process))):
                try:
                    i, libname = next(lib_iterator)
                    port = ((i) % (PORT_BASE_MAX-PORT_BASE_MIN-1))+PORT_BASE_MIN
                    future = executor.submit(updateLibrary, libname, port)
                    future_to_lib[future] = (i, libname)
                except StopIteration:
                    break
            
            # Process completed jobs and submit new ones
            while future_to_lib:
                for future in as_completed(future_to_lib):
                    i, libname = future_to_lib.pop(future)
                    try:
                        future.result()
                        logger.debug(f'Completed processing {i}: {libname}')
                    except Exception as exc:
                        logger.error(f'Library {i}: {libname} generated an exception: {exc}')
                    
                    # Submit next job if available
                    try:
                        next_i, next_libname = next(lib_iterator)
                        next_port = ((next_i) % (PORT_BASE_MAX-PORT_BASE_MIN-1))+PORT_BASE_MIN
                        next_future = executor.submit(updateLibrary, next_libname, next_port)
                        future_to_lib[next_future] = (next_i, next_libname)
                    except StopIteration:
                        pass
                    break

if __name__ == '__main__':
    # Usage: > python3 2.9_induce_deps.py <lib name> [num_processes]
    # or: > python3 2.9_induce_deps.py --parallel <num_processes> [startlib]
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--parallel':
            # Parallel mode: --parallel <num_processes> [startlib]
            if len(sys.argv) < 3:
                print("Usage: python3 2.9_induce_deps.py --parallel <num_processes> [startlib]")
                sys.exit(1)
            
            num_processes = int(sys.argv[2])
            startlib = sys.argv[3] if len(sys.argv) > 3 else "mux.js" # here
            updateAll(startlib, num_processes)
        elif sys.argv[1].isdigit():
            # Old format with number of processes: <lib name> [num_processes]
            updateLibrary(sys.argv[1])
        else:
            # Single library mode
            updateLibrary(sys.argv[1])
    else:
        # Default sequential processing
        updateAll()
    
    driver.close()
    logger.close()




