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
from contextlib import nullcontext
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
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150, conn=constantsModule.NEO4J_CONN_HTTP_STRING)
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
		nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
		rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)

		# de-compress the hpg
		if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
			IOModule.decompress_graph(webpage, node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz", edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz")

		# import
		# breakpoint()
		if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
			logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
			raise RuntimeError("The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...")

		# Create container and import data in a single docker run command
		logger.info(f'Creating container and importing data: container_name: {container_name}, database_name: {database_name}')
		dockerModule.create_and_import_neo4j_container(container_name, weburl_suffix, webapp_folder_name, database_name)

		# After import completes, the container stops (it ran a one-off command)
		# Now start it in normal mode for querying
		logger.info(f'Starting Neo4j container in normal mode for querying')
		dockerModule.create_neo4j_container(container_name, weburl_suffix, webapp_folder_name)

		# Wait for the data to be stable
		neo4j_wait()

		# compress the hpg after the model import
		logger.info('Compressing HPG after import...')
		IOModule.compress_graph(webpage)

		

	except Exception as e:
		logger.error(f"[build_hpg] Error found during execution {str(e)}")
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		IOModule.compress_graph(webpage)
		raise RuntimeError(f"HPG build failed due to timeout") from e

	return container_name


def analyze_hpg(seed_url, container_name, vuln_list, container_transaction_timeout=300, code_matching_cutoff=100, call_count_limit=30, timeout_manager=None):
	"""
	@param {string} seed_url
	@param {int} container_transaction_timeout: timeout in seconds for each transaction (default: 300)
	@param {int} code_matching_cutoff: maximum number of matching nodes to process per code pattern (default: 100)
	@param {int} call_count_limit: maximum recursion depth for taint propagation (default: 30)
	@param {TimeoutManager} timeout_manager: optional timeout manager for per-POC timeouts (default: None)
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.

	"""
	def get_jq_locations(vuln_list):
		jq_locs = set()
		for entry in vuln_list:
			if entry['libname'].lower() == 'jquery':
				jq_locs.add(entry['location'])
		return jq_locs

	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		logger.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))

	webapp_pages = os.listdir(webapp_data_directory)
	# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
	webapp_pages = [item for item in webapp_pages if len(item) == 64]

	# setting index to increase performance
	logger.info(f"Creating indexes...")
	create_neo4j_indexes_out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.create_neo4j_indexes, conn=constantsModule.NEO4J_CONN_STRING, conn_timeout=50)						
	logger.info(f"Index creation out: {create_neo4j_indexes_out}")
	# breakpoint()

	try:
		for each_webpage in webapp_pages:
			logger.debug(f'Analysis on {each_webpage}')			
			webpage = os.path.join(webapp_data_directory, each_webpage)
			logger.warning('HPG for: %s'%(webpage))

			connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150, conn=constantsModule.NEO4J_CONN_HTTP_STRING)
			if not connection_success:
				raise RuntimeError("connection failure on making query")
			navigation_url = get_url_for_webpage(webpage)

			# Graph based shared information initialization
			call_sites_cache = {}  # stores a map: funcDef id -> list of call expression nodes
			call_values_cache = {}  # stores a map: funcDef id -> get_function_call_values_of_function_definitions(funcDef)
			nodeid_to_matches = {}  # stores a map: nodeid -> set of matched poc strings
			processed_pattern = set()			

			# LIBJQ support, find vulnerabilities with LIBJQ patterns and replace them with jQuery locations if any
			# example layout of vuln_list:
			"""
			[
				{
					"mod": "False",
					"libname": "jquery",
					"location": "$",
					"version": "3.4.0",
					"vuln": [
						{
							"poc": "LIBOBJ(WILDCARD).html(PAYLOAD)",
							"gadget": "False",
							"payload": "<img src=x onerror=alert(1)>",
							"exported": "True",
							"arguments": "",
							"exploited": "True",
							"sink_type": "javascript",
							"validated": "True",
							"payload_type": "string",
							"arguments_type": "",
							"additional_info": {},
							"confidence_score": 0.8,
							"vulnerability_type": "xss",
							"grep_found": "True"
						},
						{
							"poc": "LIBOBJ(WILDCARD).html(PAYLOAD)",
							"gadget": "False",
							"payload": "<style><style /><img src=x onerror=alert(1)>",
							"exported": "True",
							"arguments": "",
							"exploited": "True",
							"sink_type": "javascript",
							"validated": "True",
							"payload_type": "string",
							"arguments_type": "",
							"additional_info": {},
							"confidence_score": "0.8",
							"vulnerability_type": "xss",
							"grep_found": "True"
						}
					]
				},
			]			
			"""
			jq_locs = get_jq_locations(vuln_list) # get the locations of jQuery usage			
			for vuln in vuln_list:
				new_vuln_entries = []
				has_libjq = False
				for v in vuln['vuln']:					
					if 'LIBJQ' in v['poc']:	
						has_libjq = True					
						logger.info(f'Expanding LIBJQ poc into multiple LIBOBJ poc entries for {v["poc"]}')						
						if jq_locs and len(jq_locs) > 0:
							logger.info(f'Found {len(jq_locs)} jQuery locations for {v["poc"]}: {jq_locs}')
							# create new vuln entries for each jq_location
							for jq_loc in jq_locs:
								new_v = v.copy()
								new_v['poc'] = new_v['poc'].replace('LIBJQ', jq_loc)	
								new_v['jq'] = True							
								new_vuln_entries.append(new_v)														
					else:
						new_vuln_entries.append(v)
				vuln['vuln'] = new_vuln_entries if has_libjq else vuln['vuln']
					

			for entry_idx, entry in enumerate(vuln_list):
				try:
					location, vuln, mod, libname = entry['location'], entry['vuln'], entry['mod'], entry['libname']					
					poc_set = set()
					for i, v in enumerate(vuln):
						if v['poc'] in poc_set:
							logger.info(f'Skipping duplicate poc: {v["poc"]}')
							continue
						poc_set.add(v['poc'])
						if 'LIBOBJ' not in v['poc'] and v['jq'] != True: # Typically we expect LIBOBJ in poc strings, but for LIBJQ expanded entries we may not have it
							logger.info(f'Skipping {v["poc"]} due to unsupported form: no LIBOBJ')							
							continue
						if not v['grep_found']:
							logger.info(f'Skipping {v["poc"]} due to grep found not finding poc fragments')
							continue

						vuln_info = {"mod": mod, "libname": libname, "location": location, "poc_str": v['poc'], "jq": v.get('jq', False)}
									
						try:							
							logger.info("=======================================================================================================")
							logger.info(f"[{entry_idx+1}/{len(vuln_list)}]-[{i+1}/{len(vuln)}] Starting tainting-based sink detection\n vuln_info:", vuln_info)
							logger.info(f"{vuln_info}")
							logger.info("=======================================================================================================")
							# run_traversals(tx, vuln_info, navigation_url, webpage_directory, nodeid_to_matches, processed_pattern, call_sites_cache, call_values_cache, folder_name_of_url='xxx', document_vars=[], code_matching_cutoff=100, call_count_limit=30):
							print(f"constantsModule.NEO4J_CONN_STRING: {constantsModule.NEO4J_CONN_STRING}")
							with timeout_manager.operation() if timeout_manager else nullcontext():
								out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals,
										vuln_info, navigation_url, webpage, nodeid_to_matches, processed_pattern, call_sites_cache, call_values_cache,
										code_matching_cutoff, call_count_limit,
										conn_timeout=container_transaction_timeout, conn=constantsModule.NEO4J_CONN_STRING)								
						except Exception as e:
							logger.error(traceback.format_exc())
							logger.error(f"Error executing query, {e}, moving to the next vulnerability...")							
							continue								   

						# breakpoint()
						logger.info(f"analysis out: {out}")
				except Exception as e:
					logger.error(traceback.format_exc())
					raise RuntimeError(f"Error executing query, {e}")
					
	except Exception as e:
		logger.error(f"[analyze_hpg] Error found during execution {e}")
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		raise RuntimeError(e)

	return container_name





