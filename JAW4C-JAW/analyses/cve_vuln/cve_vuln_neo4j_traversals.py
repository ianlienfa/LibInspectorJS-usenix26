# -*- coding: utf-8 -*-

"""
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
	Detecting Client-side CVE vulnerabilities
	

	Usage:
	------------
	> import analyses.cve_vuln.cve_vuln_neo4j_traversals as CVETraversalsModule

"""


import os
import sys
import time
import uuid
import signal
import constants as constantsModule
import utils.io as IOModule
import docker.neo4j.manage_container as dockerModule
import utils.utility as utilityModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
import analyses.cve_vuln.cve_vuln_cypher_queries as CVETraversalsModule
from utils.logging import logger
import traceback



def get_url_for_webpage(webpage_directory):
	content = None
	fd = open(os.path.join(webpage_directory, "url.out"), "r")
	content = fd.read()
	fd.close()
	return content

# Import get_name_from_url from utils (defined in utils/utility.py)
from utils.utility import get_name_from_url


# def docker_build_hpg(seed_url):
# 	webapp_folder_name = get_name_from_url(seed_url)
# 	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
# 	if not os.path.exists(webapp_data_directory):
# 		logger.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))

# 	webapp_pages = os.listdir(webapp_data_directory)
# 	# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
# 	webapp_pages = [item for item in webapp_pages if len(item) == 64]

# 	# must use the default docker container db name which is the only active db in docker
# 	database_name = 'neo4j'  
# 	graphid = uuid.uuid4().hex
# 	container_name = 'neo4j_container_' + graphid

# 	for each_webpage in webapp_pages:
# 		logger.debug(f'Working on {each_webpage}')
# 		relative_import_path = os.path.join(webapp_folder_name, each_webpage)
# 		container_name = container_name + each_webpage
# 		webpage = os.path.join(webapp_data_directory, each_webpage)
# 		logger.warning('HPG for: %s'%(webpage))

# 		# de-compress the hpg 
# 		IOModule.decompress_graph(webpage, node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz", edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz")

# 		# import
# 		if build_container:
# 			nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
# 			rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
# 			if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
# 				logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
# 				continue

# 			dockerModule.create_neo4j_container(container_name)
# 			logger.info('waiting 5 seconds for the neo4j container to be ready.')
# 			time.sleep(5)

# 			logger.info(f'importing data inside container, container_name: {container_name}, database_name: {database_name}, relative_import_path: {relative_import_path}')		
# 			dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
# 			logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
# 			connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
# 			if not connection_success:
# 				sys.exit(1)		

# 		# compress the hpg after the model import
# 		IOModule.compress_graph(webpage)

def neo4j_wait(try_attempt=3):
	for _ in range(try_attempt):
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
		if connection_success:
			break
		else:
			logger.info('waiting failed, retrying ...')
			time.sleep(5)				


def build_hpg(container_name, webpage):
	"""	
	@param {string} seed_url
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.
	
	"""
	database_name = 'neo4j'  
	graphid = uuid.uuid4().hex	
	webapp_folder_name = os.path.basename(webpage)
	weburl_suffix = os.path.join(os.path.basename(os.path.dirname(webpage)), webapp_folder_name)
	relative_import_path = webapp_folder_name
	container_name = 'neo4j_container_' + graphid + webapp_folder_name

	try:
		logger.info('HPG for: %s'%(webpage))

		# de-compress the hpg 
		IOModule.decompress_graph(webpage, node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz", edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz")

		# import
		nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
		rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
		if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
			logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')			
			raise RuntimeError("The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...")
		
		dockerModule.create_neo4j_container(container_name, weburl_suffix, webapp_folder_name)
		logger.info('waiting 5 seconds for the neo4j container to be ready.')
		time.sleep(5)

		logger.info(f'importing data inside container, container_name: {container_name}, database_name: {database_name}, relative_import_path: {relative_import_path}')		
		
		dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')

		# Wait for the data to be stable
		neo4j_wait()

		# compress the hpg after the model import
		IOModule.compress_graph(webpage)

		#### To avoid the neo4j admin <-> neo4j user racing for the same lock, recreate the whole stuff on the same volume
		dockerModule.stop_neo4j_container(container_name, cleanup=False)
		dockerModule.restart_neo4j_container(container_name)
		# dockerModule.remove_neo4j_container(container_name)
		# dockerModule.create_neo4j_container(container_name, weburl_suffix, webapp_folder_name)
		####

		# Wait for the data to be stable
		neo4j_wait()
			
	except Exception as e:
		print(f"[build_hpg] Error found during execution {e}")
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		IOModule.compress_graph(webpage)
		raise RuntimeError

	return container_name


