# -*- coding: utf-8 -*-

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
	Detecting Client-Side CVE vulnerabilities

	Usage:
	-----------
	> import analyses.cve_vuln.cve_vuln_cypher_queries as CVETraversalsModule

"""

import subprocess
import hashlib
import urllib.parse
import os
import time
import re
import sys
import pickle
import functools
import jsbeautifier
import itertools
import difflib
import json


import constants as constantsModule
import utils.utility as utilityModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
from hpg_neo4j.query_utility import get_ast_parent, get_ast_topmost, getChildsOf, get_node_by_id, getAdvancedCodeExpression, getCodeOf
import analyses.cs_csrf.semantic_types as CSRFSemanticTypes
import analyses.general.data_flow as DF


from utils.logging import logger
from neo4j import GraphDatabase
from datetime import datetime





# ----------------------------------------------------------------------- #
#				Globals
# ----------------------------------------------------------------------- #


DEBUG = False

# ----
# Main queries:
# detect what parts of the xhr data are tainted from which parts of the program
# detection through forward or backward type propagation and program slicing.
MAIN_QUERY_ACTIVE = True

# ----------------------------------------------------------------------- #
#				Utility Functions
# ----------------------------------------------------------------------- #

class EarlyHaltException(Exception):
    def __init__(self, args=""):
        self.args = args


def _unquote_url(url):
	
	"""
	@param {string} url
	@return {string} decoded url
	"""
	out = urllib.parse.unquote(url)
	out = out.replace('&amp;', '&')

	return out

def _get_all_occurences(needle, haystack):
	
	"""
	@param {string} needle
	@param {string haystack
	@description finds all occurences of needle in haystack
	@return {array} a list of start index occurences of needle in haystack
	"""
	out = [m.start() for m in re.finditer(needle, haystack)]
	return out


def _get_current_timestamp():
	
	"""
	@return {string} current date and time string
	"""
	now = datetime.now()
	dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
	return dt_string

def _get_unique_list(lst):
	
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array
	"""
	return list(set(lst))


def _get_orderd_unique_list(lst):
	
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array maintaining the original list order
	"""
	final_list = [] 
	for item in lst: 
		if item not in final_list: 
			final_list.append(item) 
	return final_list 

def _get_line_of_location(esprima_location_str):
	
	"""
	@param esprima_location_str
	@return start line numnber of esprima location object
	"""
	start_index = esprima_location_str.index('line:') + len('line:')
	end_index = esprima_location_str.index(',')
	out = esprima_location_str[start_index:end_index]
	return out

def _get_location_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} node id string
	"""
	start_index = nid_string.index('__Loc=') + len('__Loc=')
	return nid_string[start_index:]

def _get_node_id_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} location string
	"""
	start_index = nid_string.find('__nid=')
	if start_index != -1:
		start_index = start_index + len('__nid=')
	else:
		start_index = 0 # handle the case where function name is not stored at the begining

	end_index = nid_string.index('__Loc=')
	return nid_string[start_index:end_index]


def _get_function_name_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} function_name string
	"""
	end_index = nid_string.index('__nid=')
	return nid_string[:end_index]



def _get_value_of_identifer_or_literal(node):
	"""
	@param {PGNode} node
	@return {list} returns the pair of the value of a node and the node type  (identifer or literal)
	"""
	if node['Type'] == 'Identifier':
		return [node['Code'], node['Type']]
	elif node['Type'] == 'Literal':
		value = node['Value']
		raw = node['Raw']
		if value == '{}' and (raw.strip('\'').strip("\"").strip() != value):
			return [node['Raw'], node['Type']]
		else:
			return [node['Value'], node['Type']]

	return ['', '']


# ----------------------------------------------------------------------- #
#			Experimental Utils
# ----------------------------------------------------------------------- #

def getValueOf(tx, varname, rootContextNode):
	"""
	@param tx {pointer} neo4j transaction pointer
	@param varname {string} variable whose value is to be resolved
	@rootContextNode {node object} context of the given variable to resolve
	@return {list} an array of triple elemenets containing information regarding inferred variable values, their literals and identifiers
	"""

	outValues = [] #list of values (its a list due to potential assigments of different values in (dynamic-valued) if-conditions)
	PROGRAM_NODE_INDEX = '1' # program node

	# for PDG relations
	query = """
	MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t) RETURN collect(distinct n_t) AS resultset
	"""%(rootContextNode['Id'], varname)

	results = tx.run(query)
	for item in results: 
		childNodes = item['resultset'] 
		for childNode in childNodes:
			tree = getChildsOf(tx, childNode)
			contextNode = tree['node']
			if contextNode['Id'] == PROGRAM_NODE_INDEX: 
				continue
			ex = getCodeExpression(tree)
			[code_expr, literals, idents] = ex
			outValues.append(ex)
			
			new_varnames = _get_unique_list(list(idents)) 
			for new_varname in new_varnames:
				if new_varname == varname: continue
				v = getValueOf(tx, new_varname, contextNode)
				outValues.extend(v)	

	return outValues


def wrapTryExceptOn(statement):
	"""
	@param {string} statement
	@return {string} statement wrapped over try/except block
	"""
	code = """try:\t%s\nexcept:\n\tpass\n"""%(statement)
	return code

def resolveValueOf(tx, varname, rootContextNode):
	"""
	@param tx {pointer} neo4j transaction pointer
	@param varname {string} variable whose value is to be resolved
	@rootContextNode {node object} context of the given variable to resolve
	@return {list} an array of inferred variable values
	"""

	outValues = []
	bases = []
	extensions = []
	values = getValueOf(tx, varname, rootContextNode)

	if DEBUG: print("getValueOf: %s "%values)
	values = getResolvedPointsTo(values)
	if DEBUG: print("getResolvedPointsTo: %s "%values)
	values = getFunctionResolvedValues(values)
	if DEBUG: print("getFunctionResolvedValues: %s "%values)

	if len(values):
		ordered_expr = values[::-1]
		program = [element[0] for element in ordered_expr]
		p = itertools.permutations(program)

		## @TODO: run-time improvement!
		# this way of exec per statement correctly ignores unknown methods or functions & is slow!
		for perm in p:
			exec('%s=\"\"'%varname) # reset varname
			new_perm = [wrapTryExceptOn(st) for st in perm]
			new_code = '\n'.join(new_perm)
			try:
				exec(new_code)
				v = eval(varname)
				if v not in outValues:
					outValues.append(v)
			except Exception as e:
				print("type error: " + str(e))

	return outValues



def getResolvedPointsTo(values):
	"""
	@param {list} values
	@return {list} pointTo resolved array
	"""
	new_values = []
	to_resolve = []
	resolve_names = []
	resolved = []
	for ii in range(len(values)):
		item = values[ii]
		expr = item[0]
		lits = item[1]
		idents = item[2]
		if '.' in expr:
			parts = expr.split(" ")
			for part in parts:
				if '.' in part:
					members = part.split('.')
					for k in range(len(members)-1): # do not resolve the last one as it is already resolved
						stripped_member = members[k].strip()
						to_resolve.append([ii, stripped_member])
						resolve_names.append(stripped_member)

	for jj in range(len(values)):
		resolver = values[jj]
		resolver_expr = resolver[0]
		cont = True
		for o in resolve_names:
			if o in resolver_expr:
				cont = False
				break
		if cont: 
			continue

		# at this point resolver_expr can resolve values of to_resolve list
		assignmentSymbol = "="
		assignmentIndex = resolver_expr.index(assignmentSymbol)
		left = resolver_expr[:assignmentIndex].strip()
		right =resolver_expr[assignmentIndex+1:].strip()

		for item in to_resolve:
			item_idx = item[0]
			item_name = item[1]
			if item_name == left:
				new = values[item_idx][0].replace(" "+left+ ".", " "+right+".") # disallow replace within word-parts
				values[item_idx][0] = new
				values[item_idx][2].append(right) # add the new identifier

	return values


