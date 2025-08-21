### Generate credit object trees

import json
import pandas as pd
import os
import sys
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support.expected_conditions import text_to_be_present_in_element
from TreeCredit import CreditCalculator
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed
import ultraimport
logger = ultraimport('__dir__/../utils/logger.py').getLogger()
conn = ultraimport('__dir__/../utils/sqlHelper.py').ConnDatabase('1000-pTs')

LOG_FOLDER = 'log/gen_pTs'
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)
    logger.info(f"Folder '{LOG_FOLDER}' created successfully.")

service = Service(executable_path="/Users/ian/Downloads/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/chromedriver")
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--enable-logging")
chrome_options.add_argument("--log-level=0")
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
driver = webdriver.Chrome(options=chrome_options)

MAX_DEPTH = 4
MAX_NODE = 1000

TRIM_DEPTH = MAX_DEPTH                                                                          
TRIM_NODE = MAX_NODE

LAST_LIB_NAME = "tabler-icons"
LAST_LIB_VISITED = False
RUN_NUM = 10

BLACK_LIST = []     # Blacklist vertex name in the pTree

APP_PORT_MIN = 6548
APP_PORT_MAX = 6558

def generatePT(file_index, route, driver_instance=None, port=6548):
    if driver_instance is None:
        driver_instance = driver
    
    try:
        driver_instance.get(f"http://127.0.0.1:{port}/{route}/{file_index}")
    except Exception as e:
        logger.error(f'{file_index} >> Failed to load URL: {str(e)}')
        return None, 0, 0, '', True

    try:
        WebDriverWait(driver_instance, timeout=10).until(text_to_be_present_in_element((By.ID, "js-load"), 'All libraries are loaded!'))
    except Exception as e:
        logger.error(f'{file_index} >> Timeout waiting for libraries to load: {str(e)}')
        return None, 0, 0, '', True

    error_div = driver_instance.find_element(By.ID, 'js-errors')
    if error_div.text:
        # Failed to load the library - get more detailed error information
        try:
            # Try to get more detailed error from console logs
            console_logs = driver_instance.get_log('browser')
            detailed_errors = []
            for log_entry in console_logs:
                if log_entry['level'] in ['SEVERE', 'WARNING']:
                    detailed_errors.append(f"{log_entry['level']}: {log_entry['message']}")
            
            if detailed_errors:
                error_details = "; ".join(detailed_errors)
                logger.error(f'{file_index} >> {error_div.text} | Console: {error_details}')
            else:
                logger.error(f'{file_index} >> {error_div.text} | No additional console errors found')
        except Exception as e:
            logger.error(f'{file_index} >> {error_div.text} | Failed to get console logs: {str(e)}')
        
        return None, 0, 0, '', True
        

    try:
        driver_instance.execute_script(f'createObjectTree({MAX_DEPTH}, {MAX_NODE}, true);')
    except Exception as e:
        logger.error(f'{file_index} >> Failed to execute createObjectTree script: {str(e)}')
        return None, 0, 0, '', True

    try:
        WebDriverWait(driver_instance, timeout=50).until(text_to_be_present_in_element((By.ID, "obj-tree"), '{'))
    except Exception as e:
        logger.error(f'{file_index} >> Timeout waiting for object tree generation: {str(e)}')
        return None, 0, 0, '', True
        
    try:
        version = driver_instance.find_element(By.ID, 'version').text
        tree_json = driver_instance.find_element(By.ID, 'obj-tree').text
        tree = json.loads(tree_json)
        circle_num = int(driver_instance.find_element(By.ID, 'circle-num').text)
        size = int(driver_instance.find_element(By.ID, 'tree-size').text)
    except json.JSONDecodeError as e:
        logger.error(f'{file_index} >> Failed to parse JSON tree: {str(e)} | Tree content: {tree_json[:200]}...')
        return None, 0, 0, '', True
    except Exception as e:
        logger.error(f'{file_index} >> Failed to extract tree data from page: {str(e)}')
        return None, 0, 0, '', True
    # depth = int(driver_instance.find_element(By.ID, 'tree-depth').text)

    # Remove Global Varabile in Blacklist
    del_index = []
    for i in range(len(tree['children'])):
        if tree['children'][i]['name'] in BLACK_LIST:
            del_index.append(i)
    offset = 0
    for index in del_index:
        del tree['children'][index - offset]
        offset += 1


    return tree, size, circle_num, version, False


