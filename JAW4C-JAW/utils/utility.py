
"""
	Copyright (C) 2020  Soheil Khodayari, CISPA
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
	Utility Functions 
	this module contains common methods used by other components

"""

import io
import subprocess
from threading import Timer
import time
import os
import re
import hashlib
from urllib.parse import urlparse
import constants as constantsModule
from neo4j import GraphDatabase
from datetime import datetime
import signal
from utils.logging import logger
import json
from contextlib import contextmanager



# -------------------------------------------------------------------------- #
#  		File I/O Utils
# -------------------------------------------------------------------------- #


class Tee:
	"""Write to multiple file-like objects simultaneously."""
	def __init__(self, *files):
		self.files = files

	def write(self, data):
		for f in self.files:
			f.write(data)
		logger.debug(data)

	def flush(self):
		for f in self.files:
			f.flush()


# -------------------------------------------------------------------------- #
#  		OS Utils
# -------------------------------------------------------------------------- #


def run_os_command(cmd, print_stdout=True, timeout=30*60, prettify=False, return_output=False):
	
	"""
	@description run a bash command 
	@param {string} cmd: bash command
	@return {int} process return code and -1 on timeout
	"""

	def kill(process): 
		process.kill()

	logger.debug('Running command: %s'%cmd)
	p = subprocess.Popen(cmd, shell=True, stdout = subprocess.PIPE, stderr=subprocess.PIPE, text=True)
	stdout, stderr = p.communicate()
	my_timer = Timer(timeout, kill, [p])

	ret = -1
	try:
		my_timer.start()
		# if print_stdout:
		# 	if not prettify:
		# 		for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
		# 			logger.info(line.strip())
		# 			if return_output:
		# 				out_str += line.strip()
		# 		for line in io.TextIOWrapper(p.stderr, encoding="utf-8"):
		# 			logger.info(line.strip())
		# 			if return_output:
		# 				err_str += line.strip()						
		# 	else:
		# 		for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
		# 			if return_output:
		# 				out_str += line.strip() + '\n'
		# 		for line in io.TextIOWrapper(p.stderr, encoding="utf-8"):
		# 			if return_output:
		# 				err_str += line.strip() + '\n'
		if print_stdout:
			logger.debug('STDOUT: %s'%stdout)
			logger.debug('STDERR: %s'%stderr)

		p.wait()
		ret = p.returncode
	except subprocess.TimeoutExpired:
		logger.warning('process timed out for cmd: %s'%cmd)
	finally:
		my_timer.cancel()

	if return_output:
		return ret, stdout, stderr

	return ret


def get_directory_last_part(path):

	"""
	@param {string} path
	@return {string} the last part of the path string
	"""

	return os.path.basename(os.path.normpath(path))


def get_directory_without_last_part(path):

	"""
	@oaram {string} path
	@return {string} omits the last part of the path and returns the remainder
	"""

	index = path.rfind('/')
	if index == -1:
		return path
	remove_str = path[index+1:]
	return path.rstrip(remove_str)

def remove_part_from_str(haystack, needle):
	
	"""
	@param {string} haystack
	@param {string} needle
	return {string} the haystack with the needle removed from it
	"""
	if needle in haystack:
		out = haystack.replace(needle, '')
		return out

	return haystack


def find_nth(haystack, needle, n):
	"""
	@param {string} haystack
	@param {string} needle
	@param {int} n
	@return {int} the index of the nth occurence of needle in haystack
	"""

	start = haystack.find(needle)
	while start >= 0 and n > 1:
		start = haystack.find(needle, start+len(needle))
		n -= 1
	return start


def _get_last_subpath(s):
	"""
	@param s :input string
	@return the last part of the given directory as string
	"""
	return os.path.basename(os.path.normpath(s))

	