def getFunctionResolvedValues(values):
	"""
	@param {list} values:  resolved values, the result of 'resolveValueOf' function
	@return {list} values with the function calls resolved as variables
	"""
	vals = []
	functions = []
	for idx in range(len(values)):
		value = values[idx]
		literals = value[1]
		idents = value[2]
		parts = value[0].split(" ")
		
		done = False

		resolve_func = []
		arg_stack = []
		new_parts = []
		for i in range(len(parts)-1):
			if not (parts[i] in idents and parts[i+1] in idents):
				new_parts.append(parts[i])
		i = 0
		while not done:
			if new_parts[i] in literals:
				arg_stack.append(new_parts[i])
			if new_parts[i] in idents and new_parts[i-1] in literals and i >=1: # @Note functions without values would be treated like identifiers, so the middle condition does not (correctly) check that case!
				resolve_func.append([new_parts[i], arg_stack[::-1]])
				arg_stack = []
			if i == len(new_parts)-1:
				done = True
				break
			i = i + 1

		if len(resolve_func):
			functions.append([idx, resolve_func])


	toIgnoreIndexes =  [] # modified statements containing function calls + function definitions
	# resolve the value and add its result
	for j in range(len(values)):
		v = values[j]
		resolveExpression = v[0]
		name = resolveExpression.split(" ")[0]
		for funcItem in functions:
			resolveIndex = funcItem[0]
			funcDescriptions = funcItem[1]
			for func in funcDescriptions:
				# @Note: multiple functions of the same expr to be resolved
				funcName = func[0]
				if  name == funcName:
					callParams = func[1]
					border = len(resolveExpression) - 2*len(callParams)
					positionalArguments = resolveExpression[border:].split(" ")[::-1]
					resolveExpression = resolveExpression[:border] #remove positional arguments
					for k in range(len(callParams)):
						resolveExpression = resolveExpression.replace(positionalArguments[k], callParams[k])
					idss = values[resolveIndex][2]
					litss = values[resolveIndex][1]

					# 1. append the function body with the arguments replaced with passed params
					new_ids = v[2] + idss
					for arg in positionalArguments:
						new_ids = list(filter(lambda e: e != arg, new_ids)) # remove the positional args from identifiers list in of function body
					vals.append([resolveExpression, v[1] + litss, new_ids]) 
					toIgnoreIndexes.append(j)

					# 2. append the original expr contating function calls with removing the function params and treat it as a variable
					original_expr = values[resolveIndex][0]
					for arg in callParams:
						original_expr = original_expr.replace(arg, "")
					vals.append([original_expr, litss, idss])
					toIgnoreIndexes.append(resolveIndex)

	for p in range(len(values)):
		if p not in toIgnoreIndexes:
			item = values[p]
			vals.append(item)

	# break the 'assignment' statements if a function body;
	# Note: this will not break other things like method invocations, etc, as not required
	outVals = []
	for qq in range(len(vals)):
		item = vals[qq]
		item_expr = item[0]
		item_literals = item[1]
		item_idents = item[2]
		item_expr_list = item_expr.split(" ")
		break_indexes = []
		for q in range(len(item_expr_list)-1):
			# two idents or literals or their combination must not occur next to each other in the list without an operator in between them!
			if  (item_expr_list[q] in item_idents or item_expr_list[q] in item_literals) and \
				(item_expr_list[q+1] in item_idents or item_expr_list[q+1] in item_literals):
				breaked = True
				break_indexes.append(q)
		
		rest = []
		for iii in range(len(break_indexes)):
			if iii == 0:
				subexpression = item_expr_list[:break_indexes[iii]+1]
				rest = item_expr_list[break_indexes[iii]+1:]
	
			elif len(break_indexes) >=2:
				subexpression = item_expr_list[break_indexes[iii-1]+1: break_indexes[iii]+1]
				rest = item_expr_list[break_indexes[iii]+1:]

			outVals.append([' '.join(subexpression), item_literals, item_idents])

		if len(break_indexes):
			if len(rest):
				outVals.append([' '.join(rest), item_literals, item_idents])
		else:
			outVals.append(item)

	return outVals

# ----------------------------------------------------------------------- #
#		Semantic Type Association to Program Slices 
# ----------------------------------------------------------------------- #

def _get_semantic_type(program_slices, num_slices, document_vars, find_endpoint_tags=False):
	
	"""
	@param {list} program_slices: slices of JS program
	@param {int} num_slices: length of program_slices list
	@param {list} document_vars: fields in HTML forms accessbile by the 'document' DOM API
	@return {list} the semantic types associated with the given program slices.
	"""


	semantic_type = CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE
	semantic_types = []

	# API patterns to match to asscoiate a program slice string to a semantic type
	WEB_STORAGE_STRINGS = [
		'localStorage',
		'sessionStorage'
	]

	WIN_LOC_STRINGS = [
		'window.location',
		'location.href',
		'location.hash',
		'History.getBookmarkedState'
	]

	WIN_NAME_STRINGS = [
		'window.name'
	]

	DOM_READ_STRINGS = [
		'document.getElement',
		'.getElementBy',
		'.getElementsBy',
		'$(',
		'jQuery(',
		'.attr(',
		'.getAttribute(',
		'.readAttribute('
	]

	DOM_READ_COOKIE_STRINGS = [
		'document.cookie'
	]

	PM_STRINGS = [
		'event.data', 
		'evt.data'
	]

	DOC_REF_STRINGS = [
		'document.referrer'
	]

	if find_endpoint_tags:
			code = program_slices
			for var in document_vars:
				if var in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in WEB_STORAGE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_LOC_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_LOC_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_NAME_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
					semantic_types.append(semantic_type)
					break

			for item in DOC_REF_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_COOKIE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in PM_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
					semantic_types.append(semantic_type)
					break


	else:
		for i in range(num_slices):
			program_slice = program_slices[i]
			code = program_slice[0]
			idents = program_slice[2]


			for var in document_vars:
				if var in code: # directly look for substring existance
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)

			for item in WIN_LOC_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_LOC_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in WEB_STORAGE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_COOKIE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_NAME_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
					semantic_types.append(semantic_type)
					break

			for item in DOC_REF_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
					semantic_types.append(semantic_type)
					break

			for item in PM_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
					semantic_types.append(semantic_type)
					break

			for identifier in idents:

				for item in WEB_STORAGE_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
						semantic_types.append(semantic_type)
						break

				for item in DOM_READ_COOKIE_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
						semantic_types.append(semantic_type)
						break

				for item in WIN_NAME_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
						semantic_types.append(semantic_type)
						break

				for item in DOC_REF_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
						semantic_types.append(semantic_type)
						break

				for item in PM_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
						semantic_types.append(semantic_type)
						break

	if len(semantic_types):
		return semantic_types

	return [CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE]


def _get_semantic_type_set(semantic_type_list):
	
	"""
	@param {list} semantic_type_list: list of types that may include duplicate semantic types
	@return {list} a unique semantic type list
	"""

	semantic_type_list = _get_unique_list(semantic_type_list)
	if len(semantic_type_list) > 1:
		if CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE in semantic_type_list:
			semantic_type_list.remove(CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE)
		return semantic_type_list	

	elif len(semantic_type_list) == 1:
		return semantic_type_list

	else:
		return [CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE]


