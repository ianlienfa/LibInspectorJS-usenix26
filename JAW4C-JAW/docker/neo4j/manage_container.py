# -*- coding: utf-8 -*-

"""
	Copyright (C) 2021  Soheil Khodayari, CISPA
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
	Creates a new Neo4j Docker container instance


	Usage:
	------------
	python3 -m docker.neo4j.manage_container

"""


import os
import subprocess
import grp
import constants
import utils.utility as utilityModule
import hpg_neo4j.db_utility as DU
from utils.logging import logger
import time
import shutil
import json

# set up neo4j volume folder
VOLUME_HOME = os.path.join(os.path.join(os.path.join(constants.BASE_DIR, "docker"), "neo4j"), "volume")
CONF_HOME = os.path.join(os.path.join(os.path.join(constants.BASE_DIR, "docker"), "neo4j"), "conf")
PROCESS_USER_ID = os.getuid()
PROCESS_GROUP_ID = os.getgid()


def create_neo4j_container(container_name, weburl_suffix=None, webapp_name=None, volume_home=VOLUME_HOME):
	"""
	data_home: should be the path to the current url directory we're working on
	"""
	if not os.path.exists(volume_home):
		os.makedirs(volume_home)
	container_data_path = os.path.join(volume_home, container_name, 'neo4j')
	print("container_data_path", container_data_path)
	if not os.path.exists(container_data_path):		
		# os.makedirs(container_data_path)
		data_dir = os.path.join(container_data_path, 'data')
		logs_dir = os.path.join(container_data_path, 'logs')
		plugins_dir = os.path.join(container_data_path, 'plugins')
		conf_dir = os.path.join(container_data_path, 'conf')
		for p in [container_data_path, data_dir, logs_dir, plugins_dir, conf_dir]:
			os.makedirs(p)
			os.chown(p, 7474, 7474)
		shutil.copyfile(os.path.join(CONF_HOME, 'neo4j.conf'), os.path.join(conf_dir, 'neo4j.conf'))

	# Reconstruct volume mapping if in container
	os.environ["HOSTNAME"] = os.environ.get("HOSTNAME", subprocess.check_output("hostname", shell=True, text=True).strip())
	base_path = subprocess.check_output(
		"docker inspect $HOSTNAME --format '{{range .Mounts}}{{if eq .Destination \"/JAW4C\"}}{{.Source}}{{end}}{{end}}' | sed 's|/JAW4C||'",
		shell=True,
		text=True
	).strip()
	nms_path = subprocess.check_output(
		"docker inspect $HOSTNAME --format '{{range .Mounts}}{{if eq .Destination \"/JAW4C/JAW4C-JAW/data\"}}{{.Source}}{{end}}{{end}}'",
		shell=True,
		text=True
	).strip()
			
	# see: https://neo4j.com/labs/apoc/4.2/installation/#restricted
	#      https://github.com/neo4j-contrib/neo4j-apoc-procedures/issues/451
	# other options:
	# 	-e NEO4J_dbms_security_procedures_whitelist=apoc.coll.\\\*,apoc.load.\\\* \
	command="""docker run \
    --name {0} \
    --network jaw4c-network \
	--network-alias neo4j \
	-p 7474:7474 \
  	-p 7687:7687 \
	-u neo4j:neo4j \
    -d \
    -v {7}{1}/{0}/neo4j/data:/data \
    -v {7}{1}/{0}/neo4j/logs:/logs \
    -v {8}/{5}:/var/lib/neo4j/import/{6} \
	-v {7}{1}/{0}/neo4j/plugins:/plugins \
	-v {7}{1}/{0}/neo4j/conf:/conf \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS='["apoc"]' \
    -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\\\\* \
    -e PYTHONUNBUFFERED=1 \
    --env NEO4J_AUTH={2}/{3} \
    neo4j:4.4
	"""
	
	# Format the command with conditional import path
	if weburl_suffix and webapp_name:
		command = command.format(container_name, volume_home, constants.NEO4J_USER, constants.NEO4J_PASS, constants.DATA_DIR, weburl_suffix, webapp_name, base_path, nms_path)
	else:
		# For backward compatibility, create command without import volume
		command_no_import = """docker run \
    --name {0} \
    --network jaw4c-network \
	--network-alias neo4j \
	-p 7474:7474 \
  	-p 7687:7687 \
	-u neo4j:neo4j \
    -d \
    -v {4}{1}/{0}/neo4j/data:/data \
    -v {4}{1}/{0}/neo4j/logs:/logs \
	-v {4}{1}/{0}/neo4j/plugins:/plugins \
	-v {4}{1}/{0}/neo4j/conf:/conf \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS='["apoc"]' \
    -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\\\\* \
    -e PYTHONUNBUFFERED=1 \
    --env NEO4J_AUTH={2}/{3} \
    neo4j:4.4""".format(container_name, volume_home, constants.NEO4J_USER, constants.NEO4J_PASS, base_path)
		command = command_no_import
	# Note: pass the analyzer outputs folder as the import directory of neo4j

	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('Docker container %s is starting.'%str(container_name))
	
	# Update connection strings to use container name instead of localhost
	constants.NEO4J_CONN_HTTP_STRING = f"http://neo4j:7474"
	constants.NEO4J_CONN_STRING = f"bolt://neo4j:7687"
	constants.NEOMODEL_NEO4J_CONN_STRING = f"bolt://{constants.NEO4J_USER}:{constants.NEO4J_PASS}@neo4j:7687"

	command	= "docker exec %s 'rm -f /var/lib/neo4j/data/databases/store_lock'"%(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('%s: Docker container removing lock.'%str(container_name))

	command	= "docker exec %s 'rm -f /data/databases/store_lock'"%(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('%s: Docker container removing lock.'%str(container_name))


def create_test_neo4j_container(container_name, weburl_suffix, webapp_name, data_import_path, volume_home=VOLUME_HOME):
	"""
	Unit test version of create_neo4j_container

	Args:
		container_name: Name for the Docker container
		weburl_suffix: Parent directory name (e.g., 'static_query')
		webapp_name: Test directory name (e.g., 'test_initial_decl_cfg')
		data_import_path: Absolute path to the test directory containing nodes.csv/rels.csv
		volume_home: Docker volume home directory (default: VOLUME_HOME)

	Note: For unit tests, data_import_path should be the full path to the test directory
		  (e.g., /home/ian/JAW4C/JAW4C-JAW/tests/pipeline_test/sites/unit_test/static_query/test_name)
	"""
	if not os.path.exists(volume_home):
		os.makedirs(volume_home)
	container_data_path = os.path.join(volume_home, container_name, 'neo4j')
	print("container_data_path", container_data_path)
	if not os.path.exists(container_data_path):
		# os.makedirs(container_data_path)
		data_dir = os.path.join(container_data_path, 'data')
		logs_dir = os.path.join(container_data_path, 'logs')
		plugins_dir = os.path.join(container_data_path, 'plugins')
		conf_dir = os.path.join(container_data_path, 'conf')
		for p in [container_data_path, data_dir, logs_dir, plugins_dir, conf_dir]:
			os.makedirs(p)
			os.chown(p, -1, 7474)
		shutil.copyfile(os.path.join(CONF_HOME, 'neo4j.conf'), os.path.join(conf_dir, 'neo4j.conf'))

	# Reconstruct volume mapping if in container
	os.environ["HOSTNAME"] = os.environ.get("HOSTNAME", subprocess.check_output("hostname", shell=True, text=True).strip())
	base_path = subprocess.check_output(
		"docker inspect $HOSTNAME --format '{{range .Mounts}}{{if eq .Destination \"/JAW4C\"}}{{.Source}}{{end}}{{end}}' | sed 's|/JAW4C||'",
		shell=True,
		text=True
	).strip()

	# see: https://neo4j.com/labs/apoc/4.2/installation/#restricted
	#      https://github.com/neo4j-contrib/neo4j-apoc-procedures/issues/451
	# other options:
	# 	-e NEO4J_dbms_security_procedures_whitelist=apoc.coll.\\\*,apoc.load.\\\* \
	command="""docker run \
    --name {0} \
    --network jaw4c-network \
	--network-alias neo4j \
	-p 7474:7474 \
  	-p 7687:7687 \
	-u neo4j:neo4j \
    -d \
    -v {6}{1}/{0}/neo4j/data:/data \
    -v {6}{1}/{0}/neo4j/logs:/logs \
    -v {6}{4}:/var/lib/neo4j/import/{5} \
    -v {6}{1}/{0}/neo4j/plugins:/plugins \
	-v {6}{1}/{0}/neo4j/conf:/conf \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS='["apoc"]' \
    -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\\\\* \
    -e PYTHONUNBUFFERED=1 \
    --env NEO4J_AUTH={2}/{3} \
    neo4j:4.4""".format(container_name, volume_home, constants.NEO4J_USER, constants.NEO4J_PASS, data_import_path, webapp_name, base_path)
	# Note: For unit tests, data_import_path is the full path to the test directory

	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('Docker container %s is starting.'%str(container_name))
	
	# Update connection strings to use container name instead of localhost
	constants.NEO4J_CONN_HTTP_STRING = f"http://neo4j:7474"
	constants.NEO4J_CONN_STRING = f"bolt://neo4j:7687"
	constants.NEOMODEL_NEO4J_CONN_STRING = f"bolt://{constants.NEO4J_USER}:{constants.NEO4J_PASS}@neo4j:7687"

	command	= "docker exec %s 'rm -f /var/lib/neo4j/data/databases/store_lock'"%(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('%s: Docker container removing lock.'%str(container_name))

	command	= "docker exec %s 'rm -f /data/databases/store_lock'"%(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('%s: Docker container removing lock.'%str(container_name))


def clear_neo4j_containers(network_name, database_name):
	try:
		network = json.loads(subprocess.check_output(
			["docker", "network", "inspect", network_name],
			stderr=subprocess.DEVNULL))
	except subprocess.CalledProcessError:
		logger.error(f"Couldn't inspect network jaw4c-network — does it exist?")
		return
	except json.JSONDecodeError as e:
		logger.error(f"Failed to parse docker network inspect output: {e}")
		return

	containers = network[0].get("Containers", {}) if network else {}

	# Remove old neo4j containers in network
	for container_id, info in containers.items():
		cname = info.get("Name") or ""
		if cname.startswith("neo4j_container_"):  # neo4j container
			logger.warning(f"Removing existing neo4j container {cname}")	
			stop_neo4j_container(cname)
			remove_neo4j_container(cname)
			remove_neo4j_database(database_name, cname)


def remove_neo4j_database(database_name, container_name, all=False):
	path_db = os.path.join(VOLUME_HOME, container_name)
	if os.path.exists(path_db):
		shutil.rmtree(path_db) 


def start_neo4j_container(container_name):
	command = "docker start %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('Docker container %s is starting.'%str(container_name))


def stop_neo4j_container(container_name, cleanup=True):
	if cleanup:
		logger.warning('Cleaning up docker container %s.'%str(container_name))
		command = "docker exec %s bash -c 'rm -rf /data/* /logs/* /plugins/* /conf/*'"%(container_name)
		utilityModule.run_os_command(command, print_stdout=True)
	command = "docker exec %s bash -c 'neo4j stop'"%(container_name)
	logger.warning('Gently stopping neo4j %s.'%str(container_name))
	utilityModule.run_os_command(command, print_stdout=True)
	command = "docker stop %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.warning('Docker container %s is being stopped.'%str(container_name))

def restart_neo4j_container(container_name, cleanup=True):
	command = "docker restart %s"%(container_name)
	logger.warning('Restarting neo4j %s.'%str(container_name))	
	utilityModule.run_os_command(command, print_stdout=False)
	logger.warning('Docker container %s restarted.'%str(container_name))	


def remove_neo4j_container(container_name):
	command = "docker rm %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.warning('Docker container %s is being removed.'%str(container_name))


def import_data_inside_container_with_cypher(tx, database_name, relative_import_path):

	##  tx.run("""CREATE DATABASE %s;"""%database_name)
	## Note: neo4j community edition does not support management of multiple database
	## instead, we should run one docker instance per database
	

	## Note: this supports incremental import of data, i.e., multiple XML files can be imported inside the same db
	results = tx.run("""CALL  apoc.import.graphml('file:///%s', { })"""%relative_import_path.lstrip('/'))
	return results


def import_data_inside_container(container_name, database_name, relative_import_path, mode='graphML', nodes_file=None, edges_file=None, edges_dynamic_file=None):

	"""
	@param {string} container_name
	@param {string} database_name
	@param {string} relative_import_path: path relative to ./hpg_construction/outputs/
		in case of CSV: path of the folder containing nodes.csv, rels.csv 
		in case of graphML: path of the graphML file
	@param {string} mode: type of input (options are 'CSV' or 'graphML')
	"""

	if mode == 'CSV':

		csv_path = os.path.join('/var/lib/neo4j/import', relative_import_path)
		if nodes_file is None:
			nodes_path = os.path.join(csv_path, constants.NODE_INPUT_FILE_NAME)
		else:
			nodes_path = os.path.join(csv_path, nodes_file)

		if edges_file is None:
			rels_path = os.path.join(csv_path, constants.RELS_INPUT_FILE_NAME)
		else:
			rels_path = os.path.join(csv_path, edges_file)

		if edges_dynamic_file is None:
			rels_dynamic_path = os.path.join(csv_path, constants.RELS_DYNAMIC_INPUT_FILE_NAME)
		else:
			rels_dynamic_path = os.path.join(csv_path, edges_dynamic_file)

		if os.path.exists(rels_dynamic_path) and os.path.isfile(rels_dynamic_path):
	
			# see: https://neo4j.com/docs/operations-manual/current/tools/neo4j-admin-import/#import-tool-option-skip-duplicate-nodes
			if constants.NEO4J_VERSION.startswith(constants.NEOJ_VERSION_4X):
				neo4j_import_cmd = "neo4j-admin import --database=%s --nodes='%s' --relationships='%s','%s' --delimiter='\u001F' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path, rels_dynamic_path)
			else:
				neo4j_import_cmd = "neo4j-admin import --mode=csv --database=%s --nodes='%s' --relationships='%s','%s' --delimiter='\u001F' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path, rels_dynamic_path)

		else:
			# see: https://neo4j.com/docs/operations-manual/current/tools/neo4j-admin-import/#import-tool-option-skip-duplicate-nodes
			if constants.NEO4J_VERSION.startswith(constants.NEOJ_VERSION_4X):
				neo4j_import_cmd = "neo4j-admin import --database=%s --nodes='%s' --relationships='%s' --delimiter='\u001F' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path)
			else:
				neo4j_import_cmd = "neo4j-admin import --mode=csv --database=%s --nodes='%s' --relationships='%s' --delimiter='\u001F' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path)

		# directly run the command inside the neo4j container with docker exec
		cmd = "docker exec -it %s %s"%(container_name, neo4j_import_cmd)
		utilityModule.run_os_command(cmd, print_stdout=True, prettify=True)

		return 1

	elif mode == 'graphML':
		return DU.exec_fn_within_transaction(import_data_inside_container_with_cypher, database_name, relative_import_path)



#### Tests

def _test_import():

	relative_import_path = 'graphml/python_test_1.xml'
	database_name = 'test_neo4j_db'
	container_name = 'test_neo4j'
	mode = 'graphML'

	create_neo4j_container(container_name)
	time.sleep(10)
	result = import_data_inside_container(container_name, database_name, relative_import_path, mode)
	logger.info(result)


##### Run tests if run as the main module
if __name__ == '__main__':

	logger.info('running neo4j docker tests...')
	_test_import()