def treeDiff(tree1, tree2):
    # Return tree2 - tree1
    if tree1 == None or tree2 == None:
        return None
    
    diff_tree = {'name': 'window', 'dict': {}, 'children': []}
    q1 = []
    q2 = []
    q3 = []
    q1.append(tree1)
    q2.append(tree2)
    q3.append([])

    while len(q2): 
        node1 = q1.pop(0)
        node2 = q2.pop(0)
        path = q3.pop(0)

        for child_node2 in node2['children']:
            find_same_child = False

            for child_node1 in node1['children']:
                if child_node1['name'] == child_node2['name']:
                    find_same_child = True
                    q1.append(child_node1)
                    q2.append(child_node2)
                    q3.append(path[:])
                    q3[len(q3) - 1].append(child_node1['name'])
                    break

            if not find_same_child:
                child_node2['path'] = path[:]
                diff_tree['children'].append(child_node2)
    
    return diff_tree

def SameDict(d1, d2):
    for k, v in d1.items():
        if not k in d2:
            return False
        if d2[k] != v:
            return False
    return True

def elimRandom(tree1, tree2):
    # Eliminate random nodes - remove nodes that different in two trees.
    if tree1 == None or tree2 == None:
        return None
    ret_tree = {'name': 'window', 'dict': {}, 'children': []}
    elim_num = 0
    
    q1 = []
    q2 = []
    q3 = []
    q1.append(tree1)
    q2.append(tree2)
    q3.append(ret_tree)

    while len(q3): 
        node1 = q1.pop(0)
        node2 = q2.pop(0)
        node3 = q3.pop(0)

        for child_node1 in node1['children']:
            find_same = False
            for child_node2 in node2['children']:
                if child_node1['name'] == child_node2['name'] and SameDict(child_node1['dict'], child_node2['dict']):
                    # Identical nodes
                    find_same = True
                    q1.append(child_node1)
                    q2.append(child_node2)
                    new_node = {'name': child_node2['name'], 'dict': child_node1['dict'], 'children': []}
                    node3['children'].append(new_node)
                    q3.append(new_node)
                    break

            if not find_same:
                elim_num += 1
    
    return ret_tree, elim_num

def limitGlobalV(tree, vlist):
    ret_tree = {'name': 'window', 'dict': {}, 'children': []}
    for child in tree['children']:
        if child['name'] in vlist:
            ret_tree['children'].append(child)
    return ret_tree
    