# ----------------------------------------------------------------------- #
#				End Utils
# ----------------------------------------------------------------------- #



def getIdentifierLocalAndGlobalValues(tx, varname):
	"""
	gets the expected value(s) of an identifier from local and global scopes
	@param tx {pointer} neo4j transaction pointer
	@param {string} varname: identifier to resolve
	@return {list} list of back traces for the given identifer
	"""

	stack = []
	query = """
		MATCH (n { Type:'Identifier', Code: '%s'})<-[:AST_parentOf {RelationType: 'id'}]-(vdtor {Type: 'VariableDeclarator'})<-[:AST_parentOf {RelationType:'declarations'}]-(vdtion),
		(vdtor)-[:AST_parentOf {RelationType: 'init'}]->(value)
		RETURN vdtion, value
	"""%(varname)
	results = tx.run(query)

	for pair in results:
		# must at most one pair exist, otherwise, there are 2 or more potential values defined for a single variable at different scopes!
		top_variable_declaration = pair['vdtion']
		init_value = pair['value']
		recurse = False
		if init_value['Type'] == 'Literal':
			expression = '%s %s = \"%s\"'%(top_variable_declaration['Kind'], varname, init_value['Value'])
		elif init_value['Type'] == 'Identifier':
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, init_value['Code'])
			recurse = True
		elif init_value['Type'] == 'FunctionExpression':
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, 'function(){ ... }')
		else:
			init_tree = getChildsOf(tx, init_value)
			ce = getAdvancedCodeExpression(init_tree)
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, ce[0]) 	
			
		knowledge = {varname: {'top': top_variable_declaration, 'init': init_value, 'expression': expression}} 
		stack.append(knowledge)

		if recurse:
			new_varname = init_value['Code']
			child_stack = getIdentifierLocalAndGlobalValues(tx, new_varname)
			stack.extend(child_stack)



	return stack

def getProgramSliceFormat(back_traces):
	"""
	@param {list} back_traces: output of getIdentifierLocalAndGlobalValues
	@return {list} format compatible with getAdvancedCodeExpression function
	"""
	output = []
	for dict_item in back_traces:
		varname = list(dict_item)[0]
		knowledge_value = dict_item[varname]
		
		expression = knowledge_value['expression']
		top = knowledge_value['top']
		location = top['Location']
		init = knowledge_value['init']

		lits = []
		idents = []
		
		if init['Type'] == 'Literal':
			lits.append(init['Value'])
		elif init['Type'] == 'Identifier':
			idents.append(init['Code'])

		item = [expression, lits, idents, location]
		output.append(item)

	return output