class TimeoutManager:
	"""Manages nested timeouts using SIGALRM for analysis operations"""

	def __init__(self, total_timeout=None, operation_timeout=None):
		"""
		Args:
			total_timeout: Overall timeout for entire analysis (seconds)
			operation_timeout: Timeout per operation/POC (seconds)
		"""
		self.total_timeout = total_timeout
		self.operation_timeout = operation_timeout
		self.deadline = None
		self.prev_handler = None
		self.prev_timer = None
		self.in_operation = False

	def __enter__(self):
		"""Setup signal handler and timer on context entry"""
		if not self.total_timeout and not self.operation_timeout:
			return self

		if self.total_timeout:
			self.deadline = time.monotonic() + self.total_timeout

		self.prev_handler = signal.getsignal(signal.SIGALRM)
		self.prev_timer = signal.getitimer(signal.ITIMER_REAL)
		signal.signal(signal.SIGALRM, self._timeout_handler)

		if self.deadline:
			signal.setitimer(signal.ITIMER_REAL, self.total_timeout)

		return self

	def __exit__(self, exc_type, exc_val, exc_tb):
		"""Restore previous signal handler and timer on context exit"""
		if not self.total_timeout and not self.operation_timeout:
			return False

		# Restore previous signal handler and timer
		if self.prev_timer is not None:
			signal.setitimer(signal.ITIMER_REAL, self.prev_timer[0], self.prev_timer[1])
		else:
			signal.setitimer(signal.ITIMER_REAL, 0)

		if self.prev_handler is not None:
			signal.signal(signal.SIGALRM, self.prev_handler)

		return False

	def _timeout_handler(self, signum, frame):
		"""Signal handler for SIGALRM"""
		if self.in_operation and self.operation_timeout:
			raise TimeoutError(f"Operation timeout ({self.operation_timeout}s) exceeded")

		if self.deadline and time.monotonic() >= self.deadline:
			raise TimeoutError(f"Total analysis timeout ({self.total_timeout}s) exceeded")

		raise TimeoutError("Analysis timeout exceeded")

	def get_remaining_time(self):
		"""Returns remaining seconds, or None if no deadline set"""
		if self.deadline is None:
			return None
		remaining = self.deadline - time.monotonic()
		return max(0, remaining)

	@contextmanager
	def operation(self):
		"""
		Context manager for individual operations with their own timeout

		Usage:
			with tm.operation():
				# Code that should timeout per operation
		"""
		if not self.operation_timeout:
			yield
			return

		remaining = self.get_remaining_time()
		if remaining is not None and remaining <= 0:
			raise TimeoutError(f"Total analysis timeout ({self.total_timeout}s) exceeded")

		# Set timer to minimum of operation timeout and remaining total time
		timeout = self.operation_timeout
		if remaining is not None:
			timeout = min(timeout, remaining)

		self.in_operation = True
		signal.setitimer(signal.ITIMER_REAL, timeout)

		try:
			yield
		finally:
			self.in_operation = False
			# Reset timer to remaining total time
			remaining = self.get_remaining_time()
			if remaining is not None:
				signal.setitimer(signal.ITIMER_REAL, remaining)


		
# -------------------------------------------------------------------------- #
#  		Other Utils
# -------------------------------------------------------------------------- #


def getDirectoryNameFromURL(url):
	"""
	@param url: eTLD+1 domain name
	@return converts the url to a short directory name using domain + SHA256 hash

	Note: This is a wrapper around get_name_from_url() for backward compatibility.
	New code should use get_name_from_url() directly.
	"""
	return get_name_from_url(url)

def get_name_from_url(url):
	"""
	@param url: full URL string
	@return converts the url to a short directory name using domain + SHA256 hash

	IMPORTANT: This function must remain synchronized with the JavaScript version:
	  - JavaScript: getNameFromURL() in crawler/crawler-taint.js
	  - JavaScript: getNameFromURL() in crawler/crawler.js
	Both must produce identical output for the same input URL.
	Hash algorithm: SHA256 (matching JavaScript hashURL function)
	Domain sanitization: replace non-alphanumeric (except dash) with underscore
	"""
	# Generate SHA256 hash of the URL (matching JavaScript)
	url_hash = hashlib.sha256(url.encode('utf-8')).hexdigest()

	# Extract and sanitize domain for readability
	try:
		parsed = urlparse(url)
		domain = parsed.hostname if parsed.hostname else 'unknown'
		# Sanitize domain: replace non-alphanumeric (except dash) with underscore
		domain = ''.join(c if c.isalnum() or c == '-' else '_' for c in domain)
	except:
		domain = 'unknown'

	# Format: domain-hash (e.g., www_ebay_de-abc123...)
	return f"{domain}-{url_hash}"

def get_unique_nested_list(l):
	"""
	Resolve [{...}, {..., {...}}] kind of unique list requirements
	@param l: list of dicts
	@return unique list of dicts
	"""

	seen = set()
	unique_list = []
	for item in l:
		key = json.dumps(item, sort_keys=True)
		if key not in seen:
			seen.add(key)
			unique_list.append(item)
	return unique_list


def get_output_header_sep():

	sep = '====================================================\n'
	return sep


def get_output_subheader_sep():

	subsep = '----------------------------------------------------\n'
	return subsep



def get_current_timestamp():
	
	"""
	@return {string} current date and time string
	"""
	
	now = datetime.now()
	dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
	return dt_string


def get_unique_list(lst):
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array
	"""
	return list(set(lst))


def list_contains(needle, haystack):
	for p in haystack:
		if p.strip() == needle.strip():
			return True
	return False



def _hash(s):
	"""
	@param s :input string
	@return a SHA-256 hash of the given string
	"""
	return hashlib.sha256(s.encode('utf-8')).hexdigest()


def sha256(string):
	return _hash(string)




# -------------------------------------------------------------------------- #
#  		Uitlity Classes
# -------------------------------------------------------------------------- #


class Timeout:
	""" Timeout class using ALARM signal. """

	class Timeout(Exception):
		pass

	def __init__(self, sec):
		self.sec = sec

	def __enter__(self):
		signal.signal(signal.SIGALRM, self.raise_timeout)
		signal.alarm(self.sec)

	def __exit__(self, *args):
		signal.alarm(0)  # disable alarm

	def raise_timeout(self, *args):
		raise Timeout.Timeout()

















