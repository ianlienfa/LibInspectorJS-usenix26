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



import os, sys, json, re
import utils.io as IOModule
import constants as constantsModule
import utils.utility as utilityModule
from utils.logging import logger as LOGGER
from pathlib import Path



# static analysis without neo4j
def start_model_construction(website_url, iterative_output='false', memory=None, timeout=None, compress_hpg='true', overwrite_hpg='false', specific_webpage=None):

	# setup defaults
	if memory is None:
		static_analysis_memory = '32000'
	else:
		static_analysis_memory = memory

	if timeout is None:
		static_analysis_per_webpage_timeout = 600 # seconds
	else:
		static_analysis_per_webpage_timeout = timeout

	# prep static_analysis command
	cve_vuln_analyses_command_cwd = os.path.join(constantsModule.BASE_DIR, "analyses/cve_vuln")
	cve_vuln_static_analysis_driver_program = os.path.join(cve_vuln_analyses_command_cwd, "static_analysis.js")

	cve_vuln_static_analysis_command = "node --max-old-space-size=%s DRIVER_ENTRY --singlefolder=SINGLE_FOLDER --compresshpg=%s --overwritehpg=%s --iterativeoutput=%s"%(static_analysis_memory, compress_hpg, overwrite_hpg, iterative_output)
	cve_vuln_static_analysis_command = cve_vuln_static_analysis_command.replace("DRIVER_ENTRY", cve_vuln_static_analysis_driver_program)

	# read from directories, prep
	website_folder_name = utilityModule.getDirectoryNameFromURL(website_url)
	website_folder = os.path.join(constantsModule.DATA_DIR, website_folder_name)

	webpages_json_file = os.path.join(website_folder, 'webpages.json')
	urls_file = os.path.join(website_folder, 'urls.out')


	if specific_webpage is not None:
		webpage_folder = os.path.join(constantsModule.DATA_DIR, specific_webpage)
		if os.path.exists(webpage_folder):
			node_command= cve_vuln_static_analysis_command.replace('SINGLE_FOLDER', "'" + webpage_folder + "'")
			IOModule.run_os_command(node_command, cwd=cve_vuln_analyses_command_cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)

	elif os.path.exists(webpages_json_file):

		fd = open(webpages_json_file, 'r')
		webpages = json.load(fd)
		fd.close()

		for webpage in webpages:
			webpage_folder = os.path.join(website_folder, webpage)
			if os.path.exists(webpage_folder):
				
				node_command= cve_vuln_static_analysis_command.replace('SINGLE_FOLDER',  "'" + webpage_folder + "'")				
				IOModule.run_os_command(node_command, cwd=cve_vuln_analyses_command_cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)



	elif os.path.exists(urls_file):
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
				node_command= cve_vuln_static_analysis_command.replace('SINGLE_FOLDER',  "'" + webpage_folder + "'")
				IOModule.run_os_command(node_command, cwd=cve_vuln_analyses_command_cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)

	else:
		message = 'no webpages.json or urls.out file exists in the webapp directory; skipping analysis...'
		LOGGER.warning(message)
		


"""
poc_str: a str that decribes poc
"""
def grep_matching_pattern(website_url: str, poc_str: str) -> bool:			
	website_folder_name = utilityModule.getDirectoryNameFromURL(website_url)
	website_folder = os.path.join(constantsModule.DATA_DIR, website_folder_name)
	
	patterns = list(filter(lambda x: x and x not in constantsModule.POC_PRESERVED , re.split('[,(){};."]', poc_str)))
	try:
		matching_strs = {}
		for poc_pattern in patterns:
			matching_strs[poc_str] = []  # Initialize as empty list
			for f in Path(website_folder).rglob("*.js"):
				matches = [f"{f}:{i}:{line.strip()}" for i, line in enumerate(open(f, 'r', encoding='utf-8'), 1) if poc_pattern in line]
				matching_strs[poc_str].extend(matches)  # Append to list			
	except Exception as e:
		LOGGER.error(f"Error during ground truth grep: {e}")
		return False
	grep_dict = {}
	try:
		with open(os.path.join(website_folder, 'urls.hashes.out'), 'r') as f_r:
			grep_dict = json.load(f_r)
			website_folder = os.path.join(website_folder, grep_dict[website_url])
	except Exception as e:
		pass
	with open(os.path.join(website_folder, 'groundtruth.json'), 'w') as f_w:
		grep_dict[website_url] = matching_strs
		json.dump(grep_dict, f_w, indent=4)		
	return True