def analyze_hpg(seed_url, container_name, vuln_list, container_transaction_timeout=300):
	"""
	@param {string} seed_url
	@param {int} container_transaction_timeout: timeout in seconds for each transaction (default: 300)
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.

	"""
	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		logger.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))

	webapp_pages = os.listdir(webapp_data_directory)
	# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
	webapp_pages = [item for item in webapp_pages if len(item) == 64]

	# setting index to increase performance
	logger.info(f"Creating indexes...")
	create_neo4j_indexes_out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.create_neo4j_indexes, conn_timeout=50)						
	logger.info(f"Index creation out: {create_neo4j_indexes_out}")
	# breakpoint()

	try:
		for each_webpage in webapp_pages:
			logger.debug(f'Analysis on {each_webpage}')			
			webpage = os.path.join(webapp_data_directory, each_webpage)
			logger.warning('HPG for: %s'%(webpage))

			connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
			if not connection_success:
				raise RuntimeError("connection failure on making query")
			navigation_url = get_url_for_webpage(webpage)
			for entry_idx, entry in enumerate(vuln_list):
				try:
					location, vuln, mod, libname = entry['location'], entry['vuln'], entry['mod'], entry['libname']					
					poc_set = set()
					for i, v in enumerate(vuln):
						if v['poc'] in poc_set:
							logger.info(f'Skipping duplicate poc: {v["poc"]}')
							continue
						poc_set.add(v['poc'])
						if 'LIBOBJ' not in v['poc']:
							logger.info(f'Skipping {v['poc']} due to unsupported form: no LIBOBJ')
							continue
						if not v['grep_found']:
							logger.info(f'Skipping {v['poc']} due to grep found not finding poc fragments')
							continue
						vuln_info = {"mod": mod, "libname": libname, "location": location, "poc_str": v['poc']}

						# Set up timeout
						def timeout_handler(signum, frame):
							raise TimeoutError(f"Query execution exceeded {container_transaction_timeout} second timeout for {vuln_info}")

						signal.signal(signal.SIGALRM, timeout_handler)
						signal.alarm(container_transaction_timeout * 2)  # Set alarm to 2x conn_timeout

						try:
							logger.info("=======================================================================================================")
							logger.info(f"[{entry_idx+1}/{len(vuln_list)}]-[{i+1}/{len(vuln)}] Starting tainting-based sink detection\n vuln_info:", vuln_info)
							logger.info(f"{vuln_info}")
							logger.info("=======================================================================================================")
							out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals, vuln_info, navigation_url, webpage, each_webpage, conn_timeout=container_transaction_timeout)
						finally:
							signal.alarm(0)  # Cancel the alarm

						# breakpoint()
						logger.info(f"analysis out: {out}")
				except Exception as e:
					logger.error(traceback.format_exc())
					raise RuntimeError(f"Error executing query, {e}")
					
	except Exception as e:
		print(f"[analyze_hpg] Error found during execution {e}")
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		raise RuntimeError(e)

	return container_name





def build_and_analyze_hpg(seed_url, vuln_info, config={'build': True, 'query': True, 'stop': True}):

	"""	
	@param {string} seed_url
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.
	
	"""
	try:
		webapp_folder_name = get_name_from_url(seed_url)
		webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
		if not os.path.exists(webapp_data_directory):
			logger.error("[Traversals] did not found the directory for HPG build: "+str(webapp_data_directory))

		webapp_pages = os.listdir(webapp_data_directory)
		# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
		webapp_pages = [item for item in webapp_pages if len(item) == 64]


		# neo4j config
		build_container = config['build'] if 'build' in config else True
		stop_container = config['stop'] if 'stop' in config else True
		query = config['query'] if 'query' in config else True

		# must use the default docker container db name which is the only active db in docker
		database_name = 'neo4j'  
		graphid = uuid.uuid4().hex
		container_name = 'neo4j_container_' + graphid



		for each_webpage in webapp_pages:
			logger.debug(f'Working on {each_webpage}')
			relative_import_path = os.path.join(webapp_folder_name, each_webpage)
			container_name = container_name + each_webpage
			webpage = os.path.join(webapp_data_directory, each_webpage)
			logger.warning('HPG for: %s'%(webpage))

			# de-compress the hpg 
			IOModule.decompress_graph(webpage, node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz", edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz")

			# import
			if build_container:
				nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
				rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
				if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
					logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
					continue

				dockerModule.create_neo4j_container(container_name, webapp_folder_name)
				logger.info('waiting 5 seconds for the neo4j container to be ready.')
				time.sleep(5)

				logger.info(f'importing data inside container, container_name: {container_name}, database_name: {database_name}, relative_import_path: {relative_import_path}')		
				dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
				
				#### To avoid the neo4j admin <-> neo4j user racing for the same lock, recreate the whole stuff on the same volume
				dockerModule.stop_neo4j_container(container_name, cleanup=False)
				dockerModule.remove_neo4j_container(container_name)
				dockerModule.create_neo4j_container(container_name, webapp_folder_name)
				####

				logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')				
				connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
				if not connection_success:
					sys.exit(1)		

			# compress the hpg after the model import
			IOModule.compress_graph(webpage)

			# run the vulnerability detection queries
			if query:
				connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
				if not connection_success:
					sys.exit(1)
				navigation_url = get_url_for_webpage(webpage)
				out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals, vuln_info, navigation_url, webpage, each_webpage, conn_timeout=50)
				# out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals, vuln_info, navigation_url, webpage, each_webpage)
				logger.info(f"analysis out: {out}")
	except Exception as e:
		print(f"Error found during execution {e}")
		if stop_container:			
			dockerModule.stop_neo4j_container(container_name)
			dockerModule.remove_neo4j_container(container_name)
			dockerModule.remove_neo4j_database(database_name, container_name)
		raise RuntimeError

	# stop the neo4j docker container
	if stop_container:
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		dockerModule.remove_neo4j_database(database_name, container_name)

	return container_name



