def updateOne(libname, file_index, limit_globalV=[], driver_instance=None, conn_instance=None, port=6548):
    if driver_instance is None:
        driver_instance = driver
    if conn_instance is None:
        conn_instance = conn
    
    pt1, size1, circle_num1, version, fail1 = generatePT(file_index, f'deps/{libname}', driver_instance, port)
    pt2, size2, circle_num2, _, fail2 = generatePT(file_index, f'test/{libname}', driver_instance, port)
    pt3, size3, circle_num3, _, fail3 = generatePT(file_index, f'test/{libname}', driver_instance, port)
    if fail1 or fail2 or fail3:
        return ['N', 'Library loading error.']

    if pt1 and pt2 and pt3:
        pt_stable, random_num = elimRandom(pt2, pt3)
        if limit_globalV != None and len(limit_globalV) > 0:
            pt_stable = limitGlobalV(pt_stable, limit_globalV)
        pt = treeDiff(pt1, pt_stable)

        # Trim the pTree
        CC = CreditCalculator(TRIM_DEPTH, TRIM_NODE, MAX_DEPTH)
        size, depth = CC.algorithm1(pt)
        pt = CC.expand(pt)
        CC.minifyTreeSpace(pt)

        # Add pt to SepTreeTABLE dataTABLE
        globalV = []
        for subtree in pt['c']:
            globalV.append(subtree['n'])
        

        # Create table if not exist
        SEP_TREE_TABLE = f'{libname}_version'
        conn_instance.create_if_not_exist(SEP_TREE_TABLE, '''
            `pTree` json DEFAULT NULL,
            `globalV_num` int DEFAULT NULL,
            `globalV` json DEFAULT NULL,
            `size` int DEFAULT NULL,
            `circle_num` int DEFAULT NULL,
            `depth` int DEFAULT NULL,
            `file_id` bigint unsigned NOT NULL,
            `random_num` int DEFAULT NULL,
            `version` varchar(100) DEFAULT NULL,
            UNIQUE KEY `id` (`file_id`)
        ''')

        # If entry already exists, delete first
        res = conn_instance.fetchone(f"SELECT size FROM `{SEP_TREE_TABLE}` WHERE file_id = '{file_index}';")
        if res:  
            conn_instance.execute(f"DELETE FROM `{SEP_TREE_TABLE}` WHERE file_id = '{file_index}';")

        # Create new entry in SEP_TREE_TABLE
        conn_instance.insert(SEP_TREE_TABLE\
            , ('pTree', 'size', 'depth', 'globalV', 'globalV_num', 'circle_num', 'file_id', 'random_num', 'version') \
            , (json.dumps(pt), size, depth, json.dumps(globalV), len(globalV), circle_num2 - circle_num1, int(file_index), random_num, str(version)))

        logger.info(f'    {file_index} entry added to `{SEP_TREE_TABLE}`.')
        return ['Y', '']
    

def _worker_updateOne(args):
    """Worker function for parallel processing - creates thread-safe instances"""
    libname, file_index, limit_globalV, port = args
    
    # Create thread-safe instances
    worker_options = webdriver.ChromeOptions()
    worker_options.add_argument("--headless")
    worker_options.add_argument("--disable-dev-shm-usage")
    worker_options.add_argument("--enable-logging")
    worker_options.add_argument("--log-level=0")
    worker_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    worker_driver = webdriver.Chrome(options=worker_options)
    worker_conn = ultraimport('__dir__/../utils/sqlHelper.py').ConnDatabase('1000-pTs')
    
    try:
        result = updateOne(libname, file_index, limit_globalV, worker_driver, worker_conn, port)
        return result
    finally:
        worker_driver.quit()
        worker_conn.close()

def updateLibraryParallel(libname, start_id = 0, max_workers = 4):
    """Parallel version of updateLibrary"""
    if not f'{libname}.json' in os.listdir('static/libs_data'):
        logger.warning(f'library {libname} has no record in the static/libs_data directory.')
        return

    with open(f'static/libs_data/{libname}.json', 'r') as openfile:
        file_list = json.load(openfile)
    
    # Prepare worker arguments
    worker_args = []
    start = False
    for file_index in file_list:
        if int(file_index) >= start_id:
            start = True
        if not start:
            continue
        # Calculate port for this worker using modulo arithmetic
        port = ((int(file_index)) % (APP_PORT_MAX - APP_PORT_MIN + 1)) + APP_PORT_MIN
        worker_args.append((libname, file_index, [], port))
    
    log = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        try:
            futures = {executor.submit(_worker_updateOne, args): args for args in worker_args}
            for future in as_completed(futures, timeout=None):
                try:
                    libname, file_index, _, port = futures[future]
                    version = file_list[file_index]['version']
                    logger.info(f'  {file_index} {libname} {version}')
                    
                    res = future.result(timeout=300)
                    log.append([version] + res)
                except TimeoutError:
                    logger.error(f"updateLibraryParallel {libname} {file_index} timed out!")
                    log.append([version, 'N', 'Timeout error.'])
                    # Cancel the timed-out future to prevent resource leaks
                    future.cancel()
                except Exception as error:
                    logger.error(f"Error processing {file_index}: {error}")
                    log.append([version, 'N', 'Unknown fault.'])
        except KeyboardInterrupt:
            logger.info("Parallel processing interrupted by user - canceling remaining tasks")
            # Force shutdown all remaining futures
            for future in futures:
                future.cancel()
            executor.shutdown(wait=False, cancel_futures=True)
    
    df = pd.DataFrame(log, columns =['Version', 'Success', 'Description']) 
    df.to_csv(f'log/gen_pTs/{libname}.csv', index=True)

