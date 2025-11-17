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
	The main program that runs the testing pipeline


	Usage:
	------------
	$ python3 -m run_pipeline --conf=config.yaml

"""

import argparse
import os, sys
import requests
import json
import time
import uuid
import logging
from urllib.parse import urlencode, quote_plus

import utils.io as IOModule
from utils.logging import logger as LOGGER, LogFormatter
import utils.utility as utilityModule
import constants as constantsModule
import analyses.domclobbering.domc_neo4j_traversals as DOMCTraversalsModule
import analyses.domclobbering.static_analysis_api as domc_sast_model_construction_api

import analyses.cs_csrf.cs_csrf_neo4j_traversals as CSRFTraversalsModule
import analyses.cs_csrf.static_analysis_api as csrf_sast_model_construction_api

import analyses.request_hijacking.static_analysis_api as rh_sast_model_construction_api
import analyses.request_hijacking.static_analysis_py_api as request_hijacking_neo4j_analysis_api
import analyses.request_hijacking.verification_api as request_hijacking_verification_api

import analyses.open_redirect.static_analysis_api as or_sast_model_construction_api
import analyses.open_redirect.static_analysis_py_api as or_neo4j_analysis_api

import analyses.cve_vuln.cve_vuln_neo4j_traversals as CVETraversalsModule
import analyses.cve_vuln.static_analysis_api as cve_stat_model_construction_api
import analyses.cve_vuln.lib_detection_api as lib_detection_api

import driver.detector_reader as DetectorReader

import vuln_db.db as VulnDBController
import docker.neo4j.manage_container as dockerModule



def is_website_up(uri):
	try:
		response = requests.head(uri, timeout=20)
		return True
	except Exception as e:
		return False

def save_website_is_down(domain):
	base = constantsModule.DATA_DIR_UNREPONSIVE_DOMAINS
	if not os.path.exists(base):
		os.makedirs(base)

	filename = os.path.join(base, utilityModule.getDirectoryNameFromURL(domain))
	with open(filename, "w+") as fd:
		fd.write(domain)

def create_start_crawl_url(url):
    condition = 'soak'
    query = {'target': url, 'type': condition}
    return f'http://240.240.240.240/?{urlencode(query, quote_via=quote_plus)}' 


def parse_additional_args_to_posix_style(args):
    result = []
    for key, val in args.items():
        if val is True:
            # Boolean flags without values
            result.append(f"--{key}")
        elif val is not None and val != "":
            # Key-value pairs
            result.append(f"--{key}={val}")	
    return f"'{json.dumps(result)}'"

# Use get_name_from_url from utils.utility (already imported as utilityModule)
get_name_from_url = utilityModule.get_name_from_url

# Global variables to track current URL logging handlers
current_url_handlers = None

def add_url_logging_handlers(url, webpage_folder, log_level='info'):
	"""
	Adds file handlers to the main logger for capturing logs
	specific to a URL processing into its webpage_folder

	@param url: the URL being processed
	@param webpage_folder: the directory path for this specific webpage
	@param log_level: minimum log level to capture ('info', 'warning', 'error')
	@return: tuple of handlers for later removal
	"""
	global current_url_handlers

	# Clean up any existing handlers first
	cleanup_current_url_handlers()

	# Ensure the webpage folder exists
	if not os.path.exists(webpage_folder):
		os.makedirs(webpage_folder, exist_ok=True)

	# Create log files
	error_log_path = os.path.join(webpage_folder, 'errors.log')
	warning_log_path = os.path.join(webpage_folder, 'warnings.log')
	info_log_path = os.path.join(webpage_folder, 'info.log')

	handlers = []

	# Create error file handler (only errors)
	error_handler = logging.FileHandler(error_log_path)
	error_handler.setLevel(logging.ERROR)
	error_handler.setFormatter(LogFormatter())
	handlers.append(error_handler)

	# Create warning file handler (warnings and errors)
	warning_handler = logging.FileHandler(warning_log_path)
	warning_handler.setLevel(logging.WARNING)
	warning_handler.setFormatter(LogFormatter())
	handlers.append(warning_handler)

	# Create info file handler if log_level includes info
	if log_level.lower() in ['info', 'debug']:
		info_handler = logging.FileHandler(info_log_path)
		info_handler.setLevel(logging.DEBUG)
		info_handler.setFormatter(LogFormatter())
		handlers.append(info_handler)

	# Add all handlers to the main logger
	for handler in handlers:
		LOGGER.addHandler(handler)

	# Store handlers globally for cleanup
	current_url_handlers = tuple(handlers)

	return current_url_handlers

def cleanup_current_url_handlers():
	"""
	Removes any currently active URL-specific handlers from the main logger
	"""
	global current_url_handlers

	if current_url_handlers:
		for handler in current_url_handlers:
			LOGGER.removeHandler(handler)
			handler.close()
		current_url_handlers = None


def perform_domain_health_check(website_url):
	"""
	Performs domain health check and returns whether the website is up

	@param website_url: URL to check
	@return: True if website is up, False otherwise
	"""
	LOGGER.info('checking if domain is up with python requests ...')
	website_up = False

	try:
		website_up = is_website_up(website_url)
	except:
		save_website_is_down(website_url)

	if not website_up:
		LOGGER.warning('domain %s is not up, skipping!'%website_url)
		save_website_is_down(website_url)
		return False

	return True

def perform_crawling(website_url, config, crawler_command_cwd, crawling_timeout, lib_detector_lift, transform_enabled, crawler_node_memory):
	"""
	Performs crawling for a given website URL using either single-pass or two-pass approach

	@param website_url: URL to crawl
	@param config: Configuration dictionary
	@param crawler_command_cwd: Crawler command working directory
	@param crawling_timeout: Timeout for crawling operations
	@param lib_detector_lift: Whether lift mode is enabled
	@param transform_enabled: Whether transform mode is enabled
	@param crawler_node_memory: Memory allocation for node process
	"""
	LOGGER.info("crawling site %s."%(website_url))

	# Two-pass crawling when foxhound is enabled
	if config["crawler"]["browser"]["foxhound"]:
		# Pass 1: Pure collection with Chrome
		LOGGER.info("Pass 1: Pure collection with Chrome browser")
		pass1_command = "node --max-old-space-size={0} {1} --maxurls={2} --browser=chrome --headless={3} --overwrite={4} --additionalargs={5} --pure=true".format(
			crawler_node_memory,
			os.path.join(crawler_command_cwd, 'crawler.js'),
			config["crawler"]["maxurls"],
			config["crawler"]["browser"]["headless"],
			config["crawler"]["overwrite"],
			f"'{json.dumps(config["crawler"]["playwright"])}'",
		)

		# Add lift or transform option based on config
		if lib_detector_lift:
			pass1_command += " --lift=true"
		if transform_enabled:
			pass1_command += " --transform=true"

		pass1_command += " --seedurl=" + f'"{website_url}"'
		LOGGER.debug(pass1_command)
		IOModule.run_os_command(pass1_command, cwd=crawler_command_cwd, timeout=crawling_timeout)
		LOGGER.info("Pass 1 completed: Pure collection")

		# Pass 2: Taint analysis with Foxhound
		# LOGGER.info("Pass 2: Taint analysis with Foxhound browser")
		# pass2_command = "node --max-old-space-size={0} {1} --maxurls={2} --browser=firefox --headless={3} --foxhound=true --collect=true".format(
		# 	crawler_node_memory,
		# 	os.path.join(crawler_command_cwd, 'crawler-taint.js'),
		# 	config["crawler"]["maxurls"],
		# 	config["crawler"]["browser"]["headless"],
		# )
		# pass2_command += f' --foxhoundpath={config["crawler"]["browser"]["foxhoundpath"]}'
		# pass2_command += " --seedurl=" + f'"{website_url}"'
		# LOGGER.debug(pass2_command)
		# IOModule.run_os_command(pass2_command, cwd=crawler_command_cwd, timeout=crawling_timeout)
		# LOGGER.info("Pass 2 completed: Taint analysis")

	else:
		# Original single-pass crawling
		browser_name = config["crawler"]["browser"]["name"]
		if browser_name == 'chrome':
			crawler_js_program = 'crawler.js'
		else:
			crawler_js_program = 'crawler-taint.js'

		# Build crawling command dynamically
		if config["testbed"]["archive"]["enable"]:
			crawling_command = 'node --max-old-space-size={5} {6} --maxurls={0} --browser={1} --headless={2} --overwrite={3} --foxhound={4} --additionalargs={7} --seedurl="{8}"'.format(
				config["crawler"]["maxurls"],
				config["crawler"]["browser"]["name"],
				config["crawler"]["browser"]["headless"],
				config["crawler"]["overwrite"],
				config["crawler"]["browser"]["foxhound"],
				crawler_node_memory,
				os.path.join(crawler_command_cwd, crawler_js_program),
				parse_additional_args_to_posix_style(config["crawler"]["playwight"]),
				website_url
			)
		else:
			crawling_command = "node --max-old-space-size={5} {6} --maxurls={0} --browser={1} --headless={2} --overwrite={3} --foxhound={4} --seedurl={7}".format(
				config["crawler"]["maxurls"],
				config["crawler"]["browser"]["name"],
				config["crawler"]["browser"]["headless"],
				config["crawler"]["overwrite"],
				config["crawler"]["browser"]["foxhound"],
				crawler_node_memory,
				os.path.join(crawler_command_cwd, crawler_js_program),
				website_url
			)

		if browser_name != 'chrome':
			crawling_command += f' --foxhoundpath={config["crawler"]["browser"]["foxhoundpath"]}'

		if lib_detector_lift:
			crawling_command += " --lift=True"
		else:
			crawling_command += " --lift=False"

		LOGGER.debug(crawling_command)
		IOModule.run_os_command(crawling_command, cwd=crawler_command_cwd, timeout=crawling_timeout)

	LOGGER.info("successfully crawled %s."%(website_url))

def perform_cve_vulnerability_analysis(website_url, config, lib_detector_enable, lib_detector_lift, vuln_db, iterative_output, static_analysis_memory, static_analysis_per_webpage_timeout, static_analysis_compress_hpg, static_analysis_overwrite_hpg, container_transaction_timeout):
	"""
	Performs CVE vulnerability analysis for a given website URL

	@param website_url: URL to analyze
	@param config: Configuration dictionary
	@param lib_detector_enable: Whether library detection is enabled
	@param lib_detector_lift: Whether lift mode is enabled
	@param vuln_db: Vulnerability database connection
	@param iterative_output: Whether to use iterative output
	@param static_analysis_memory: Memory allocation for static analysis
	@param static_analysis_per_webpage_timeout: Timeout per webpage
	@param static_analysis_compress_hpg: Whether to compress HPG
	@param static_analysis_overwrite_hpg: Whether to overwrite HPG
	@param container_transaction_timeout: Timeout for neo4j container transactions
	"""
	if not config['cve_vuln']['enabled']:
		return

	webapp_folder_name = get_name_from_url(website_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		LOGGER.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))
		return

	urls_file = os.path.join(webapp_data_directory, 'urls.out')
	if not os.path.exists(urls_file):
		LOGGER.error(f"urls.out file not found: {urls_file}")
		return

	with open(urls_file, 'r') as fd:
		urls = fd.readlines()
	urls = list(set(urls))

	for url in urls:
		url = url.strip().rstrip('\n').strip()
		webpage_folder_name = utilityModule.sha256(url)
		webpage_folder = os.path.join(webapp_data_directory, webpage_folder_name)
		if os.path.exists(webpage_folder):
			# Add URL-specific logging handlers to capture all logs for this URL
			add_url_logging_handlers(url, webpage_folder)

			# Library detection
			if lib_detector_enable and lib_detector_lift:
				try:
					# Extract library detection arguments from config
					detector_config = config.get("crawler", {}).get("lib_detection", {}).get("detector", {})
					proxy_server_path = detector_config.get("proxy-server", "http://localhost:8002")
					ptv_extension_path = detector_config.get("load-extension", "/JAW4C/JAW4C-PTV")
					ptv_original_extension_path = detector_config.get("load-extension-original", "/JAW4C/JAW4C-PTV-Original")
					headless = config.get("crawler", {}).get("browser", {}).get("headless", True)
					ignore_cert_errors = detector_config.get("ignore-certificate-errors", True)
					disk_cache_dir = detector_config.get("disk-cache-dir", "/dev/null")
					disk_cache_size = detector_config.get("disk-cache-size", 1)
					
					lib_detection_api.lib_detection_single_url(
						url, 
						proxy_server_path=proxy_server_path,
						ptv_extension_path=ptv_extension_path, 
						ptv_original_extension_path=ptv_original_extension_path,
						headless=headless,
						ignore_cert_errors=ignore_cert_errors,
						disk_cache_dir=disk_cache_dir,
						disk_cache_size=disk_cache_size
					)
				except Exception as e:
					LOGGER.error(f"Library detection failed for {url}: {e}")
					continue
				LOGGER.info("successfully detected libraries on %s."%(url))

			# Detection result and DB querying
			vuln_list = [] # we often time only do query once
			vuln_info_pathname = os.path.join(webpage_folder, 'vuln.out')
			
			if config['cve_vuln']["passes"]["vulndb"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(url))
				try:
					lib_det_res = DetectorReader.read_raw_result_with_url(url)
				except Exception as e:
					LOGGER.error(e)
					continue

				# Clean up vuln.out from previous runs
				ground_truth_pathname = os.path.join(webpage_folder, 'groundtruth.json')
				if os.path.exists(vuln_info_pathname):
					os.remove(vuln_info_pathname)
				if os.path.exists(ground_truth_pathname):
					os.remove(ground_truth_pathname)

				
				for affiliatedurl, _ in lib_det_res.items():
					mod_lib_mapping = DetectorReader.get_mod_lib_mapping(lib_det_res, affiliatedurl)
					LOGGER.info(f"mod_lib_mapping: {mod_lib_mapping}")

					# Build vulnerability list
					
					for lib, matching_obj_lst in (mod_lib_mapping or {}).items():
						for detection_info in matching_obj_lst:
							vuln = []
							if detection_info['accurate']:
								version = detection_info['version'].split(', ')
								vuln = vuln_db.package_vuln_search(lib, version=version) # type: ignore
							# else:
							# 	vuln = vuln_db.package_vuln_search(lib) # type: ignore

							if not vuln:
								LOGGER.info(f"No vulnerability matched for {lib}, continue...")
								continue
							else:
								LOGGER.info(f"vuln found at library obj {detection_info['location']}: {vuln}")

								# Setup ground truth for this particular site
								for poc in vuln:
									try:
										poc_str = poc['poc']
										# grep for the poc fragments existence in the files
										grep_found = cve_stat_model_construction_api.grep_matching_pattern(website_url, poc_str) 
										poc['grep_found'] = True if grep_found else False

									except Exception as e:
										print('poc formatting problem from database', poc)

								vuln_list.append({
									"mod": detection_info['mod'], "libname": lib, "location": detection_info['location'], "version": detection_info['version'], "vuln": vuln
								})
					
					# Some vulnerabilities is similar, leading to duplicate vuln_info, remove them for better performance
					vuln_list = utilityModule.get_unique_nested_list(vuln_list)
					if not vuln_list:
						LOGGER.error("No vuln found, early quitting")
					with open(vuln_info_pathname, 'a') as vuln_fd:
						LOGGER.info(f"Wring vuln to: {vuln_info_pathname}")
						json.dump({affiliatedurl: vuln_list}, vuln_fd)
						vuln_fd.write('\n')			

	
			if config['cve_vuln']["passes"]["static"]:					
				try:
					cve_stat_model_construction_api.start_model_construction(url, specific_webpage=webpage_folder, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
				except Exception as e:
					LOGGER.error("Error building node/edges for %s."%(url))
					continue
				LOGGER.info("static analysis for site %s."%(url))
				LOGGER.info("successfully finished static analysis for site %s."%(url))

			# Start static analysis over neo4j, skip if no match on vulnerability
			if (config['cve_vuln']["passes"]["static_neo4j"]):				
				if not vuln_list:					
					with open(vuln_info_pathname, 'r') as vuln_fd:
						# TODO: the vuln.out format is not friendly
						for line in vuln_fd.readlines():
							vuln_json = json.loads(line)
							if url in vuln_json:								
								vuln_list = vuln_json[url]
					if not vuln_list:
						continue
				database_name = 'neo4j'
				graphid = uuid.uuid4().hex
				container_name = 'neo4j_container_' + graphid
				try:
					container_name = CVETraversalsModule.build_hpg(container_name, webpage_folder)
					LOGGER.info("successfully built hpg for %s."%(url))
				except Exception as e:
					LOGGER.error("Error building hpg for %s."%(url), e)
					continue

				# Query on vulnerabilities
				if container_name:
					for try_attempts in range(2):
						try:
							# vuln_list element: {"http://localhost:3000/integration_test/static_analysis/test_vuln_bund_vary_call_jquery_CVE-2020-7656": [{"mod": true, "libname": "jquery", "location": "692", "version": "3.4.0", "vuln": [{"poc": "LIBOBJ(WILDCARD).html(PAYLOAD)", "gadget": "false", "payload": "<options>alert('XSS')</options>", "exported": "true", "sink_type": "javascript", "validated": false, "payload_type": "string", "additional_info": {}, "confidence_score": "0.8", "vulnerability_type": "xss", "grep_found": true}, {"poc": "LIBOBJ(WILDCARD).html(PAYLOAD)", "gadget": false, "payload": "<img src=x onerror=alert(1)>", "exported": true, "sink_type": "javascript", "validated": false, "payload_type": "string", "additional_info": {}, "confidence_score": 0.8, "vulnerability_type": "xss", "grep_found": true}, {"poc": "LIBOBJ(WILDCARD).html(PAYLOAD)", "gadget": "false", "payload": "<option><style></style><script>alert('XSS')</script></option>", "exported": "true", "sink_type": "javascript", "validated": false, "payload_type": "string", "additional_info": {}, "confidence_score": "0.8", "vulnerability_type": "xss", "grep_found": true}]}]}
							CVETraversalsModule.analyze_hpg(url, container_name, vuln_list, container_transaction_timeout)
							break
						except Exception as e:
							print(f"neo4j exception {e}, retrying ... ")
							time.sleep(5)
					LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(url))

					# Cleanup
					if not config['staticpass']['keep_docker_alive']:
						dockerModule.stop_neo4j_container(container_name)
						dockerModule.remove_neo4j_container(container_name)

def process_single_website(website_url, config, domain_health_check, crawler_command_cwd, crawling_timeout, lib_detector_lift, transform_enabled, crawler_node_memory, lib_detector_enable, vuln_db, iterative_output, static_analysis_memory, static_analysis_per_webpage_timeout, static_analysis_compress_hpg, static_analysis_overwrite_hpg, container_transaction_timeout):
	"""
	Processes a single website through the entire analysis pipeline

	@param website_url: URL to process
	@param config: Configuration dictionary
	@param domain_health_check: Whether to perform domain health check
	@param crawler_command_cwd: Crawler command working directory
	@param crawling_timeout: Timeout for crawling operations
	@param lib_detector_lift: Whether lift mode is enabled
	@param transform_enabled: Whether transform mode is enabled
	@param crawler_node_memory: Memory allocation for node process
	@param lib_detector_enable: Whether library detection is enabled
	@param vuln_db: Vulnerability database connection
	@param iterative_output: Whether to use iterative output
	@param static_analysis_memory: Memory allocation for static analysis
	@param static_analysis_per_webpage_timeout: Timeout per webpage
	@param static_analysis_compress_hpg: Whether to compress HPG
	@param static_analysis_overwrite_hpg: Whether to overwrite HPG
	@param container_transaction_timeout: Timeout for neo4j container transactions
	"""
	# Domain health check
	if domain_health_check:
		if not perform_domain_health_check(website_url):
			return

	# Crawling
	if(config['cve_vuln']['enabled'] and config['cve_vuln']["passes"]["crawling"]):

		perform_crawling(website_url, config, crawler_command_cwd, crawling_timeout, lib_detector_lift, transform_enabled, crawler_node_memory)

	# CVE vulnerability analysis
	perform_cve_vulnerability_analysis(website_url, config, lib_detector_enable, lib_detector_lift, vuln_db, iterative_output, static_analysis_memory, static_analysis_per_webpage_timeout, static_analysis_compress_hpg, static_analysis_overwrite_hpg, container_transaction_timeout)



def main():

	BASE_DIR= os.path.dirname(os.path.realpath(__file__))
	CONFIG_FILE_DEFAULT = 'config.yaml'
	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')
	p.add_argument('--conf', "-C",
					metavar="FILE",
					default=CONFIG_FILE_DEFAULT,
					help='pipeline configuration file. (default: %(default)s)',
					type=str)


	p.add_argument('--site', "-S",
					default='None',
					help='website to test; overrides config file (default: %(default)s)',
					type=str)

	p.add_argument('--list', "-L",
					default='None',
					help='site list to test; overrides config file (default: %(default)s)',
					type=str)


	p.add_argument('--from', "-F",
					default=-1,
					help='the first entry to consider when a site list is provided; overrides config file (default: %(default)s)',
					type=int)

	p.add_argument('--to', "-T",
					default=-1,
					help='the last entry to consider when a site list is provided; overrides config file (default: %(default)s)',
					type=int)


	# ----------- Config Section -----------

	args= vars(p.parse_args())
	config = IOModule.load_config_yaml(args["conf"])

	override_site = args["site"]
	override_site_list = args["list"]
	override_site_list_from = args["from"]
	override_site_list_to = args["to"]

	domain_health_check = config["crawler"]["domain_health_check"]

	if override_site != 'None':
		config["testbed"]["site"] = override_site

	if override_site_list != 'None':
		config["testbed"]["sitelist"] = override_site_list

	if override_site_list_from != -1:
		config["testbed"]["from_row"] = override_site_list_from

	if override_site_list_to != -1:
		config["testbed"]["to_row"] = override_site_list_to


	LOGGER.info("loading config: %s"%str(config))

	# iteratively write the HPG construction output to disk
	# useful in case of timeouts for partial results
	iterative_output = 'false'
	if "staticpass" in config:
		if "iterativeoutput" in config["staticpass"]:
			iterative_output = str(config["staticpass"]["iterativeoutput"]).lower()
	

	crawler_command_cwd = os.path.join(BASE_DIR, "crawler")
	force_execution_command_cwd = os.path.join(BASE_DIR, "dynamic")
	dynamic_verifier_command_cwd = os.path.join(BASE_DIR, "verifier")

	# default memory for nodejs crawling process
	crawler_node_memory = 8192

	if "memory" in config["crawler"]:
		crawler_node_memory = config["crawler"]["memory"]
		
	# crawling config
	# # if config["testbed"]["archive"]["enable"]:
	# # 	crawling_command = "node --max-old-space-size={5} DRIVER_ENTRY --maxurls={0} --browser={1} --headless={2} --overwrite={3} --foxhound={4} --additionalargs={6} --seedurl=SEED_URL".format(
	# # 		config["crawler"]["maxurls"],
	# # 		config["crawler"]["browser"]["name"],
	# # 		config["crawler"]["browser"]["headless"],
	# # 		config["crawler"]["overwrite"],
	# # 		config["crawler"]["browser"]["foxhound"], # should_use_foxhound
	# # 		crawler_node_memory,
	# # 		parse_additional_args_to_posix_style(config["crawler"]["puppeteer"])
	# # 	)
	# # else:
	# # 	crawling_command = "node --max-old-space-size={5} DRIVER_ENTRY --maxurls={0} --browser={1} --headless={2} --overwrite={3} --foxhound={4} --seedurl=SEED_URL".format(
	# # 		config["crawler"]["maxurls"],
	# # 		config["crawler"]["browser"]["name"],
	# # 		config["crawler"]["browser"]["headless"],
	# # 		config["crawler"]["overwrite"],
	# # 		config["crawler"]["browser"]["foxhound"], # should_use_foxhound
	# # 		crawler_node_memory
	# # 	)		
		
	# browser_name = config["crawler"]["browser"]["name"]
	# if browser_name == 'chrome':
	# 	crawler_js_program = 'crawler.js'
	# else:
	# 	crawler_js_program = 'crawler-taint.js'
	# 	crawling_command += f' --foxhoundpath={config["crawler"]["browser"]["foxhoundpath"]}'

	# node_crawler_driver_program = os.path.join(crawler_command_cwd, crawler_js_program)
	# crawling_command = crawling_command.replace("DRIVER_ENTRY", node_crawler_driver_program)
	crawling_timeout = int(config["crawler"]["sitetimeout"])

	# lib_detector config
	lib_detector_enable = config["cve_vuln"]["passes"]["lib_detection"]
	lib_detector_lift = config.get('cve_vuln', {}).get('passes', {}).get('lift', False)
	transform_enabled = config.get('cve_vuln', {}).get('passes', {}).get('transform', False)
	# if lib_detector_lift:
	# 	crawling_command += " --lift=True"
	# else:
	# 	crawling_command += " --lift=False"
	detector_driver_program = 'dlv.js'
	detection_timeout = config["crawler"]["lib_detection"]["detection_timeout"]

	# vuln_db config
	if(config["vuln_db"]["connect"]):
		vuln_db = VulnDBController.PostgresDB(
			host=config["vuln_db"]["host"],
			port=config["vuln_db"]["port"],
			dbname=config["vuln_db"]["dbname"],
			user=config["vuln_db"]["user"],
			password=config["vuln_db"]["password"]
			)
		if not vuln_db:
			raise RuntimeError("Vuln DB not connected")

	# static analysis config	
	static_analysis_timeout = int(config["staticpass"]["sitetimeout"])
	static_analysis_memory = config["staticpass"]["memory"]
	static_analysis_per_webpage_timeout = int(config["staticpass"]["pagetimeout"])

	static_analysis_compress_hpg = 'true'
	if "compress_hpg" in config["staticpass"]:
		static_analysis_compress_hpg = config["staticpass"]["compress_hpg"]


	static_analysis_overwrite_hpg = 'false'
	if "overwrite_hpg" in config["staticpass"]:
		static_analysis_overwrite_hpg = config["staticpass"]["overwrite_hpg"]

	container_transaction_timeout = 300  # default value
	if "container_transaction_timeout" in config["staticpass"]:
		container_transaction_timeout = int(config["staticpass"]["container_transaction_timeout"])

	# set neo4j config
	if "neo4j_user" in config["staticpass"]:
		constantsModule.NEO4J_USER = config["staticpass"]["neo4j_user"]
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_pass" in config["staticpass"]:
		constantsModule.NEO4J_PASS = config["staticpass"]["neo4j_pass"]
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_http_port" in config["staticpass"]:
		constantsModule.NEO4J_HTTP_PORT = config["staticpass"]["neo4j_http_port"]
		constantsModule.NEO4J_CONN_HTTP_STRING = "http://127.0.0.1:%s"%str(constantsModule.NEO4J_HTTP_PORT)

	if "neo4j_bolt_port" in config["staticpass"]:
		constantsModule.NEO4J_BOLT_PORT = config["staticpass"]["neo4j_bolt_port"]
		constantsModule.NEO4J_CONN_STRING = "bolt://127.0.0.1:%s"%str(constantsModule.NEO4J_BOLT_PORT)
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_use_docker" in config["staticpass"]:
		constantsModule.NEO4J_USE_DOCKER = config["staticpass"]["neo4j_use_docker"] 


	# ----------- Sigle Site Analysis Section -----------

	# single site crawl/analysis
	if "site" in config["testbed"]:
		website_url = config["testbed"]["site"]
		process_single_website(
			website_url=website_url,
			config=config,
			domain_health_check=domain_health_check,
			crawler_command_cwd=crawler_command_cwd,
			crawling_timeout=crawling_timeout,
			lib_detector_lift=lib_detector_lift,
			transform_enabled=transform_enabled,
			crawler_node_memory=crawler_node_memory,
			lib_detector_enable=lib_detector_enable,
			vuln_db=vuln_db,
			iterative_output=iterative_output,
			static_analysis_memory=static_analysis_memory,
			static_analysis_per_webpage_timeout=static_analysis_per_webpage_timeout,
			static_analysis_compress_hpg=static_analysis_compress_hpg,
			static_analysis_overwrite_hpg=static_analysis_overwrite_hpg,
			container_transaction_timeout=container_transaction_timeout
		)
	# ----------- Multiple-sites Analysis Section (Web Archive) -----------
	else: 
		from_row = int(config["testbed"]["from_row"])
		to_row = int(config["testbed"]["to_row"]) if not (config["testbed"]["to_row"] == 'end') else config["testbed"]["to_row"]
		if config["testbed"]["archive"]["enable"] and config["testbed"]["archive"]["mappinglist"]:
			with open(config["testbed"]["archive"]["mappinglist"], 'r') as f:
				mapping = json.load(f)
				if to_row == "end":
					to_row = len(mapping.keys())
				archive_urls = list(mapping.keys())
				for i in range(from_row, to_row+1):
					LOGGER.info(f"[Archive working]=================={i}/{to_row+1}==================")
					try:
						website_url = create_start_crawl_url(archive_urls[i])
						LOGGER.info(f"Running on website: {website_url}")
						process_single_website(
							website_url=website_url,
							config=config,
							domain_health_check=domain_health_check,
							crawler_command_cwd=crawler_command_cwd,
							crawling_timeout=crawling_timeout,
							lib_detector_lift=lib_detector_lift,
							transform_enabled=transform_enabled,
							crawler_node_memory=crawler_node_memory,
							lib_detector_enable=lib_detector_enable,
							vuln_db=vuln_db,
							iterative_output=iterative_output,
							static_analysis_memory=static_analysis_memory,
							static_analysis_per_webpage_timeout=static_analysis_per_webpage_timeout,
							static_analysis_compress_hpg=static_analysis_compress_hpg,
							static_analysis_overwrite_hpg=static_analysis_overwrite_hpg,
							container_transaction_timeout=container_transaction_timeout
						)
					except RuntimeError as r_e:
						print(f"Runtime error catched for {website_url}: {r_e}, moving on to the next...")
						continue

	# close db connection
	if vuln_db:
		vuln_db.close()
		LOGGER.info("db connection closed")

	# Clean up any remaining URL logging handlers
	cleanup_current_url_handlers()
if __name__ == "__main__":
	main()