# def build_and_analyze_hpg(seed_url, vuln_info, config={'build': True, 'query': True, 'stop': True}):

# 	"""	
# 	@param {string} seed_url
# 	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.
	
# 	"""
# 	try:
# 		webapp_folder_name = get_name_from_url(seed_url)
# 		webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
# 		if not os.path.exists(webapp_data_directory):
# 			logger.error("[Traversals] did not found the directory for HPG build: "+str(webapp_data_directory))

# 		webapp_pages = os.listdir(webapp_data_directory)
# 		# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
# 		webapp_pages = [item for item in webapp_pages if len(item) == 64]


# 		# neo4j config
# 		build_container = config['build'] if 'build' in config else True
# 		stop_container = config['stop'] if 'stop' in config else True
# 		query = config['query'] if 'query' in config else True

# 		# must use the default docker container db name which is the only active db in docker
# 		database_name = 'neo4j'  
# 		graphid = uuid.uuid4().hex
# 		container_name = 'neo4j_container_' + graphid



# 		for each_webpage in webapp_pages:
# 			logger.debug(f'Working on {each_webpage}')
# 			relative_import_path = os.path.join(webapp_folder_name, each_webpage)
# 			container_name = container_name + each_webpage
# 			webpage = os.path.join(webapp_data_directory, each_webpage)
# 			logger.warning('HPG for: %s'%(webpage))