def updateLibrary(libname, start_id = 0):
    if not f'{libname}.json' in os.listdir('static/libs_data'):
        logger.warning(f'library {libname} has no record in the static/libs_data directory.')
        return

    with open(f'static/libs_data/{libname}.json', 'r') as openfile:
        file_list = json.load(openfile)
    

    log = []    # Store log information during the process
    start = False
    for file_index in file_list:
        if int(file_index) >= start_id:
            start = True
        if not start:
            continue

        version = file_list[file_index]['version']

        logger.info(f'  {file_index} {libname} {version}')

        # Calculate port for sequential processing
        port = ((int(file_index)) % (APP_PORT_MAX - APP_PORT_MIN + 1)) + APP_PORT_MIN
        
        with ThreadPoolExecutor(max_workers=1) as executor:
            try:
                future = executor.submit(updateOne, libname, file_index, [], None, None, port)
                res = future.result(timeout=300)
                log.append([version] + res)
            except KeyboardInterrupt:
                pass
            except TimeoutError:
                print(f"updateLibrary {libname} timed out!")
            except Exception as error:
                # handle the exception
                logger.error(error)
                log.append([version, 'N', 'Unknown fault.'])
        
    df = pd.DataFrame(log, columns =['Version', 'Success', 'Description']) 
    df.to_csv(f'log/gen_pTs/{libname}.csv', index=True)


def updateAll(st = 0):
    global LAST_LIB_VISITED
    global LAST_LIB_NAME
    # Iterate through all libraries with information under the static/libs_data folder
    libfiles_list = os.listdir('static/libs_data')

    # Remove library already appeared in the old directory
    # try:
    #     old_libfiles_list = os.listdir('static/old_libs_data')
    #     libfiles_list = [item for item in libfiles_list if item not in set(old_libfiles_list)]
    # except FileNotFoundError:
    #     logger.info("No old libraries directory found, processing all libraries.")
    # except Exception as e:
    #     logger.error(f"Error checking old libraries: {str(e)}")
    #     # Continue with all libraries if there's an error
    
    libfiles_list.sort()

    # Remove history log files under the log/gen_pTs folder
    log_files = os.listdir('log/gen_pTs')
    for f in log_files:
        os.remove(f'log/gen_pTs/{f}')

    try:
        for i, fname in enumerate(libfiles_list):
            libname = fname[:-5]
            if libname == LAST_LIB_NAME:
                LAST_LIB_VISITED = True
                continue            
            if LAST_LIB_VISITED:
                logger.info(f"updating {fname} - {i}/{len(libfiles_list)}")
                updateLibraryParallel(libname)            
    except KeyboardInterrupt:
        logger.info("Processing interrupted by user")

if __name__ == '__main__':
    # Usage: > python3 exp/gen_pTs.py <lib name>
    
    try:
        if len(sys.argv) > 5 :
            # python3 exp/3_gen_pTs.py --st 4 -p 6547 -l leapjs
            if sys.argv[5] == '-l':
                LAST_LIB_VISITED = False
                LAST_LIB_NAME = sys.argv[6]
        if len(sys.argv) > 3:
            if sys.argv[3] == '-p':
                APP_PORT_MIN = int(sys.argv[4])
                APP_PORT_MAX = APP_PORT_MIN  # Single port mode for backward compatibility
            if sys.argv[1] == '--st':
                updateAll(int(sys.argv[2]))
        elif len(sys.argv) > 1:
            updateLibrary(sys.argv[1])
        else:
            updateAll()
    except KeyboardInterrupt:
        logger.info("Script interrupted by user")
    finally:
        driver.close()
        conn.close()