def isVariableAFunctionArgumentInCurrentScope(tx, varname, varname_nid):
	"""
	@DEPRECATED
	@param {pointer} tx: neo4j transaction pointer
	@param {string} varname
	@param {string} varname_nid: node id of varname
	@return {tuple<bool,list>} boolean + the top function if true + function_name
	"""

	# Case 1: Function Expression as Variable Decleration, e.g., var f = function(varname) { ... }
	query1 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'id'}]-(vd {Type: 'VariableDeclarator'})-[:AST_parentOf {RelationType: 'init'}]->(n {Type:'FunctionExpression'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)

	# Case 2: Function Expression as Dictionary Key, e.g., f: function(varname) { ... }
	query2 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'key'}]-(vd {Type: 'Property'})-[:AST_parentOf {RelationType: 'value'}]->(n {Type:'FunctionExpression'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)

	# Case 3: Function Declaration, e.g., function f(varname) { ...}
	query3 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'id'}]-(n {Type:'FunctionDeclaration'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)


	res = tx.run(query1)   # queries should only find one function!
	for item in res:
		fn1 = item['top']
		func_name_node = item['fname']
		return [True, fn1, func_name_node]

	res = tx.run(query2)
	for item in res:
		fn2 = item['top']
		func_name_node = item['fname']
		return [True, fn2, func_name_node]

	res = tx.run(query3)
	for item in res:
		fn3 = item['top']
		func_name_node = item['fname']
		return [True, fn3, func_name_node]

	return [False, None, None]

def getFunctionCallValuesOfFunctionDefinitions(tx, functionDefNode):
	"""
	navigates the call graph to find the bindings between 'function-call arguments' & 'function definition params'
	@param {pointer} tx: neo4j transaction pointer
	@param {node} functionDefNode: a 'FunctionExpression' or 'FunctionDeclaration' node of esprima AST
	@return {dictionary} { call_line: {p1: val1, p2:val2}, call_line: {p1: val1, p2: val2}, ... }
	"""
	out = {}
	query = """
	MATCH (param)<-[:AST_parentOf {RelationType: 'params'}]-(functionDef { Id: '%s' })<-[:CG_parentOf]-(caller {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'arguments'}]-> (arg) RETURN collect(distinct param) as params, caller, collect(distinct arg) AS args
	"""%(functionDefNode['Id'])


	results = tx.run(query)
	for each_binding in results:
		call_expression = each_binding['caller']
		args = each_binding['args']
		params = each_binding['params']
		if len(args) < len(params):
			params = params[::-1] # must reverse this list to match in case of call with lower number of arguments than definition

		call_location_line = call_expression['Location']
		call_nid = call_expression['Id']
		key = call_nid + '__Loc=' + call_location_line
		out[key] = {}

		for i in range(len(params)):
		
			if i <= len(args)-1: # handle the case the function is called with lesser arguments than its definition
				[param, param_type] = _get_value_of_identifer_or_literal(params[i])
				argument_type = args[i]['Type']
				if argument_type== 'MemberExpression':
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'MemberExpression'
				elif argument_type== 'ObjectExpression':
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'ObjectExpression'
				elif argument_type== 'Literal' or argument_type== 'Identifier':
					[arg, arg_type] = _get_value_of_identifer_or_literal(args[i])
					identifiers = None
				else:
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = argument_type

				out[key][param] = {'Value': arg, 'Type':arg_type, 'ResolveIdentifiers': identifiers}

	return out

def getThisPointerResolution(tx, this_node):
	
	"""
	@param {pointer} tx: neo4j db handle
	@param {dict|node} this_node: `ThisExpression` node 
	@description
	   `ThisExpression` pointer analysis
		1. In a method, this refers to the owner object.
		2. Alone, this refers to the global object.
		3. In a function, this refers to the global object.
		4. In a function, in strict mode, this is undefined.
		5. In an event, this refers to the element that received the event.
		6. Methods like call(), and apply() can refer this to any object.
	@return {dict} pointer resolutions of the given `ThisExpression`
	"""


	this_expression_node_id = this_node['Id']
	out = {'events':[], 'methods': []}

	###  STEP 1: inspect if pointer-analysis is already done and is in DB
	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'top', Arguments: 'pointsTo=window'}]->(top_node)
	return top_node as top
	"""%(this_expression_node_id)
	results = tx.run(pointer_query)

	shouldTerminate = False
	for item in results:
		top = item['top']
		owner = owner = constantsModule.WINDOW_GLOBAL_OBJECT
		out['methods'].append({'top': top, 'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'top'}]->(top_node),
	(this_node { Id: '%s'})-[:pointsTo {RelationType: 'owner'}]->(owner_node)
	return top_node as top, owner_node as owner
	"""%(this_expression_node_id, this_expression_node_id)
	results = tx.run(pointer_query)
	for item in results:
		top = item['top']
		owner = item['owner']
		out['methods'].append({'top': top, 'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'owner', Arguments: 'pointsTo=eventSelector'}]->(owner_node)
	return owner_node as owner
	"""%(this_expression_node_id)
	results = tx.run(pointer_query)
	for item in results:
		owner = item['owner']
		out['events'].append({'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	### ---- END STEP 1 ---- ###

	### STEP 2: do the pointer-analysis 

	# handle ThisStatement in events
	query="""
	MATCH (this_st {Id: '%s'})<-[:AST_parentOf*1..10]-(n {Type: 'FunctionExpression'})<-[r:ERDG]-(top_node)
	RETURN r
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		relation = item['r']
		out['events'].append({'relation': relation}) # r['args'].split('___')[1] = id of the node that `this` refers to it


	# handle ThisStatement in functions (may resolve to global object, i.e., window, or to the owner object, if they are lator assigned to a member expression)
	# assignment expr, or var declaration:    										   (right/init)		assign_expr/declarator
	query="""
		MATCH (this_st { Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf]-(expr)-[r:AST_parentOf]->(function_name), (expr)<-[:AST_parentOf]-(top)
		WHERE r.Type= 'left' OR r.Type= 'id'
		OPTIONAL MATCH (p1 {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'right'}]->(c1 {Type: 'Identifier', Value: function_name.Code}), 
		(p1)-[:AST_parentOf {RelationType: 'left'}]->(c2 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(owner {Type: 'Identifier'})
		OPTIONAL MATCH (function_name)-[:AST_parentOf {RelationTYpe: 'object'}]->(true_owner {Type: 'Identifier'})
		RETURN
		CASE function_name.Type
		WHEN 'Identifier' THEN [top, function_name, owner]
		WHEN 'MemberExpression' THEN [top, true_owner]
		ELSE 'xx'
		END
	"""%this_expression_node_id
	# if owner is null,  then `this` refers to global object: the window
	# if owner is not null, `this` referes to the owner
	results = tx.run(query)
	for item in results:
		if 'true_owner' in item:
			owner = item['true_owner']
			top = item['top']
			out['methods'].append({'top': top, 'owner': owner})
		if 'function_name' in item and 'owner' in item:
			fname = item['function_name']
			owner= item['owner']
			top = item['top']
			if owner is None or owner == '':
				owner = constantsModule.WINDOW_GLOBAL_OBJECT
				out['methods'].append({'top': top, 'owner': owner})
			else:
				out['methods'].append({'top': top, 'owner': owner})

	## handle the object expression case
	query="""
	MATCH (this_st {Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'value'}]-(prop {Type: 'Property'})<-[:AST_parentOf {RelationType: 'properties'}]-(expr {Type: 'ObjectExpression'})<-[r:AST_parentOf]-(t)<-[:AST_parentOf]-(tt)
	WHERE (r.RelationType= 'right' OR r.RelationType= 'init' OR r.RelationType = 'arguments')
	AND (t.Type = 'AssignmentExpression' OR t.Type='VariableDeclarator' OR t.Type= 'CallExpression')
	AND (tt.Type = 'ExpressionStatement' OR tt.Type='VariableDeclaration')
	OPTIONAL MATCH (t)-[r2:AST_parentOf]->(c1 {Type: 'Identifier'}) WHERE r2.RelationType = 'left' OR r2.RelationType = 'id'
	OPTIONAL MATCH (t)-[:AST_parentOf]->(c3)-[AST_parentOf {RelationType: 'object'}]->(c2 {Type: 'Identifier'})
	RETURN tt, c2, c1
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		owner = item['c2']
		top = item['tt']
		if owner is None:
			owner = item['c1']
		if owner is not None:
			out['methods'].append({'top': top, 'owner': owner})


	query="""
	MATCH (this_st { Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'arguments'}]-(top_call_expression)-[:AST_parentOf {RelationType: 'callee'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(the_event_target_top),
	(member_expr)-[:AST_parentOf {RelationType: 'property'}]->(prop {Type: 'Identifier', Code: 'on'}), (top_call_expression)<-[:AST_parentOf]-(top)
	RETURN the_event_target_top, top
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		owner = item['the_event_target_top']
		top = item['top']
		out['methods'].append({'top': top, 'owner': owner})


	# store the results in DB for future use
	if len(out['methods']) > 0:
		for element in out['methods']:
			top_node = element['top']
			owner_node = element['owner']
			if owner_node == constantsModule.WINDOW_GLOBAL_OBJECT:
				top_node_id= top_node['Id']
				build_relationship_query="""
				MATCH (this_node { Id: '%s'}), (top_node { Id: '%s'}))
				CREATE (this_node)-[:pointsTo {RelationType: 'top', Arguments: 'pointsTo=window'}]->(top_node)
				"""%(this_expression_node_id)
			else:
				top_node_id = top_node['Id']
				owner_node_id = owner_node['Id']
				build_relationship_query="""
				MATCH (this_node { Id: '%s'}), (top_node { Id: '%s'}), (owner_node { Id: '%s'})
				CREATE (this_node)-[:pointsTo {RelationType: 'top'}]->(top_node)
				CREATE (this_node)-[:pointsTo {RelationType: 'owner'}]->(owner_node)
				"""%(this_expression_node_id, top_node_id, owner_node_id)
			tx.run(build_relationship_query)

	if len(out['events']) > 0:
		for element in out['events']:
			owner_node_id = item['Arguments'].split('___')[1]
			build_relationship_query="""
			MATCH (this_node { Id: '%s'}), (owner_node { Id: '%s'})
			CREATE (this_node)-[:pointsTo {RelationType: 'owner', Arguments: 'pointsTo=eventSelector'}]->(owner_node)
			"""%(this_expression_node_id, owner_node_id)
			tx.run(build_relationship_query)

	### ---- END STEP 2 ---- ###

	return out

def getIdentifierAndExprFromArgCode(tx, argCode):
	"""
		@param {pointer} tx
		@param {object} argCode: the argument code (in cve detection the module id string)
		@return {list of node object pairs}: [(callExprNode, calleeNode) ...] : 
			returns all matching identifier and expression having the matching code in the arguments
    """	

	query = """
		MATCH
		// get the callexpression calling this id
		(modIdArg {Type: 'Literal', Value: '%s'})<-[:AST_parentOf {RelationType: 'arguments'}]-(callExprNode {Type: 'CallExpression'})
		,(callExprNode)-[:AST_parentOf {RelationType: 'callee'}]->(calleeNode {Type: 'Identifier'})
		// get the callee id too		
		RETURN callExprNode, calleeNode
	"""%(argCode)
	results = tx.run(query)
	res = []
	for record in results:
		callExprNode = record['callExprNode']
		calleeNode = record['calleeNode']
		res.append((callExprNode, calleeNode))
	return res	

def getObjectMatch(tx, objCode):
	"""
		@param {pointer} tx
		@param {object} objCode: the code of library object
		@return {list of node object pairs}: [(callExprNode) ...] : 
			returns all matching identifier and expression having the matching code in the arguments
    """	
	components = objCode.split('.')[::-1]
	res = []
	if len(components):
		query = """
			MATCH		
			(ident0 {Type: 'Identifier', Code: '%s'})<-[:AST_parentOf {RelationType: 'property'}]-(memExprNode {Type: 'MemberExpression'})
			// get the callee id too		
			RETURN memExprNode
		"""%(components[0])
		print("[getObjectMatch]: %s"%(query))
		results = tx.run(query)
		for record in results:
			memExprNode = record['memExprNode']
			res.append(memExprNode)
	return res	




def getSinkExpression(tx, vuln_info):
	"""
		@param {pointer} tx
		@param {object} vuln_info, having key: 'module_id', 'identifiers'
		@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=sink argument
			query for identifying if the vulnerable function is in used
			params = {'module_id': <>, func_name: '<func_name>'}	
		@memo currently only searches forward, so make sure that the vuln_id information starts at library object			
    """	
	res = []

	def isValueOfProperty(tx, node):
		query = """
		MATCH (node {Id: '%s'})<-[:AST_parentOf{RelationType: 'value'}]-(propNode {Type: 'Property'})
		RETURN propNode
		"""%(node['Id'])
		q_res = tx.run(query)
		iterator = iter(q_res)
		try:
			first_item = next(iterator)
			return True
		except StopIteration:
			return False

	def islibraryObject(tx, callExprNode, calleeNode):
		# check 1. see if the callee is a argument declared in a function declaration
		# check 2. see if the function declaration is a value of a dict property		
		initDeclRes = neo4jQueryUtilityModule.getInitialDeclaration(tx, calleeNode)	
		# should be the one on line 4		
		if initDeclRes:
			[declarationNode, initialDeclarationIdentifierNode] = initDeclRes
			print("declarationNode-", declarationNode)
			return isValueOfProperty(tx, declarationNode)
		return False

	def getTargetCallExpressionAndArg(tx, topExpressionNode, targetIdentifierCode):
		query = """
			MATCH (topExpressionNode {Id: '%s'})-[:AST_parentOf|CFG_parentOf*0..]->(callExpressionNode {Type: 'CallExpression'})
				-[:AST_parentOf {RelationType: 'callee'}]->(memExpressionNode {Type: 'MemberExpression'})
				-[:AST_parentOf {RelationType: 'property'}]->(targetIdentifierNode {Code: '%s'})
			OPTIONAL MATCH (callExpressionNode)-[:AST_parentOf {RelationType: 'arguments'}]-(argumentNode {Type: 'Identifier'})
			RETURN callExpressionNode, argumentNode
		"""%(topExpressionNode['Id'], targetIdentifierCode)
		print("getTargetCallExpressionAndArg query: ", query)
		results = tx.run(query)
		for record in results:
			callExpressionNode = record['callExpressionNode']
			argumentNode = record['argumentNode']
			return (callExpressionNode, argumentNode)
		return None	
	

	def tagInit(poc, pocKey, pocElement, specification = None):
		"""
			@description Other than initializing the key elements for a construct, a "fulfilled" tag is added
			@description fulfilled == None is like bottom, meaning it's still in decision stage
			@description fulfilled == False/True denotes whether the match succeeds
			@param {object} poc: the map of poc flattened AST
			@param {str} pocKey: the key of the pocElement of poc to be init
			@param {object} pocElement: the object of the pocElement
			@param {object} specification: extra specification node if were to populate more entries
			@return {object}: initialized tag			
		"""	

		# initialize tag with False for literal items, 
		tag = {str(constantsModule.PreservedKeys.FULFILLED): None}
		for key, val in pocElement.items():
			if key not in constantsModule.PreservedKeys or key == 'root':
				if isinstance(val, list):
					tag[key] = [False if v not in poc['constructs'] else None for v in val]
				else:
					if val not in poc['constructs']:
						# if not a explorable property
						tag[key] = False
					else:
						# 'None' for children
						tag[key] = None
		if specification:
			for key, val in specification.items():
				tag[key] = val
		return tag

	def unitPocTagging(node, constructKey, tag):
		# print(f"pocTagging on {getCodeOf(tx, node)} with {tag} \n ({node})")
		# breakpoint()		
		query = """
			MATCH (node {Id: '%s'})
			SET node.%s = '%s'
			RETURN node
		"""%(node['Id'], constructKey, json.dumps(tag))
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results]		
		return res[0]

	def pocTagging(node, constructKey, tag):		
		# print(f"pocTagging on {getCodeOf(tx, node)} with {tag} \n ({node})")		
		# breakpoint()
		identicalObjs, scope = neo4jQueryUtilityModule.getIdenticalObjectInScope(tx, node)
		# print("identicalObjs of ", getCodeOf(tx, node), [[obj['Id'], obj['Location'], obj['Code']] for obj in identicalObjs])
		# breakpoint()
		for matchingNode in identicalObjs: # including itself
			ret = unitPocTagging(matchingNode, constructKey, tag)
			print('ret', ret)
			# print(f"unitPocTagging on {getCodeOf(tx, ret)} with {tag} ({ret})")
			if not ret:
				raise RuntimeError(f"POC tagging error on {node} with tag: {tag}")
			print(f"matchingNode: {matchingNode}")

	def contentCompare(key, node, construct):
		mapping = {'type': 'Type', 'name': 'Code', 'value': 'Value'}
		constructVal = str(construct[key])
		nodeVal = str(node[mapping[key]])
		print(f"key: {key}, constructVal: {constructVal}, nodeVal, {nodeVal}")
		if constructVal not in constantsModule.POC_PRESERVED:			
			# print(type(nodeVal), type(constructVal))
			# print(f"{nodeVal} == {constructVal}: {nodeVal == constructVal}")
			return nodeVal == constructVal
		else:
			# todo
			match constructVal:
				case 'PAYLOAD':					
					return True
				case 'LIBOBJ':
					return True
				case 'WILDCARD':
					return True
				case _:
					raise RuntimeError("Not yet implemented")
			
	def getProperties(node, constructKey):
		query = """
			MATCH (node {Id: '%s'})
			RETURN node
		"""%(node['Id'])
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results][0]	
		print("res: ", res)	
		return json.loads(res[constructKey]) if constructKey in res else None

	def getNodeWithASTRelationship(tx, node, relationship, direction="downward"):
		"""
			@param {tx} tx
			@param {object} the node to start grow from
			@param {str} AST relationship			
			@return {obj} node
		"""	
		if direction == "downward":
			query = """
				MATCH (cur {Id: '%s'})-[:AST_parentOf {RelationType: '%s'}]->(node)
				RETURN node
			"""%(node['Id'], relationship)
		else:
			query = """
				MATCH (cur {Id: '%s'})<-[:AST_parentOf {RelationType: '%s'}]-(node)
				RETURN node
			"""%(node['Id'], relationship)
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results][0]
		return res
	
	def getArgumentNode(tx, node, arg):
		"""
			@param {tx} tx
			@param {object} the node to start grow from
			@param {str} AST relationship			
			@return {obj} node
		"""	
		query = """
			MATCH (cur {Id: '%s'})-[:AST_parentOf {Arguments: '{"arg":%s}'}]->(node)
			RETURN node
		"""%(node['Id'], arg)
		res = []
		results = tx.run(query)					
		res = [record['node'] for record in results][0]		
		return res
	
	def getCodeMatchInScope(tx, code, scope):
		query = """
			MATCH (node)<-[:AST_parentOf*]-(scope {Id:'%s'})
			WHERE node.Code = '%s' OR node.Value = '%s'
			RETURN DISTINCT(node)
		"""%(scope['Id'], code, code)
		print(f"getCodeMatchInScope query: {query}")
		breakpoint()
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results]
		return res
	
	def getNodeFromTagName(tx, tag):
		query = """
			MATCH (node)
			WHERE node.%s IS NOT NULL
			RETURN node
		"""%(tag)
		print("getNodeFromTagName query", query)
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results]
		return res

	# To be tested
	def getPotentialNodeFromTaggedNode(tx, curr_construct, libObjScope, poc):
		# get member node tags
		res = set()
		for key, prop in curr_construct.items():
			# build search list, typically there's only one element, but for arguments there's multiple
			search_list = []
			if not isinstance(prop, list):
				if prop not in poc:
					continue
				else: 
					search_list.append(prop)
			if key == 'arguments':
				search_list += prop
			
			# iterate query through search list
			while len(search_list):
				key_from_search_list = search_list.pop()
				query = """
					MATCH (node)<-[:AST_parentOf|CFG_parentOf*]-(scope {Id:'%s'})
					WHERE node.%s IS NOT NULL
					MATCH (parent)-[:AST_parentOf]->(node)
					RETURN DISTINCT(parent)
				"""%(libObjScope['Id'], key_from_search_list)
				results = tx.run(query)			
				res.update([record['parent'] for record in results])
		return list(res)
			

		

		# add the parents of these node with these tags to candidate

		# return list of candidate ids

	
	def nodeMatching(poc, constructKey, node):
		"""
			@param {the flattened poc map} poc
			@param {str} the construct key to compare with
			@param {object} the node to compare with
			@return {bool} match or not
			@description  simply does matching between the given node and the construct, if the current node is unfilled, traverse downward				
			@description  invariant: the nodeMatching must return true or false given a node and would be correct is traverse in bottom up poc tree traversal fashion
		"""
		def property_invariance_check(props):
			boolean_collector = True
			if isinstance(props, dict): 
				for key, prop in props.items():					
					boolean_collector &= property_invariance_check(prop)
			elif isinstance(props, list):
				for prop in props:
					boolean_collector &= property_invariance_check(prop)
			elif props is None:
				return False
			elif props == True or props == False:				
				return props
			else:
				raise RuntimeError(f"not implemented case, {props}")
			return boolean_collector
			
		construct = poc['constructs'][constructKey] 
		props = getProperties(node, constructKey)
		if props is None:
			# tagInit 
			props = tagInit(poc, constructKey, construct)
		else:
			if props[constantsModule.PreservedKeys.FULFILLED] == True:
				return True
			if props[constantsModule.PreservedKeys.FULFILLED] == False:
				print(f"Visited, no match")
				return False

		# not visited before
		# if 'root' in props:
		# 	print("root found")
		# 	breakpoint()
		try:
			for key, prop in props.items():
				# root mark is solely for marking, not considered a part of content
				if key in constantsModule.PreservedKeys:
					continue

				# prop = False: non-explorable prop (ex: str), None: explorable prop, True: fulfilled
				if not isinstance(prop, list):	
					if prop == False:					
						if contentCompare(key, node, construct) == False:
							print("1 early halt on", key, node, construct)
							raise EarlyHaltException
						else:
							props[key] = True
					elif prop is None:
						# test if children has filled
						relationShipNode = getNodeWithASTRelationship(tx, node, key, direction="downward")
						match = nodeMatching(poc, construct[key], relationShipNode)						
						print("2 early halt on", key, node, construct)
						if match == False:
							print("here at fail AST matching")
							raise EarlyHaltException # Early halt, else continue on checking other stuffs
						else:
							props[key] = True
					else: # prop == True, meaning previous matches already tested
						continue
				else:
					for i in range(len(prop)):
						p = prop[i]
						if p == False:
							# This isn't some case we've seen: where p must be a non-explorable item
							# in some sense this case should have been avoided during POC generation?
							# ex: func(a, 'b')
							if contentCompare(key, node, construct) == False:
								print("1 early halt on", key, node, construct)
								raise EarlyHaltException
							else:
								props[i][key] = True
						elif p is None:
							# if 'root' in props and key == 'arguments':
							# 	breakpoint()
							if key == "arguments":
								relationShipNode = getArgumentNode(tx, node, i)
								match = nodeMatching(poc, construct[key][i], relationShipNode)						
								if match:
									props[key][i] = True
								else:
									raise EarlyHaltException
							else:
								raise RuntimeError(f"not implemented case, list with type {key}")
						else:
							continue
		except EarlyHaltException:
			# tag fulfill to false
			print(f"No match, early halted at {node}, {constructKey}")
			props[constantsModule.PreservedKeys.FULFILLED] = False
			pocTagging(node, constructKey, props)
			return False
		
		props[constantsModule.PreservedKeys.FULFILLED] = True
		if constantsModule.PreservedKeys.ROOT in props:
			props[constantsModule.PreservedKeys.ROOT] = True
		pocTagging(node, constructKey, props)
		# assertion: invariant, node matching should always be able to determine True or False once returned
		if not property_invariance_check(props):
			raise RuntimeError(f"Invariant not hold: {props}")
				
		return True

	try:
		# poc flattened tree generation
		if 'LIBOBJ' not in vuln_info['poc_str']:
			raise RuntimeError("poc_str format error")
		pocStrArr = [vuln_info['poc_str'].replace('LIBOBJ', 'LIBOBJ(' +  vuln_info['location'] + ')')]
		print("pocStrArr", pocStrArr)
		json_arg = json.dumps(pocStrArr)
		pocFlattenedJsonStr = subprocess.run(['node', 'engine/lib/jaw/parser/pocparser.js', json_arg], 
			stdout=subprocess.PIPE,
			stderr=subprocess.PIPE,  # optional: capture error output too
			text=True  # returns output as string, not bytes
		).stdout
		print('pocFlattenedJsonStr', pocFlattenedJsonStr)
		flatPoc = json.loads(pocFlattenedJsonStr)
		vuln_info['pocFlattened'] = flatPoc
		print("pocFlattened", flatPoc)

		# see if the callee sats the 
		if vuln_info['mod']:
			argIdCode = vuln_info['location']	
			# get the identifier and the CallExpression given module id (might have several) [(callExprNode, calleeNode) ...]
			res_getIdentifierAndExprFromArgCode = getIdentifierAndExprFromArgCode(tx, argIdCode)
			print("res_getIdentifierAndExprFromArgCode", res_getIdentifierAndExprFromArgCode)
			# filter out those matches that are not library Objects
			libObjectList = list(filter(lambda pair: islibraryObject(tx, pair[0], pair[1]), res_getIdentifierAndExprFromArgCode))
			print("libObjectList", libObjectList)
			vuln_info['libObjectList'] = [str(obj) if hasattr(obj, "__str__") else repr(obj) for obj in libObjectList]
		else:
			# suppose to get location object for non mod objects
			# - get top expr from the 'property' edge
			libObjectList = getObjectMatch(tx, vuln_info['location'])


		libObjScope = None
		root = []
		# match all provided poc and potential libobjs
		for poc in flatPoc:
			# operate on all libobj scope marked
			for pair in libObjectList:
				if vuln_info['mod']:
					libObj = pair[0] # libObj node
					libIdentNode = pair[1] # libObj node
				else:
					libObj = pair
				libObjScope = neo4jQueryUtilityModule.getScopeOf(tx, libObj)
				libkeys = set(poc['libkeys'])

				# From this scope, follow the search order
				# if the current key is also in libkeys, apply the tag on the libIdentNode
				# else just do the code search in scope as usual
				try:
					for lv, level_nodes in enumerate(poc['search_order']):
						for constuctKey in level_nodes:
							curr_construct = poc['constructs'][constuctKey]
							code = curr_construct['name'] if 'name' in curr_construct else curr_construct['value'] if 'value' in curr_construct else None
							# for leave nodes, code matching is required	
							print(f"code: {code}, curr_construct: {curr_construct}")						
							if code and libObjScope:								
								# matching for constantsModule.POC_PRESERVED node will be done in the parent node in nodeMatching()
								if code in constantsModule.POC_PRESERVED:
									continue 
								else:
									matching_nodes = getCodeMatchInScope(tx, code, libObjScope)
									print(f"codeMatchingNodes of {code}: {matching_nodes}")
							elif not code: # (not leaf nodes)
								# should do cypher query on the specific ids
								matching_nodes = getPotentialNodeFromTaggedNode(tx, curr_construct, libObjScope, poc['constructs'])
								print(f"potential matchingNodes for {curr_construct}: {matching_nodes}")
							else:
								print(f"conditions not implemented, halting: ", curr_construct)
								raise RuntimeError(f"conditions not implemented, halting: {curr_construct}")
							matching_res = [nodeMatching(poc, constuctKey, matchingNode) for matchingNode in matching_nodes]
							if not any(matching_res):
								print('matching_res', matching_res, 'matching_nodes', matching_nodes)
								raise EarlyHaltException({"curr_construct": curr_construct})
				except EarlyHaltException as e:
					print(f"Early halt due to none matching for construct", e)
					print("poc['constructs']", poc['constructs'])


				# root query: query if the special id of root exists
				root = getNodeFromTagName(tx, poc['root'])
				vuln_info['root'] = repr(root)

		if libObjScope:						
			debug_query = """
				MATCH p = (node)<-[:AST_parentOf*]-(libobjScope {Id:'%s'})
				RETURN p
			"""%(libObjScope['Id'])
			vuln_info['debug_query'] = debug_query
			print("debug query", debug_query)
			print("root", root)
		print('pocFlattenedJsonStr', pocFlattenedJsonStr)
		if root:
			print('root here')		
			argNodes = getNodeFromTagName(tx, poc['payloads'][0]) # temporary testing purpose, not accounting for multiple situations
			print("argNodes", argNodes)
			for argNode in argNodes:
				res.append({
					"t": get_ast_topmost(tx, argNode),
					"n": get_ast_parent(tx, argNode),
					"a": argNode
				})
			print("res", [[getCodeOf(tx, n)] for n in res[0].values()])
	except Exception as e:
		print(f"Exception threw at getSinkExpression", e)
		raise e
	
	return res	


