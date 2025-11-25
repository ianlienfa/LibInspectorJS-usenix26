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
	API for running the client-side cve matching analyses (i.e., property graph construction)


	Usage:
	------------
	$ start_model_construction(website_url, memory, timeout)

"""



import os, sys, json
import utils.io as IOModule
import constants as constantsModule
import utils.utility as utilityModule
from utils.logging import logger as LOGGER

detector_driver_program = 'dlv.js'
lib_detection_cwd = os.path.join(os.path.dirname(__file__), "..", "..", "driver")

# Nov 19: we don't need the -l option here, target directory will be decided by url
def lib_detection_single_url(data_dir, url, timeout=60):
    lib_detection_command = "node {0} -u '{1}' -l {2}".format(
        detector_driver_program,
        url,
		data_dir
    )			
    LOGGER.debug(lib_detection_command)	
    ret = IOModule.run_os_command(lib_detection_command, 
    print_stdout=True, cwd=lib_detection_cwd, timeout=timeout)
    LOGGER.info("successfully detected libraries on %s, return code: %s"%(url, ret)) 


# # static analysis without neo4j
def lib_detection(website_url, iterative_output='false', memory=None, timeout=None, compress_hpg='true', overwrite_hpg='false'):

	if timeout is None:
		static_analysis_per_webpage_timeout = 30 # seconds
	else:
		static_analysis_per_webpage_timeout = timeout

	# read from directories, prep
	website_folder_name = utilityModule.getDirectoryNameFromURL(website_url)
	website_folder = os.path.join(constantsModule.DATA_DIR, website_folder_name)
	webpages_json_file = os.path.join(website_folder, 'webpages.json')
	urls_file = os.path.join(website_folder, 'urls.out')

	if os.path.exists(urls_file):
		message = 'webpages.json file does not exist, falling back to urls.out'
		LOGGER.warning(message)
		
		# read the urls from the webpage data
		fd = open(urls_file, 'r')
		urls = fd.readlines()
		fd.close()

		# make sure that the list of urls is unique
		# this would eliminate the cases where the crawler is executed multiple times for the same site
		# without deleting the data of the old crawl and thus adds duplicate urls to urls.out file.
		urls = list(set(urls))

		for url in urls:
			url = url.strip().rstrip('\n').strip()
			webpage_folder_name = utilityModule.sha256(url)
			webpage_folder = os.path.join(website_folder, webpage_folder_name)
			if os.path.exists(webpage_folder):
				# prep static_analysis command
				lib_detection_command = "node {0} -u '{1}'".format(
					detector_driver_program,
					url
				)			
				ret = IOModule.run_os_command(lib_detection_command, cwd=lib_detection_cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)
				LOGGER.info("successfully detected libraries on %s, return code: %s"%(url, ret)) 

	elif os.path.exists(webpages_json_file):
		# if os.path.exists(webpages_json_file):

		# 	fd = open(webpages_json_file, 'r')
		# 	webpages = json.load(fd)
		# 	fd.close()

		# 	for webpage in webpages:
		# 		webpage_folder = os.path.join(website_folder, webpage)
		# 		if os.path.exists(webpage_folder):
					
		# 			node_command= cve_vuln_static_analysis_command.replace('SINGLE_FOLDER',  "'" + webpage_folder + "'")
		# 			IOModule.run_os_command(node_command, cwd=cve_vuln_analyses_command_cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)
		pass

	else:
		message = 'no webpages.json or urls.out file exists in the webapp directory; skipping analysis...'
		LOGGER.warning(message)