# 			# de-compress the hpg 
# 			IOModule.decompress_graph(webpage, node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz", edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz")

# 			# import
# 			if build_container:
# 				nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
# 				rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
# 				if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
# 					logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
# 					continue

# 				dockerModule.create_neo4j_container(container_name, webapp_folder_name)
# 				logger.info('waiting 5 seconds for the neo4j container to be ready.')
# 				time.sleep(5)

# 				logger.info(f'importing data inside container, container_name: {container_name}, database_name: {database_name}, relative_import_path: {relative_import_path}')		
# 				dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
				
# 				#### To avoid the neo4j admin <-> neo4j user racing for the same lock, recreate the whole stuff on the same volume
# 				dockerModule.stop_neo4j_container(container_name, cleanup=False)
# 				dockerModule.remove_neo4j_container(container_name)
# 				dockerModule.create_neo4j_container(container_name, webapp_folder_name)
# 				####

# 				logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')				
# 				connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
# 				if not connection_success:
# 					sys.exit(1)		

# 			# compress the hpg after the model import
# 			IOModule.compress_graph(webpage)

# 			# run the vulnerability detection queries
# 			if query:
# 				connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
# 				if not connection_success:
# 					sys.exit(1)
# 				navigation_url = get_url_for_webpage(webpage)
# 				out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals, vuln_info, navigation_url, webpage, each_webpage, conn_timeout=50)
# 				# out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(CVETraversalsModule.run_traversals, vuln_info, navigation_url, webpage, each_webpage)
# 				logger.info(f"analysis out: {out}")
# 	except Exception as e:
# 		print(f"Error found during execution {e}")
# 		if stop_container:			
# 			dockerModule.stop_neo4j_container(container_name)
# 			dockerModule.remove_neo4j_container(container_name)
# 			dockerModule.remove_neo4j_database(database_name, container_name)
# 		raise RuntimeError

# 	# stop the neo4j docker container
# 	if stop_container:
# 		dockerModule.stop_neo4j_container(container_name)
# 		dockerModule.remove_neo4j_container(container_name)
# 		dockerModule.remove_neo4j_database(database_name, container_name)

# 	return container_name



