# ----------------------------------------------------------------------- #
#			Main: Detection
# ----------------------------------------------------------------------- #

def run_traversals_simple(tx, vuln_info):
	"""
	@param {string} navigation_url: base url to test 
	@param {string} webpage_directory: path to save analyzer template
	@param {list} document_vars: fields in HTML forms accessbile by the 'document' DOM API
	@description query the graph database and finds the potential forgeable client-side requests
	@return {array} a list of candidate forgeable HTTP requests
	"""

	out = []
	document_props = []
	# @ID: Query Nr. 5
	# @Description: 
	#	Finds asynchronous HTTP requests (sinks) and associates a semantic type to them
	#	i.e., is any sink value traces back to the defined semantic types
	if MAIN_QUERY_ACTIVE:		
		# different kinds of call expressions (sinks)
		r1 = getSinkExpression(tx, vuln_info=vuln_info)
		
		request_storage = {}   # key: call_expression_id, value: structure of request url for that call expression
		
		# For cve sink...
		if r1:
			for call_expr in r1:
				n = call_expr['n'] # call expression
				a = call_expr['a'] # argument: Literal, Identifier, BinaryExpression, etc
				t = call_expr['t'] # top level expression statement
				print(f"[n, a, t]: n: {n}, a: {a}, t: {t}")
				request_fn = vuln_info['poc_str'] # temporary

				wrapper_node_top_expression = neo4jQueryUtilityModule.getChildsOf(tx, t) # returns all the child of a specific node
				logger.info(f"[debug] wrapper_node_top_expression: {wrapper_node_top_expression}")
				top_expression_code = neo4jQueryUtilityModule.getAdvancedCodeExpression(wrapper_node_top_expression)[0]
				logger.info(f"[debug] top_expression_code: {top_expression_code}")

				if 'function(' in top_expression_code:
					top_expression_code = jsbeautifier.beautify(top_expression_code)

				wrapper_node= neo4jQueryUtilityModule.getChildsOf(tx, a)
				ce = neo4jQueryUtilityModule.getAdvancedCodeExpression(wrapper_node)
				nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
				logger.info(f"[debug] ce: {ce}")
				request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
				for ident, ident_id in ce[2].items():
					logger.info(f"[debug] ident: {ident}, ident_id: {ident_id}")
					if ident in ce[0]:
						logger.info(f"[debug] varname: {ident}, rootContextNode: {t}")
						vals = DF._get_varname_value_from_context(tx, ident, t)
						request_storage[nid]['expected_values'][ident] = vals



		# path to store the general template file for WIN.LOC dependencies of all URLs			
		general_template_output_path = utilityModule.get_directory_without_last_part("/home/ian/BundlerResearch/JAW4C-JAW/data/test_program".rstrip('/'))
		general_template_output_pathname = os.path.join(general_template_output_path, "sinks.flows.out")

		# path to store all templates of the current URL
		template_output_pathname = os.path.join("/home/ian/BundlerResearch/JAW4C-JAW/data/test_program", "sink.flows.out")
		with open(general_template_output_pathname, 'a+') as gt_fd:
			with open(template_output_pathname, "w+") as fd:
				timestamp = _get_current_timestamp()
				sep = utilityModule.get_output_header_sep()
				sep_templates = utilityModule.get_output_subheader_sep()
				fd.write(sep)
				fd.write('[timestamp] generated on %s\n'%timestamp)
				fd.write(sep+'\n')
				fd.write('[*] NavigationURL: %s\n\n'%"tmp")

				for each_request_key in request_storage:
					node_id = _get_node_id_part(each_request_key) # node id of 'CallExpression' node
					location = _get_location_part(each_request_key)
					location = _get_line_of_location(location)
					request_fn = _get_function_name_part(each_request_key)

					program = request_storage[each_request_key]
					request_variable = program['endpoint_code']
					program_slices_keypair = program['expected_values']
					request_top_expression_code = program['top_expression']
					id_set = program['id_set']
					reachability_results = program['reachability']
					request_tags = []
					print_buffer = []

					endpoint_tags = _get_semantic_type(request_variable, 0, document_props, find_endpoint_tags=True)
					request_tags.extend(endpoint_tags)
					logger.info(f"endpoint_tags: {endpoint_tags}")
					logger.info(f"request_tags: {request_tags}")
					logger.info(f"request_storage: {request_storage}")

					counter = 1
					for each_identifier in program_slices_keypair.keys():
						program_slices = program_slices_keypair[each_identifier]
						logger.info(f"program slices: {program_slices}")
						num_slices = len(program_slices)
						
						if num_slices == 0: # if each_identifier can not be resolved locally, apply heuristics ##@TODO: check this throughly to eliminate non-relevant stuff!
							do_heuristic_search = True  # changed to false for typo3 crm
							if do_heuristic_search:
								identifier_heurisitc_values = getIdentifierLocalAndGlobalValues(tx, each_identifier)
								program_slices = getProgramSliceFormat(identifier_heurisitc_values)
								num_slices = len(program_slices)

						tags = _get_semantic_type(program_slices, num_slices, document_props)
						tags = _get_unique_list(tags)
						logger.info(f"unique tags: {tags}")
						request_tags.extend(tags)

						for i in range(num_slices):
							program_slice = program_slices[i]
							loc = _get_line_of_location(program_slice[3])
							code = program_slice[0]

							if 'function(' in code:
								code = jsbeautifier.beautify(code) # pretty print function calls

							c = None
							if i == 0 and each_identifier in code:

								a = '\n%s:%s variable=%s\n'%(counter, str(tags), each_identifier)
								counter = counter + 1
								b = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, b, c]
								else:
									print_buffer+= [a, b]

							else:
								a = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, c]
								else:
									print_buffer += [a]

					print_buffer = _get_orderd_unique_list(print_buffer) # remove duplicates, if any
					tag_set = _get_semantic_type_set(request_tags)
					logger.info(f"tag_set: {tag_set}")
					if not ( len(tag_set) == 1 and CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE in tag_set ):
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))


						gt_fd.write(sep_templates)
						gt_fd.write('[*] Tags: %s\n'%(str(tag_set)))
						gt_fd.write('[*] NodeId: %s\n'%str(id_set))
						gt_fd.write('[*] Location: %s\n'%location)
						gt_fd.write('[*] Function: %s\n'%request_fn)
						gt_fd.write('[*] Template: %s\n'%(request_variable))
						gt_fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))
						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
							gt_fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines
						gt_fd.write(sep_templates)
					else:
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))

						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines

	hashSymbol = "#"

	return out


def run_traversals(tx, vuln_info, navigation_url, webpage_directory, folder_name_of_url='xxx', document_vars=[]):
	"""
	@param {string} navigation_url: base url to test 
	@param {string} webpage_directory: path to save analyzer template
	@param {list} document_vars: fields in HTML forms accessbile by the 'document' DOM API
	@description query the graph database and finds the potential forgeable client-side requests
	@return {array} a list of candidate forgeable HTTP requests
	"""

	document_props = document_vars

	out = []

	# @ID: Query Nr. 5
	# @Description: 
	#	Finds asynchronous HTTP requests (sinks) and associates a semantic type to them
	#	i.e., is any sink value traces back to the defined semantic types
	if MAIN_QUERY_ACTIVE:		
		# different kinds of call expressions (sinks)
		r1 = getSinkExpression(tx, vuln_info=vuln_info)

		request_storage = {}   # key: call_expression_id, value: structure of request url for that call expression

		# For cve sink...
		if r1:
			for call_expr in r1:
				n = call_expr['n'] # call expression
				a = call_expr['a'] # argument: Literal, Identifier, BinaryExpression, etc
				t = call_expr['t'] # top level expression statement
				request_fn = vuln_info['poc_str'] # temporary

			wrapper_node_top_expression = neo4jQueryUtilityModule.getChildsOf(tx, t) # returns all the child of a specific node
			logger.info(f"[debug] wrapper_node_top_expression: {wrapper_node_top_expression}")
			top_expression_code = neo4jQueryUtilityModule.getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			logger.info(f"[debug] top_expression_code: {top_expression_code}")

			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= neo4jQueryUtilityModule.getChildsOf(tx, a)
			ce = neo4jQueryUtilityModule.getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			logger.info(f"[debug] nid: {nid}")
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				logger.info(f"[debug] ident: {ident}, ident_id: {ident_id}")
				if ident in ce[0]:
					logger.info(f"[debug] varname: {ident}, rootContextNode: {t}")
					# vals = getValueOfWithLocationChain(tx, ident, t)
					vals = DF._get_varname_value_from_context(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals



		# path to store the general template file for WIN.LOC dependencies of all URLs			
		general_template_output_path = utilityModule.get_directory_without_last_part(webpage_directory.rstrip('/'))
		general_template_output_pathname = os.path.join(general_template_output_path, "sinks.flows.out")

		# path to store all templates of the current URL
		template_output_pathname = os.path.join(webpage_directory, "sink.flows.out")
		vuln_info_pathname = os.path.join(webpage_directory, "vuln.out")
				
		with open(vuln_info_pathname, 'a') as vuln_fd:
			json.dump({navigation_url: vuln_info}, vuln_fd)
			vuln_fd.write('\n')			
		with open(general_template_output_pathname, 'a+') as gt_fd:
			with open(template_output_pathname, "w+") as fd:
				timestamp = _get_current_timestamp()
				sep = utilityModule.get_output_header_sep()
				sep_templates = utilityModule.get_output_subheader_sep()
				fd.write(sep)
				fd.write('[timestamp] generated on %s\n'%timestamp)
				fd.write(sep+'\n')
				fd.write('[*] NavigationURL: %s\n\n'%navigation_url)

				for each_request_key in request_storage:
					node_id = _get_node_id_part(each_request_key) # node id of 'CallExpression' node
					location = _get_location_part(each_request_key)
					location = _get_line_of_location(location)
					request_fn = _get_function_name_part(each_request_key)

					program = request_storage[each_request_key]
					request_variable = program['endpoint_code']
					program_slices_keypair = program['expected_values']
					request_top_expression_code = program['top_expression']
					id_set = program['id_set']
					reachability_results = program['reachability']
					request_tags = []
					print_buffer = []

					endpoint_tags = _get_semantic_type(request_variable, 0, document_props, find_endpoint_tags=True)
					request_tags.extend(endpoint_tags)
					logger.info(f"endpoint_tags: {endpoint_tags}")
					logger.info(f"request_tags: {request_tags}")
					logger.info(f"request_storage: {request_storage}")

					counter = 1
					for each_identifier in program_slices_keypair.keys():
						program_slices = program_slices_keypair[each_identifier]
						logger.info(f"program slices: {program_slices}")
						num_slices = len(program_slices)
						
						if num_slices == 0: # if each_identifier can not be resolved locally, apply heuristics ##@TODO: check this throughly to eliminate non-relevant stuff!
							do_heuristic_search = True  # changed to false for typo3 crm
							if do_heuristic_search:
								identifier_heurisitc_values = getIdentifierLocalAndGlobalValues(tx, each_identifier)
								program_slices = getProgramSliceFormat(identifier_heurisitc_values)
								num_slices = len(program_slices)

						tags = _get_semantic_type(program_slices, num_slices, document_props)
						tags = _get_unique_list(tags)
						logger.info(f"unique tags: {tags}")
						request_tags.extend(tags)

						for i in range(num_slices):
							program_slice = program_slices[i]
							loc = _get_line_of_location(program_slice[3])
							code = program_slice[0]

							if 'function(' in code:
								code = jsbeautifier.beautify(code) # pretty print function calls

							c = None
							if i == 0 and each_identifier in code:

								a = '\n%s:%s variable=%s\n'%(counter, str(tags), each_identifier)
								counter = counter + 1
								b = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, b, c]
								else:
									print_buffer+= [a, b]

							else:
								a = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, c]
								else:
									print_buffer += [a]

					print_buffer = _get_orderd_unique_list(print_buffer) # remove duplicates, if any
					tag_set = _get_semantic_type_set(request_tags)
					logger.info(f"tag_set: {tag_set}")
					if not ( len(tag_set) == 1 and CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE in tag_set ):
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))


						gt_fd.write(sep_templates)
						gt_fd.write('[*] NavigationURL: %s\n'%navigation_url)
						gt_fd.write('[*] Hash: %s\n'%folder_name_of_url)
						gt_fd.write('[*] Tags: %s\n'%(str(tag_set)))
						gt_fd.write('[*] NodeId: %s\n'%str(id_set))
						gt_fd.write('[*] Location: %s\n'%location)
						gt_fd.write('[*] Function: %s\n'%request_fn)
						gt_fd.write('[*] Template: %s\n'%(request_variable))
						gt_fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))
						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
							gt_fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines
						gt_fd.write(sep_templates)
					else:
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))

						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines

	hashSymbol = "#"

	return out





	