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
	---------------
	Neo4j utility functions

	Usage:
	---------------
	> import hpg_neo4j.query_utility as neo4jQueryUtilityModule


"""
from functools import lru_cache
from analyses.general import data_flow
import constants as constantsModule
from utils.logging import logger
import pyjson5

# -------------------------------------------------------------------------- #
#		Cycle Detection for Alias Analysis
# -------------------------------------------------------------------------- #
# Unlike taint analysis which uses a stack for variable names (allowing same
# name in different scopes), alias analysis uses a set for node IDs (globally
# unique, so no need to revisit same node within a query).

alias_visited_set = set()

def alias_visited_has(node_id):
	"""
	Check if a node ID has been visited in current alias analysis query.
	@param node_id: string node ID
	@return: boolean
	"""
	return node_id in alias_visited_set

def alias_visited_add(node_id):
	"""
	Mark a node ID as visited in current alias analysis query.
	@param node_id: string node ID
	"""
	alias_visited_set.add(node_id)

def alias_visited_clear():
	"""
	Clear the visited set (call at start of each top-level alias query).
	"""
	global alias_visited_set
	alias_visited_set = set()

def alias_visited_remove(node_id):
	"""
	Unmark a node ID as visited in current alias analysis query.
	Used when backtracking in recursion.
	@param node_id: string node ID
	"""
	alias_visited_set.remove(node_id)
# -------------------------------------------------------------------------- #
#		Neo4j Utility Queries
# -------------------------------------------------------------------------- #

def get_node_by_id(tx, node_id):
	"""
	@param {neo4j-pointer} tx
	@param {id} node id
	@return node
	"""

	query = """
	MATCH (n {Id: '%s'})
	RETURN n
	"""%(node_id)

	results = tx.run(query)
	for record in results:
		n = record['n']
		return n

	return None


# -------------------------------------------------------------------------- #
#		Caching for get_ast_topmost
# -------------------------------------------------------------------------- #
# Cache mapping node ID -> topmost CFG-level ancestor node
_ast_topmost_cache = {}

def ast_topmost_cache_clear():
	"""Clear the get_ast_topmost cache. Call between analysis runs or when graph changes."""
	global _ast_topmost_cache
	_ast_topmost_cache = {}

def ast_topmost_cache_size():
	"""Return current cache size for debugging."""
	return len(_ast_topmost_cache)

# Module-level constant: computed once at import time, using frozenset for O(1) lookup
_CFG_LEVEL_STATEMENTS_SET = frozenset([
	"EmptyStatement",
	"DebuggerStatement",
	"ExpressionStatement",
	"VariableDeclaration",
	"ReturnStatement",
	"LabeledStatement",
	"BreakStatement",
	"ContinueStatement",
	"IfStatement",
	"SwitchStatement",
	"WhileStatement",
	"DoWhileStatement",
	"ForStatement",
	"ForInStatement",
	"ThrowStatement",
	"TryStatement",
	"WithStatement",
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
])

def get_cfg_level_nodes_for_statements():
	"""Returns list for backward compatibility with existing code."""
	return list(_CFG_LEVEL_STATEMENTS_SET)


def get_ast_parent(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return immediate parent of an AST node
	"""

	query = """
	MATCH (parent)-[:AST_parentOf]->(child {Id: '%s'})
	RETURN parent
	"""%(node['Id'])

	results = tx.run(query)
	for record in results:
		child = record['parent']
		return child

	return None

def getTopMostProgramPath(tx, node):
		"""
		Get the topmost Program node path for a given node.
		@param {pointer} tx: neo4j transaction pointer
		@param {object} node: AST node
		@return {list} list of nodes from the given node up to the Program node
		"""
		query = """
			MATCH (n {Id: '%s'})<-[:AST_parentOf*]-(topNode {Type: 'Program'})
			RETURN topNode
			LIMIT 1
		""" % (node['Id'])
		results = tx.run(query)
		for record in results:
			return record['topNode']['Value'] if 'Value' in record['topNode'] else None
		return None

def getTopMostProgramPathById(tx, id):
		"""
		Get the topmost Program node path for a given node.
		@param {pointer} tx: neo4j transaction pointer
		@param {object} node: AST node
		@return {list} list of nodes from the given node up to the Program node
		"""
		query = """
			MATCH (n {Id: '%s'})<-[:AST_parentOf*]-(topNode {Type: 'Program'})
			RETURN topNode
			LIMIT 1
		""" % (id)
		results = tx.run(query)
		for record in results:
			return record['topNode']['Value'] if 'Value' in record['topNode'] else None
		return None

def get_ast_topmost(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return topmost parent of an AST node
	"""
	node_id = node["Id"]

	# Check cache first
	if node_id in _ast_topmost_cache:
		return _ast_topmost_cache[node_id]

	# Use module-level frozenset for O(1) lookup instead of creating list each call
	if "Type" in node:
		node_type = node["Type"]
	else:
		node = get_node_by_id(tx, node_id) # re-assign the input parameter here
		node_type = node["Type"]

	if node_type in _CFG_LEVEL_STATEMENTS_SET:
		_ast_topmost_cache[node_id] = node
		return node


	done = False
	iterator = node
	parent = None  # fix unbound variable warning
	while not done:

		parent = get_ast_parent(tx, iterator)
		if parent is None:
			done = True
			_ast_topmost_cache[node_id] = iterator
			return iterator

		if parent['Type'] in _CFG_LEVEL_STATEMENTS_SET:
			done = True
			break
		else:
			iterator = parent # loop

	_ast_topmost_cache[node_id] = parent
	return parent



def get_code_expression(wrapper_node, is_argument = False, relation_type='', short_form=True):

	"""
	@param {dict} wrapper_node
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = {}
	literals = []

	node = wrapper_node['node']
	children = wrapper_node['children']
	
	if 'Type' in node:
		ntype = node['Type']
	else:
		ntype = ''

	if ntype == 'Literal':
		value =  node['Value']
		raw = node['Raw']
		if value:
			if (value == '{}') and (raw.strip('\'').strip("\"").strip() != value):
				value = "\"%s\""%raw
				literals.append(value)
				return [value, literals, idents]
			else:
				value = "\"%s\""%value
				literals.append(value)
				return [value, literals, idents]
		else:
			return ['\"\"', literals, idents]

	elif ntype == 'Identifier':
		value =  node['Code']
		if value:
			nid = str(node['Id'])
			idents[value] = nid
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'ThisExpression':
		nid = str(node['Id'])
		idents['ThisExpression']= nid # add ThisStatment to Idents for Pointer Resolution
		return ['this', literals, idents]


	elif ntype == 'LogicalExpression':

		opertor = node['Code']
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]
		
	elif ntype == 'IfStatement':

		if len(children) == 2:
			[consequent, lits2, ids2] = get_code_expression(children[0])
			[test, lits1, ids1] = get_code_expression(children[1])
			value = 'if(%s){ %s }'%(test, consequent)

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			return [value, literals, idents]
		elif len(children) == 3:
			[alternate, lits1, ids1] = get_code_expression(children[0])
			[consequent, lits2, ids2] = get_code_expression(children[1])
			[test, lits3, ids3] = get_code_expression(children[2])
			value = 'if(%s){ %s } else{ %s }'%(test, consequent, alternate)

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			return [value, literals, idents]

	elif ntype == 'ConditionalExpression':
		
		[alternate, lits1, ids1] = get_code_expression(children[0])
		[consequent, lits2, ids2] = get_code_expression(children[1])
		[test, lits3, ids3] = get_code_expression(children[2])
		value = '(%s)? %s: %s'%(test, consequent, alternate)

		literals.extend(lits1)
		literals.extend(lits2)
		literals.extend(lits3)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		idents = {**idents, **ids3}

		return [value, literals, idents]

	elif ntype == 'NewExpression':
		args = [];
		callee = ''
		for j in range(len(children)):
			ch = children[j]
			[element, lits1, ids1] = get_code_expression(ch)
			literals.extend(lits1)
			idents = {**idents, **ids1}
			if j == len(children) - 1:
				callee = element
			else:
				args.append(element)

		value = 'new '+ callee + '(' + ','.join(args[::-1])  + ')'
		return [value, literals, idents]

	elif ntype == "Property":
		[key, lits1, ids1] = get_code_expression(children[1])
		[value, lits2, ids2] = get_code_expression(children[0])
		# idents = {**idents, **ids1} ### do not consider dictionary keys for taint tracking/ resolution
		idents = {**idents, **ids2}
		literals.extend(lits1)
		literals.extend(lits2)
		value = ["%s: %s"%(str(key), str(value)), literals, idents]
		return [value, literals, idents]

	elif ntype == 'ObjectExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= get_code_expression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '{ '  + ', '.join(tempt) + ' }'
			return [value, literals, idents]
		else:
			return ['{ }', literals, idents]

	elif ntype == 'ArrayExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= get_code_expression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '[ '  + ', '.join(tempt) + ' ]'
			return [value, literals, idents]
		else:
			return ['[ ]', literals, idents]

	elif ntype == 'CallExpression':

		if len(children) == 0: # call with no argument 
			[callee, lits1, ids1] = get_code_expression(children[0])
			args = ''
			value = str(callee) + '(' +  args + ')'
			return [value, literals, idents]

		else:
			args = []
			callee = ''
			for i in range(len(children)):
				ch = children[i]
				[expr_i, lits_i, ids_i] = get_code_expression(ch)
				idents = {**idents, **ids_i}
				literals.extend(lits_i)
				if i == len(children)-1:
					# this is the name of the caller
					if(isinstance(expr_i, list)):
						callee = expr_i[0]
					else:
						callee = expr_i
				else:
					# this is a call argument
					if(isinstance(expr_i, list)):
						args.append(expr_i[0])
					else:
						args.append(expr_i)

			args = args[::-1] # reverse the args list order 
			value = str(callee) + '(' + ', '.join(args) + ')'
			return [value, literals, idents]

	elif ntype == 'UpdateExpression':
		operator = node['Code']
		ch = children[0]
		[arg, lits, ids] = get_code_expression(ch)
		idents = {**idents, **ids}
		literals.extend(lits)
		value = arg+ operator
		return [value, literals, idents]

	elif ntype == 'VariableDeclaration':
		# can also add node['Kind'] to the return value (e.g., var, let, const)
		kind = node['Kind']
		declarations = []
		for ch in children:
			[expr_i, lits_i, ids_i] = get_code_expression(ch)
			idents = {**idents, **ids_i}
			literals.extend(lits_i)

			if(isinstance(expr_i, list)):
				code = expr_i[0]
			else:
				code = expr_i
			code = expr_i
			declarations.append(code)

		declarations = declarations[::-1]
		value = str(kind) + ' ' + ', '.join(declarations)
		return [value, literals, idents]

	elif ntype == 'VariableDeclarator':

		if len(children) == 1:
			[left, lits, ids] = get_code_expression(children[0])
			literals.extend(lits)
			idents = {**idents, **ids}
			value = left;
			return [value, literals, idents]
		else:
			opertor = node['Code']
			[right, lits1, ids1] = get_code_expression(children[0])
			[left, lits2, ids2] = get_code_expression(children[1])
			value = str(left) + ' ' + opertor + ' ' + str(right)
			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
		return [value, literals, idents]


	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression':
		opertor = node['Code']
			
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])

		if node['Computed'] == 'true' or right in lits1: # if right is literal
			value = str(left) + '[' + str(right) + ']'
		else: # right is identifer or compound member expr
			value = str(left) + opertor + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'CatchClause':
		args = []
		body = ''
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[body, lits_i, ids_i] = get_code_expression(ch)
			else:
				[arg_i, lits_i, ids_i] = get_code_expression(ch)
				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'catch( ' + ','.join(args) + ' ){ %s'%(body) + ' }'
		return [value, literals, idents]	
		
	elif ntype == 'TryStatement':
		if len(children) == 2:

			[catch_block, lits2, ids2] = get_code_expression(children[0])
			[try_block, lits1, ids1] = get_code_expression(children[1])

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			value = 'try{ %s } %s'%(try_block, catch_block)
			return [value, literals, idents] 

		elif len(children) == 3:
			[finally_block, lits3, ids3] = get_code_expression(children[0])
			[catch_block, lits2, ids2] = get_code_expression(children[1])
			[try_block, lits1, ids1] = get_code_expression(children[2])

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			value = 'try{ %s } %s finally{ %s }'%(try_block, catch_block, finally_block)
			return [value, literals, idents] 

	elif ntype == 'FunctionExpression':
		args = []
		block = '...'
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[block, lits_i, ids_i] = get_code_expression(ch)	
			else:
				[arg_i, lits_i, ids_i] = get_code_expression(ch)

				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function(' + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	

	elif ntype == 'FunctionDeclaration':
		args = []
		function_name = 'function_name'
		block = '...'
		n_childs = len(children)
		for i in range(n_childs):
			ch = children[i]
			if ch['node']['Type'] == 'BlockStatement':
				if not short_form:
					[block, lits_i, ids_i] = get_code_expression(ch)	
			else:
				if i == n_childs-1: # function name
					[fname, lits_i, ids_i] = get_code_expression(ch) 
					function_name = fname
				else:
					[arg_i, lits_i, ids_i] = get_code_expression(ch)
					args.append(arg_i)


				literals.extend(lits_i)
				idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function %s('%(function_name) + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	

	else:
		expr = []
		for childWrapperNode in children:
			result = get_code_expression(childWrapperNode)
			currentExpr = result[0]
			lits = result[1]
			ids = result[2]
			expr.append(currentExpr)
			literals.extend(lits)
			idents = {**idents, **ids}

		expr = expr[::-1]
		if is_argument:
			return [ ','.join(expr), literals, idents]
		else:
			return [ '; '.join(expr), literals, idents]



def getChildsOf(tx, node, relation_type=''):
	range_obj = pyjson5.loads(node['Range'])
	# logger.debug("Getting childs of node Id: %s, relation_type: %s"%(node['Id'], relation_type))
	"""
	@param {pointer} tx
	@param {node object} node
	@param {string} relation_type
	@return {dict}: wrapperNode= a dict containing the parse tree with its root set to input node, format: {'node': node, 'children': [child_node1, child_node2, ...]}
	"""

	outNode =  {'node': node, 'children': []} # wrapper around neo4j node
	nodeId = node['Id']
	if relation_type != '':
		query= """
		MATCH (root { Id: '%s' })-[:AST_parentOf { RelationType: '%s'}]->(child) RETURN collect(distinct child) AS resultset
		"""%(nodeId, relation_type)
	else:
		query= """
			MATCH (root { Id: '%s' })-[:AST_parentOf]->(child) RETURN collect(distinct child) AS resultset
			"""%(nodeId)

	results = tx.run(query)
	for item in results:
		childNodes = item['resultset']
		for childNode in childNodes:
			outNode['children'].append(getChildsOf(tx, childNode))
	return outNode


def getChildsOfAndCodeExpression(tx, node, relationtype='', linelimit=10, rangelimit = 1500):
	range_obj = pyjson5.loads(node['Range'])
	location_obj = pyjson5.loads(node['Location'])
	if (int(range_obj[1]) - int(range_obj[0])) >= rangelimit or (int(location_obj['start']['line']) - int(location_obj['end']['line'])) >= linelimit:
		return [f'{node["Type"]} at ({location_obj["start"]["line"]},{location_obj["start"]["column"]}) - ({location_obj["end"]["line"]}, {location_obj["end"]["column"]})'], {'node': node, 'children': []}
	tree = getChildsOf(tx, node, relation_type=relationtype)
	ex = get_code_expression(tree)	
	return ex, tree


def getChildByRelationType(tx, node, relation_type):
	"""
	Get a single child node by AST relation type.
	This is the reverse of get_ast_parent for a specific relation type.

	@param {pointer} tx: neo4j transaction pointer
	@param {node object} node: parent node
	@param {string} relation_type: the RelationType of the AST_parentOf edge (e.g., 'body', 'params', 'init')
	@return {node object or None}: the child node with the specified relation type, or None if not found
	@example:
		# Get the body of a function definition
		func_body = getChildByRelationType(tx, func_def_node, 'body')
		# Get the init value of a variable declarator
		init_node = getChildByRelationType(tx, var_declarator, 'init')
	"""
	query = """
	MATCH (parent {Id: '%s'})-[:AST_parentOf {RelationType: '%s'}]->(child)
	RETURN child
	LIMIT 1
	""" % (node['Id'], relation_type)

	results = tx.run(query)
	for record in results:
		return record['child']

	return None


@lru_cache(maxsize=128, typed=False)
def _get_initial_decl_via_cfg(tx, use_id, name):
	query = """
	WITH "%s" AS useId, "%s" AS name

	// Get identifier matching the same name
	CALL db.index.fulltext.queryNodes("ast_code", name)
			YIELD node AS initialDeclarationIdentifierNode

	// From current Expression Node, find the dependency parent nodes that is declaration
	MATCH (topMostExprNode:ASTNode {Id: useId})

	// RETURN topMostExprNode
	MATCH p = (topMostExprNode)<-[:PDG_parentOf*0..]-(declarationNode)
	WHERE declarationNode.Type IN [
			'VariableDeclaration','FunctionDeclaration','ClassDeclaration',
			'ImportDeclaration','ExportNamedDeclaration','ExportDefaultDeclaration',
			'ExportAllDeclaration','CatchClause'
	]

	WITH p, declarationNode, initialDeclarationIdentifierNode
	MATCH (declarationNode)-[:AST_parentOf*0..]->(med:ASTNode)-[:AST_parentOf {RelationType:'id'}]->(initialDeclarationIdentifierNode:ASTNode {Type:'Identifier'})
	WITH length(p) as depth, declarationNode, initialDeclarationIdentifierNode
	ORDER BY length(p) ASC LIMIT 1

	RETURN declarationNode, initialDeclarationIdentifierNode, depth
	"""%(use_id, name)

	print("[CFG] initial declaration query:", query)
	results = tx.run(query)
	for record in results:
		return record['declarationNode'], record['initialDeclarationIdentifierNode'], record['depth']
	return None

@lru_cache(maxsize=128, typed=False)
def _get_initial_decl_via_callgraph(tx, use_id, name):
	query = """
	WITH "%s" AS useId, "%s" AS name
	MATCH (topMostExprNode:ASTNode {Id: useId})
	CALL db.index.fulltext.queryNodes("ast_code", name) YIELD node as currIdentifierNode, score
	// Find the closest CallExpression within topMostExpr and above currIdentifier with name matched
	MATCH p1 = ((callExpression {Type: 'CallExpression'})-[:AST_parentOf*]->(currIdentifierNode {Type: 'Identifier', Code: name}))
	MATCH (topMostExprNode {Id: useId})-[:AST_parentOf*]->(callExpression)
	WITH callExpression, length(p1) AS depth, name
	ORDER BY depth ASC
	LIMIT 1

	// Find the closest FunctionDeclaration with name defined
	CALL db.index.fulltext.queryNodes("ast_code", name) YIELD node as initialDeclarationIdentifierNode, score
	MATCH p2 = (callExpression)-[:CG_parentOf]->(declarationNode),
	(declarationNode)-[:AST_parentOf*0..]->(med)
	,(med)-[:AST_parentOf {RelationType:'id'}]->(initialDeclarationIdentifierNode {Type: 'Identifier', Code: name})
	WHERE declarationNode.Type IN [
		'VariableDeclaration','FunctionDeclaration','ClassDeclaration',
		'ImportDeclaration','ExportNamedDeclaration','ExportDefaultDeclaration',
		'ExportAllDeclaration','CatchClause'
	]
	RETURN declarationNode, initialDeclarationIdentifierNode, length(p2) AS depth
	ORDER BY depth ASC
	LIMIT 1	"""%(use_id, name)
	print("[CallGraph] initial declaration query:", query)
	results = tx.run(query)
	for record in results:
		return record['declarationNode'], record['initialDeclarationIdentifierNode'], record['depth']
	return None

@lru_cache(maxsize=128, typed=False)
def _get_initial_decl_via_params(tx, use_id, name):
	query = """
	WITH "%s" AS useId, "%s" AS name
	MATCH (topMostExprNode:ASTNode {Id: useId})
	CALL db.index.fulltext.queryNodes("ast_code", name) YIELD node as initialDeclarationIdentifierNode, score
	MATCH p3 = (topMostExprNode {Id: useId})<-[:AST_parentOf*0..]-(declarationNode)
	WHERE declarationNode.Type IN ['ArrowFunctionExpression','FunctionDeclaration','MethodDefinition']
	MATCH (declarationNode)-[:AST_parentOf {RelationType:'params'}]->(initialDeclarationIdentifierNode {Code: name, Type: 'Identifier'})
	RETURN declarationNode, initialDeclarationIdentifierNode, length(p3) AS depth
	ORDER BY depth ASC
	LIMIT 1
	"""%(use_id, name)
	print("[Params] initial declaration query:", query)
	results = tx.run(query)
	for record in results:
		return record['declarationNode'], record['initialDeclarationIdentifierNode'], record['depth']
	return None

@lru_cache(maxsize=128, typed=False)
def _get_initial_decl_via_assignment(tx, use_id, name):
	query = """
	WITH "%s" AS useId, "%s" AS name
	MATCH (topMostExprNode:ASTNode {Id: useId})
	CALL db.index.fulltext.queryNodes("ast_code", name) YIELD node as initialDeclarationIdentifierNode, score
	MATCH p3 = ((topMostExprNode)<-[:PDG_parentOf*0..]-(declarationNode {Type: 'ExpressionStatement'}))

	WITH topMostExprNode, declarationNode, initialDeclarationIdentifierNode, p3
	MATCH p4 = (declarationNode)-[:AST_parentOf*]->(med {Type: 'AssignmentExpression'})
			-[:AST_parentOf {RelationType:'left'}]->(initialDeclarationIdentifierNode {Type: 'Identifier'})
	RETURN declarationNode, initialDeclarationIdentifierNode, length(p4) + length(p3) AS depth
	ORDER BY depth ASC
	LIMIT 1
	"""%(use_id, name)
	print("[Assignment] initial declaration query:", query)
	results = tx.run(query)
	for record in results:
		return record['declarationNode'], record['initialDeclarationIdentifierNode'], record['depth']
	return None


def getInitialDeclaration(tx, node, cache = {}):
	"""
	@param {pointer} tx
	@param {node object} node
	@return {node object} returns the initial declaration expression and the initial identifier node
	"""	
	print(f"getInitialDeclaration on {node}")
	if node['Id'] in cache:
		return cache[node['Id']]
	top_most_expr = get_ast_topmost(tx, node)
	print("topmostexpr: ", top_most_expr)

	query_functions = (
		_get_initial_decl_via_cfg,
		_get_initial_decl_via_callgraph,
		_get_initial_decl_via_params,
		_get_initial_decl_via_assignment,
	)

	candidates = []
	for query_fn in query_functions:
		result = query_fn(tx, top_most_expr['Id'], node['Code'])		
		if result:
			candidates.append(result)

	if candidates:
		declarationNode, initialDeclarationIdentifierNode, _ = min(
			candidates,
			key=lambda item: item[2] if item[2] is not None else float('inf')
		)
		ans = [declarationNode, initialDeclarationIdentifierNode]
	else:
		ans = [top_most_expr, node] # if not found, return the top most expression as initial seen scope

	cache[node['Id']] = ans
	return ans

# def getIdentifierLiteralScopeOf(tx, node):
# 	"""
# 	@param {pointer} tx
# 	@param {node object} node
# 	@return {node object} returns the scope node of this node 
# 	"""
# 	print("getIdentifierLiteralScopeOf call on", node)
# 	[initialDeclNode, idNode] = getInitialDeclaration(tx, node)
# 	query = """
# 		MATCH (node {Id: '%s'})<-[:CFG_parentOf|AST_parentOf*0..1]-(scopeNode)
# 		WHERE scopeNode.Type IN ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'Program', "BlockStatement"]
# 		RETURN DISTINCT(scopeNode)
# 	"""%(initialDeclNode['Id'])
# 	# print("query", query)
# 	results = tx.run(query)
# 	for record in results:
# 		# print(record)		
# 		scopeNode = record['scopeNode']
# 		return scopeNode
# 	return None

@lru_cache(maxsize=128, typed=False)
def getScopeOf(tx, node):
	"""
	# Improved version from JAW
	@param {pointer} tx
	@param {node object} node
	@return {node object} returns the scope node of this node 
	"""
	top_expression = get_ast_topmost(tx, {'Id': node['Id']})
	query = """
		WITH '%s' as id
		MATCH (leaf:ASTNode {Id: id})

		// Nearest function-like ancestor or Program
		CALL {
		WITH leaf
		MATCH p = (owner)
					-[:AST_parentOf*0..]->(leaf)
		WHERE owner.Type IN [
			'FunctionExpression','FunctionDeclaration','ArrowFunctionExpression',
			'MethodDefinition','Function','Program'
		]
		RETURN owner, length(p) AS d
		ORDER BY d ASC
		LIMIT 1
		}

		OPTIONAL MATCH (owner)-[:AST_parentOf {RelationType:'id'}]->(fname:ASTNode {Type:'Identifier'})
		RETURN owner AS block_node
	"""%(top_expression['Id'])
	print("getScopeOf query", query)
	results = tx.run(query)
	for record in results:
		# print(record)		
		scopeNode = record['block_node']
		return scopeNode
	return None



def getRange(node):		
	range_str = "".join(filter(lambda char: char not in "[]", node['Range']))
	return list(map(int, range_str.split(',')))


# def getScopeOf(tx, node, scopeCache = {}):		
# 	def getAllIdentifierNodes(tx, node):
# 		query = """
# 		MATCH (IdNode {Type: 'Identifier'})<-[:AST_parentOf*]-(node {Id: '%s'})
# 		RETURN IdNode
# 		"""%(node['Id'])
# 		res = []
# 		results = tx.run(query)			
# 		res = [record['IdNode'] for record in results]
# 		return res

# 	if node['Id'] in scopeCache:
# 		return scopeCache[node['Id']]
# 	if node['Type'] == 'Identifier' or node['Type'] == 'Literal':
# 		IdNodes = [node]
# 	else:
# 		IdNodes = getAllIdentifierNodes(tx, node)		
# 	def get_or_compute_scope(idnode):
# 		return scopeCache.setdefault(idnode['Id'], getIdentifierLiteralScopeOf(tx, idnode))
# 	scopeNodes = [get_or_compute_scope(idnode) for idnode in IdNodes]
# 	scope = max(scopeNodes, key=lambda x: getRange(x)[0])  # find the tightest scope					
# 	return scope


def getAssignee(tx, curIdentifierNode, topmost = None):
	"""
		@param {pointer} tx
		@param {node object} the node to get assignee for, shoule be a top-most expression
		@return {node object}: the node object of the assigned identifier variable
				None: if nothing is found
	"""	
	# look for the right expression to evaluate on
	if not topmost:
		topmost = getScopeOf(tx, curIdentifierNode)	
	query = """
		MATCH (curIdentifierNode {Id: '%s'})<-[:AST_parentOf*]-(assignExprNode)<-[:AST_parentOf*0..]-(topMostNode {Id: '%s'})
		WHERE assignExprNode.Type IN ['VariableDeclarator', 'AssignmentExpression']
		RETURN assignExprNode
	"""%(curIdentifierNode['Id'], topmost['Id'])
	# print("scope query", query)
	results = tx.run(query)
	node = None
	for record in results:
		node = record['assignExprNode']		
	if not node and topmost['Type'] in ['VariableDeclarator', 'AssignmentExpression']:
		node = topmost

	if node:
		if node['Type'] == "VariableDeclarator":
			print("Here at VariableDeclarator", node)
			query = """
				MATCH (node {Id: '%s'})-[:AST_parentOf {RelationType: 'id'}]->(assigneeNode {Type: 'Identifier'})
					,(node {Id: '%s'})-[:AST_parentOf {RelationType: 'init'}]->(med)-[:AST_parentOf*0..]->(curNode {Id: '%s'})
				RETURN assigneeNode
			"""%(node['Id'], node['Id'], curIdentifierNode['Id'])
		elif node['Type'] == "AssignmentExpression":
			# print("Here at AssignmentExpression")
			query = """
				MATCH (node {Id: '%s'})-[:AST_parentOf {RelationType: 'left'}]->(assigneeNode {Type: 'Identifier'})
					,(node {Id: '%s'})-[:AST_parentOf {RelationType: 'right'}]->(med)-[:AST_parentOf*0..]->(curNode {Id: '%s'})
				RETURN assigneeNode
			"""%(node['Id'], node['Id'], curIdentifierNode['Id'])
		else:
			return None
		# print(query)
		results = tx.run(query)
		for record in results:
			assigneeNode = record['assigneeNode']
			return assigneeNode
	return None
	
def getFirstLeftAssignmentOfNode(tx, node, scope, start = None):
	if not start:
		query = """		
			MATCH p = (node {Id: '%s'})<-[:AST_parentOf*0..]-(med)<-[:AST_parentOf {RelationType: 'left'}]-(assignmentNode {Type: 'AssignmentExpression'})
				<-[:AST_parentOf|CFG_parentOf*]-(scope {Id: '%s'})		
			WITH assignmentNode, length(p) as depth
			RETURN assignmentNode
			ORDER BY depth ASC LIMIT 1 		
		"""%(node['Id'], scope['Id'])
	else:
		query = """		
			MATCH p = (node {Id: '%s'})<-[:AST_parentOf*0..]-(med)<-[:AST_parentOf {RelationType: 'left'}]-(assignmentNode {Type: 'AssignmentExpression'})
				<-[:AST_parentOf|CFG_parentOf*]-(scope {Id: '%s'})		
			WITH %s AS startFrom, assignmentNode, toInteger(split(replace(assignmentNode.Range, "[", ""), ",")[0]) as startPos, length(p) as depth
			WHERE startFrom <= startPos 
			RETURN assignmentNode
			ORDER BY depth ASC LIMIT 1 		
		"""%(node['Id'], scope['Id'], start)
	# print("getFirstLeftAssignmentOfIdentifier query", query)
	res = []
	results = tx.run(query)			
	res = [record['assignmentNode'] for record in results]
	return res		


def getIdenticalIdentifierObjectInScope(tx, node, scope = None):
	"""
		@param {pointer} tx
		@param {node object} the identifier node to look for identical object for
		@return {[node object]}: a list of identical object found in the same scope				
	"""	
	# match all identifier match in the scope
	if(node['Type'] != 'Identifier'):
		print("Calling getIdenticalIdentifierObjectInScope with node not with type 'Identifier'")
		raise Exception()
	def _rec(tx, node, scope = None):
		if scope == None:
			scope = getScopeOf(tx, node)
		query = """
			WITH  "%s" as useId, "%s" as name
			MATCH (scope:ASTNode {Id: useId})
			CALL db.index.fulltext.queryNodes("ast_code", name) YIELD node as idNode, score			
			AND (scope)-[:AST_parentOf|CFG_parentOf*]->(idNode {Type: 'Identifier'})
			RETURN DISTINCT idNode
		"""%(scope['Id'], node['Code'])
		res = []
		results = tx.run(query)			
		res = [record['idNode'] for record in results]
		# new_res = []		
		# for curIdentifierNode in res:
		# 	scope = getScopeOf(tx, curIdentifierNode)						
		# 	leftNode = getAssignee(tx, curIdentifierNode, scope)			
		# 	# Make sure that the leftNode returned is not itself
		# 	if leftNode and leftNode['Id'] != curIdentifierNode['Id']:	
		# 		leftNodeScope = getScopeOf(tx, leftNode)
		# 		identicalObjs = getIdenticalObjectInScope(tx, leftNode, leftNodeScope)			
		# 		new_res += getIdenticalObjectInScope(tx, leftNode, leftNodeScope)			
		# res += new_res		
		return res		
	return list(set(_rec(tx, node, scope)))

def getNodeFromRange(tx, rangeStr):
	query = """
		MATCH (node {Range: '%s'})
		RETURN node
	"""%(rangeStr)
	res = []
	results = tx.run(query)
	res = [record['node'] for record in results]
	return res


@lru_cache(maxsize=1000)
def getForwardPDGWithTypeMatch(tx, node_id, scope_id, depth_limit=10, result_limit=50):
	"""
	Find nodes that are assigned FROM the target node using forward PDG traversal.
	The only select forward data dependency nodes with the SAME TYPE as the target node.

	Example:
		a = b
		c = b  <- target node: c
		d = c  <- this c will be found (forward from c), d will not be found from b

	If asked for alias of 'c', returns 'c' on the next line (not 'a' or 'b').

	@param tx: neo4j transaction pointer
	@param node_id: string ID of the node to find forward aliases for
	@param scope_id: string ID of the scope to search within
	@param depth_limit: maximum PDG traversal depth (default 10)
	@param result_limit: maximum number of results to return (default 50)
	@return: list of alias node objects
	"""
	query = """
		WITH '%s' AS nodeId, '%s' AS scopeId, %d AS depthLimit 

		// Get the target node
		MATCH (node:ASTNode {Id: nodeId})
		MATCH (scope:ASTNode {Id: scopeId})

		// Forward PDG traversal only - find nodes that depend on our target node
		MATCH path = (node)-[:PDG_parentOf*1..10]->(alias:ASTNode)
		WHERE (scope)-[:AST_parentOf*0..50]->(alias)
		AND alias.Type = node.Type
		AND alias.Id <> nodeId

		RETURN DISTINCT alias, length(path) AS depth
		ORDER BY depth ASC
		// result_limit
		LIMIT %d
	"""%(node_id, scope_id, depth_limit, result_limit)

	print("getForwardPDGWithTypeMatch query", query)
	results = tx.run(query)
	return [record['alias'] for record in results]


@lru_cache(maxsize=1000)
def getForwardPDGByAssignment(tx, node_id, scope_id, depth_limit=10, result_limit=50):
	"""
	Find nodes that are assigned FROM the target node based on assignment relationships.
	Selects left-hand side identifiers from assignments where target appears on right side.

	Example:
		a = b(120)  <- target node: b(120)
		            <- result: a (left side of assignment)
		c = a       <- if traversing forward from a
		            <- result: c (left side of assignment)

	This finds variables that receive the value of the target through assignment,
	regardless of type matching.

	@param tx: neo4j transaction pointer
	@param node_id: string ID of the node to find assignments for
	@param scope_id: string ID of the scope to search within
	@param depth_limit: maximum PDG traversal depth (default 10)
	@param result_limit: maximum number of results to return (default 50)
	@return: list of assigned-to node objects (left-hand side identifiers)
	"""
	query = """
		WITH '%s' AS nodeId, '%s' AS scopeId, %d AS depthLimit, %d AS resultLimit

		// Get the target node and scope
		MATCH (node:ASTNode {Id: nodeId})
		MATCH (scope:ASTNode {Id: scopeId})

		// Pattern 1: AssignmentExpression (a = b)
		// First find assignment expressions that enclose the target node
		OPTIONAL MATCH (assign1:ASTNode)-[:AST_parentOf {RelationType: 'right'}]->(rightSide1)
		WHERE assign1.Type = 'AssignmentExpression'
		AND ((rightSide1)-[:AST_parentOf*0..5]->(node) OR rightSide1.Id = nodeId)
		AND (scope)-[:AST_parentOf*0..50]->(assign1)

		// Get left side identifier from this assignment
		OPTIONAL MATCH (assign1)-[:AST_parentOf {RelationType: 'left'}]->(leftId1)
		// WHERE leftId1.Type = 'Identifier' OR leftId1.Type = 'MemberExpression' // weak filtering

		WITH COLLECT(DISTINCT leftId1) AS assignResults1, node, scope, resultLimit

		// Pattern 2: VariableDeclarator (var a = b)
		// Find variable declarators that enclose the target node
		OPTIONAL MATCH (decl2:ASTNode)-[:AST_parentOf {RelationType: 'init'}]->(initSide2)
		WHERE decl2.Type = 'VariableDeclarator'
		AND ((initSide2)-[:AST_parentOf*0..5]->(node) OR initSide2.Id = node.Id)
		AND (scope)-[:AST_parentOf*0..50]->(decl2)

		// Get id side identifier from this declarator
		OPTIONAL MATCH (decl2)-[:AST_parentOf {RelationType: 'id'}]->(idNode2)
		// WHERE idNode2.Type = 'Identifier' // weak filtering

		WITH assignResults1 + COLLECT(DISTINCT idNode2) AS allResults

		UNWIND allResults AS result
		WITH result
		WHERE result IS NOT NULL
		RETURN DISTINCT result AS assignedNode
		LIMIT resultLimit
	"""%(node_id, scope_id, depth_limit, result_limit)

	print("getForwardPDGByAssignment query", query)
	results = tx.run(query)
	return [record['assignedNode'] for record in results]


# def get_alias_nodes(tx, node, context_node, context_scope='', depth=0, max_depth=10):
# 	"""
# 	Find alias nodes by following assignment flow through PDG edges.

# 	@param tx: neo4j transaction pointer
# 	@param node: The node to find aliases for
# 	@param context_node: CFG-level context (statement containing node)
# 	@param context_scope: scope identifier for recursion tracking
# 	@param depth: Current recursion depth
# 	@param max_depth: Maximum recursion depth
# 	@return: List of alias nodes (including self)
# 	"""

# 	# check if node is in a cached set, if so return the precomputed result
# 	if alias_visited_has(node['Id']):
# 		print(f"[get_alias_from_assign] Already visited {node['Id']}")
# 		return []
	
# 	alias_visited_add(node['Id'])

# 	# Depth limit
# 	if depth >= max_depth:
# 		print(f"[get_alias_from_assign] Max depth reached")
# 		return [node]

# 	result = [node]  # Include self
# 	print(f"[get_alias_from_assign] Depth={depth}, Node={node['Id']}, Type={node['Type']}, Context={context_node['Id']}")

# 	# process context_node if it's Program - halt if true
# 	if context_node['Type'] == 'Program':
# 		print(f"[get_alias_from_assign] Context is Program, halting")
# 		return result

# 	# PDG query
# 	alias_candidates_context_nodes = []

# 	if node['Type'] == 'Identifier':
# 		# PDG query with edge argument
# 		varname = node['Code']
# 		query = """
# 		MATCH (n_s:ASTNode { Id: '%s' })-[:PDG_parentOf { Arguments: '%s' }]->(n_t)
# 		RETURN collect(distinct n_t) AS resultset
# 		"""%(context_node['Id'], varname)
# 		results_ident = tx.run(query)
# 		for item in results_ident:
# 			alias_candidates_context_nodes = item['resultset']
# 		print(f"[get_alias_from_assign] PDG query with Arguments='{varname}'")
# 	else:
# 		# identify the identifier within node, for each identifier, do edge-argument PDG query
# 		# a.b = c
# 		# q = a.b
# 		tree = getChildsOf(tx, node)
# 		[code_expr, literals, idents] = get_code_expression(tree)
# 		print(f"[get_alias_from_assign] Extracted from node: idents={list(idents.keys())}, literals={literals}")

# 		# take intersection for results of all identifier and Literals (to reduce false positive)
# 		candidates_per_arg = {}

# 		### TODO: We probably don't need to do this for all identifiers, propbably should case on the type
# 		for varname in idents.keys():
# 			query_ident = """
# 			MATCH (n_s { Id: '%s' })-[:PDG_parentOf { Arguments: '%s' }]->(n_t)
# 			RETURN collect(distinct n_t) AS resultset
# 			"""%(context_node['Id'], varname)
# 			results_ident = tx.run(query_ident)
# 			for item in results_ident:
# 				candidates_per_arg[varname] = item['resultset']
# 			print(f"[get_alias_from_assign]   Ident '{varname}': {len(candidates_per_arg.get(varname, []))} candidates")

# 		# TODO: do the strict alias filtering 


# 		# TODO: place into alias_candidates_context_nodes


# 		# # Intersection: nodes that have ALL identifiers
# 		# if candidates_per_arg:
# 		# 	first_key = list(candidates_per_arg.keys())[0]
# 		# 	alias_candidates_context_nodes = candidates_per_arg[first_key]

# 		# 	for varname, candidates in candidates_per_arg.items():
# 		# 		if varname == first_key:
# 		# 			continue
# 		# 		candidate_ids = {c['Id'] for c in candidates}
# 		# 		alias_candidates_context_nodes = [c for c in alias_candidates_context_nodes if c['Id'] in candidate_ids]

# 		# 	print(f"[get_alias_from_assign] After intersection: {len(alias_candidates_context_nodes)} candidates")

# 		# # Skip the standard query below since we already processed
# 		# query = None

# 	# # Execute standard query if not already processed
# 	# if query:
# 	# 	results = tx.run(query)
# 	# 	for item in results:
# 	# 		alias_candidates_context_nodes = item['resultset']

# 	print(f"[get_alias_from_assign] Found {len(alias_candidates_context_nodes)} candidate CFG nodes")

# 	# filter out the varnodes
# 	# new_varnodes = [ nodes with the exact Type/identifier/Literals in alias_candidates_context_nodes]
# 	new_varnodes = []

# 	for iteratorNode in alias_candidates_context_nodes:
# 		# Process context_node if it's Program - halt
# 		if iteratorNode['Type'] == 'Program':
# 			continue

# 		# Handle BlockStatement (function parameters)
# 		if iteratorNode['Type'] == 'BlockStatement' and (node['Type'] == 'Identifier' or node['Type'] == 'Literal'):
# 			varname = node['Code'] if node['Type'] == 'Identifier' else str(node['Value'])
# 			func_def_node = data_flow.get_function_def_of_block_stmt(tx, iteratorNode)

# 			if func_def_node and func_def_node['Type'] in ['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression']:
# 				match_signature = data_flow.check_if_function_has_param(tx, varname, func_def_node)
# 				if match_signature:
# 					print(f"[get_alias_from_assign] Found function parameter match for '{varname}'")
# 					# TODO: Handle function parameter propagation
# 			continue

# 		# Get subtree and extract identifiers/literals
# 		tree = getChildsOf(tx, iteratorNode)
# 		[code_expr, literals, idents] = get_code_expression(tree)
# 		print(f"[get_alias_from_assign] Candidate CFG {iteratorNode['Id']}: {code_expr}")

# 		# Filter: nodes with exact Type and Code/Value match
# 		if node['Type'] == 'Identifier':
# 			varname = node['Code']
# 			if varname in idents:
# 				matching_node = get_node_by_id(tx, idents[varname])
# 				if matching_node and matching_node['Type'] == 'Identifier':
# 					new_varnodes.append(matching_node)
# 					print(f"[get_alias_from_assign]   ✓ Matched Identifier '{varname}'")

# 		elif node['Type'] == 'Literal':
# 			target_value = str(node.get('Value', ''))
# 			# Find matching literal values
# 			for lit in literals:
# 				if str(lit) == target_value:
# 					# Find the Literal node with this value in the tree
# 					query_lit = """
# 					MATCH (cfg:ASTNode {Id: '%s'})-[:AST_parentOf*0..]->(lit:ASTNode {Type: 'Literal', Value: '%s'})
# 					RETURN DISTINCT lit
# 					"""%(iteratorNode['Id'], target_value)
# 					results_lit = tx.run(query_lit)
# 					for record in results_lit:
# 						new_varnodes.append(record['lit'])
# 						print(f"[get_alias_from_assign]   ✓ Matched Literal '{target_value}'")

# 		else:
# 			# For complex types: find nodes with same type and code expression
# 			query_complex = """
# 			MATCH (cfg:ASTNode {Id: '%s'})-[:AST_parentOf*0..]->(match:ASTNode {Type: '%s'})
# 			WHERE match.Id <> '%s'
# 			RETURN DISTINCT match
# 			"""%(iteratorNode['Id'], node['Type'], node['Id'])

# 			results_complex = tx.run(query_complex)
# 			for record in results_complex:
# 				candidate = record['match']
# 				# Verify code expression matches
# 				cand_tree = getChildsOf(tx, candidate)
# 				[cand_code, _, _] = get_code_expression(cand_tree)

# 				node_tree = getChildsOf(tx, node)
# 				[node_code, _, _] = get_code_expression(node_tree)

# 				if cand_code == node_code:
# 					new_varnodes.append(candidate)
# 					print(f"[get_alias_from_assign]   ✓ Matched {node['Type']}: {cand_code}")

# 	print(f"[get_alias_from_assign] Filtered to {len(new_varnodes)} matching varnodes")

# 	# extract alias node from the current context
# 	# - allow rules: VariableDeclarator/AssignmentExpression/CallExpression
# 	renamed_varnodes = []

# 	for varnode in new_varnodes:
# 		if varnode in result:
# 			continue

# 		result.append(varnode)

# 		# Get CFG context for this varnode
# 		varnode_cfg = get_ast_topmost(tx, varnode)

# 		# Rule 1: VariableDeclarator (var a = <varnode>)
# 		query_decl = """
# 		MATCH (cfg:ASTNode {Id: '%s'})-[:AST_parentOf*0..]->(decl:ASTNode {Type: 'VariableDeclarator'})
# 		-[:AST_parentOf {RelationType: 'init'}]->(init)-[:AST_parentOf*0..]->(target:ASTNode {Id: '%s'})
# 		MATCH (decl)-[:AST_parentOf {RelationType: 'id'}]->(leftId:ASTNode {Type: 'Identifier'})
# 		RETURN DISTINCT leftId
# 		"""%(varnode_cfg['Id'], varnode['Id'])

# 		results_decl = tx.run(query_decl)
# 		for record in results_decl:
# 			left_id = record['leftId']
# 			renamed_varnodes.append((left_id, varnode_cfg))
# 			print(f"[get_alias_from_assign]   → Renamed to '{left_id['Code']}' via VariableDeclarator")

# 		# Rule 2: AssignmentExpression (a = <varnode>)
# 		query_assign = """
# 		MATCH (cfg:ASTNode {Id: '%s'})-[:AST_parentOf*0..]->(assign:ASTNode {Type: 'AssignmentExpression'})
# 		-[:AST_parentOf {RelationType: 'right'}]->(right)-[:AST_parentOf*0..]->(target:ASTNode {Id: '%s'})
# 		MATCH (assign)-[:AST_parentOf {RelationType: 'left'}]->(leftId:ASTNode {Type: 'Identifier'})
# 		RETURN DISTINCT leftId
# 		"""%(varnode_cfg['Id'], varnode['Id'])

# 		results_assign = tx.run(query_assign)
# 		for record in results_assign:
# 			left_id = record['leftId']
# 			renamed_varnodes.append((left_id, varnode_cfg))
# 			print(f"[get_alias_from_assign]   → Renamed to '{left_id['Code']}' via AssignmentExpression")

# 		# TODO: Rule 3: CallExpression - propagate into corresponding function definition

# 	print(f"[get_alias_from_assign] Found {len(renamed_varnodes)} renamed nodes")

# 	# recursion - call get_alias on each element of the new_varnode
# 	for new_node, new_context in renamed_varnodes:
# 		if new_node in result:
# 			continue

# 		result.append(new_node)

# 		# Recursive call
# 		print(f"[get_alias_from_assign] Recursing into node {new_node['Id']}...")
# 		deeper_aliases = get_alias_nodes(tx, new_node, new_context, context_scope=context_scope, depth=depth+1, max_depth=max_depth)

# 		# Add deeper aliases
# 		for deeper in deeper_aliases:
# 			if deeper not in result:
# 				result.append(deeper)

# 	alias_visited_remove(node['Id'])
# 	print(f"[get_alias_from_assign] Final result: {len(result)} alias nodes")

# 	return result



def getIdenticalObjectInScope(tx, node, scope = None):
	"""
	Find syntactically identical nodes in scope using PDG-based analysis (refactored for performance).

	Replaces expensive Merkle tree hashing with bounded PDG queries and cycle detection.

	@param {pointer} tx
	@param {node object} the node to look for identical object for
	@param {node object} scope (optional) - scope to search within
	@return {tuple}: ([node objects], scope) - list of identical objects and the scope
	"""

	# Clear visited set at the start of each top-level query
	alias_visited_clear()

	print(f"getIdenticalObjectInScope: {node['Type']}")
	def isLeftAssignment(tx, node, scope):
		"""Check if node is on the left side of an assignment (bounded query)."""
		query = """
			WITH '%s' AS nodeId, '%s' AS scopeId
			MATCH (node:ASTNode {Id: nodeId})
			MATCH (scope:ASTNode {Id: scopeId})
			WHERE EXISTS { (node)<-[:AST_parentOf {RelationType: 'left'}]-(med)<-[:AST_parentOf*0..50]-(scope) }
			RETURN node
		"""%(node['Id'], scope['Id'])
		print("isLeftAssignment query", query)
		results = tx.run(query)
		res = [record['node'] for record in results]
		return len(res) > 0

	def isDirectInitializer(tx, node):
		"""Check if node is directly initialized (part of assignment or declaration)."""
		query = """
			MATCH (node:ASTNode {Id: '%s'})<-[:AST_parentOf]-(assignRelatedExpr:ASTNode)
			WHERE assignRelatedExpr.Type IN ['VariableDeclarator', 'AssignmentExpression']
			RETURN assignRelatedExpr
		"""%(node['Id'])
		results = tx.run(query)
		res = [record['assignRelatedExpr'] for record in results]
		return len(res) > 0

	def _rec(tx, node, scope = None):
		"""
		Recursive helper to find aliases using PDG-based approach with cycle detection.
		Uses early returns at each filtering stage for efficiency.
		"""
		node_id = node['Id']
		matchingNodes = [node]
		

		# Stage 1: Cycle detection
		if alias_visited_has(node_id):
			print(f"[Cycle detected] Already visited node {node_id}, skipping")
			return []
		alias_visited_add(node_id)

		# Stage 2: Get scope
		if scope is None:
			scope = getScopeOf(tx, node)

		# Stage 3: PDG-based alias discovery		
		pdg_aliases = getForwardPDGWithTypeMatch(tx, node_id, scope['Id'], depth_limit=10, result_limit=50)
		print(f"Stage 3: PDG aliases found: {len(pdg_aliases)}")
		# breakpoint()
		
		# Stage 6: Sort by range and filter left assignments
		matchingNodes += pdg_aliases
		matchingNodes.sort(key=lambda x: getRange(x)[0], reverse=True)
		
		for i, mnode in enumerate(matchingNodes):
			if isLeftAssignment(tx, mnode, scope) and mnode['Id'] != node_id:
				print(f"Stage 6: Left assignment at {mnode['Id']}, truncating")
				matchingNodes = matchingNodes[:i]
				break

		print(f"Stage 6: After left assignment filter: {len(matchingNodes)}")
		if not matchingNodes:
			raise RuntimeError("[getIdenticalObjectInScope] Unexpected: filtered out all nodes including self", node)

		# Stage 7: Recursive propagation through initializers

		# TODO: Apply getForwardPDGByAssignment here for assignment-based alias discovery
		# Example: a = b(102), where b(102) is target node, should find 'a'
		# Note: We do NOT filter out left assignments for assignment aliases because:
		#   a = b(102)  <- we want 'a' in the result
		#   b(102) = 3  <- this case is filtered by left assignment check, but 'a' is still valid
		# Note: Does NOT support destructuring assignments like: a, b = c, d
		# Blocked by: getAssignee function needs to be updated to work with assignment-based aliases
		new_res = []
		for matchingNode in matchingNodes:
			if isDirectInitializer(tx, matchingNode):
				match_scope = getScopeOf(tx, matchingNode)
				leftNode = getAssignee(tx, matchingNode, match_scope)
				if leftNode and leftNode['Id'] != matchingNode['Id']:
					print(f"Stage 7: Recursing into assignee {leftNode['Id']}")
					identicalObjs, *_ = getIdenticalObjectInScope(tx, leftNode, match_scope)
					new_res += identicalObjs

		result = matchingNodes + new_res
		print(f"Final result for {node_id}: {result}")
		return result

	# Execute recursive search
	result = list(set(_rec(tx, node, scope)))
	return result, scope



def getCodeExpression(wrapperNode):

	"""
	@param {dict} wrapperNode
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = []
	literals = []
	node = wrapperNode['node']
	children = wrapperNode['children']
	
	if 'Type' in node:
		ntype = node['Type']
	else:
		ntype = ''

	if ntype == 'Literal':
		value =  node['Value']
		if value:
			value = "\"%s\""%value
			literals.append(value)
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'Identifier':
		value =  node['Code']
		if value:
			idents.append(value)
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression' or ntype == 'VariableDeclarator':
		opertor = node['Code']
		[right, lits1, ids1] = getCodeExpression(children[0])
		[left, lits2, ids2] = getCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents.extend(ids1)
		idents.extend(ids2)
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = getCodeExpression(children[0])
		[left, lits2, ids2] = getCodeExpression(children[1])
		value = str(left) + opertor + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents.extend(ids1)
		idents.extend(ids2)
		return [value, literals, idents]

	else:
		expr = []
		for childWrapperNode in children:
			result = getCodeExpression(childWrapperNode)
			currentExpr = result[0]
			lits = result[1]
			ids = result[2]
			expr.append(currentExpr)
			literals.extend(lits)
			idents.extend(ids)

		return [ ' '.join(expr), literals, idents]
	
def getAdvancedCodeExpression(wrapperNode, is_argument = False, relation_type=''):

	"""
	@param {dict} wrapperNode
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = {}
	literals = []

	node = wrapperNode['node']
	children = wrapperNode['children']
	if 'Type' in node:
		ntype = node['Type']
	else:
		ntype = ''

	if ntype == 'Literal':
		value =  node['Value']
		raw = node['Raw']
		if value:
			if (value == '{}') and (raw.strip('\'').strip("\"").strip() != value):
				value = "\"%s\""%raw
				literals.append(value)
				return [value, literals, idents]
			else:
				value = "\"%s\""%value
				literals.append(value)
				return [value, literals, idents]
		else:
			return ['\"\"', literals, idents]

	elif ntype == 'Identifier':
		value =  node['Code']
		if value:
			nid = str(node['Id'])
			idents[value] = nid
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'ThisExpression':
		nid = str(node['Id'])
		idents['ThisExpression']= nid # add ThisStatment to Idents for Pointer Resolution
		return ['this', literals, idents]

	elif ntype == 'LogicalExpression':

		opertor = node['Code']
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'IfStatement':

		if len(children) == 2:
			[consequent, lits2, ids2] = getAdvancedCodeExpression(children[0])
			[test, lits1, ids1] = getAdvancedCodeExpression(children[1])
			value = 'if(%s){ %s }'%(test, consequent)

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			return [value, literals, idents]
		elif len(children) == 3:
			[alternate, lits1, ids1] = getAdvancedCodeExpression(children[0])
			[consequent, lits2, ids2] = getAdvancedCodeExpression(children[1])
			[test, lits3, ids3] = getAdvancedCodeExpression(children[2])
			value = 'if(%s){ %s } else{ %s }'%(test, consequent, alternate)

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			return [value, literals, idents]

	elif ntype == 'ConditionalExpression':
		
		[alternate, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[consequent, lits2, ids2] = getAdvancedCodeExpression(children[1])
		[test, lits3, ids3] = getAdvancedCodeExpression(children[2])
		value = '(%s)? %s: %s'%(test, consequent, alternate)

		literals.extend(lits1)
		literals.extend(lits2)
		literals.extend(lits3)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		idents = {**idents, **ids3}

		return [value, literals, idents]

	elif ntype == 'NewExpression':
		[callee, lits1, ids1] = getAdvancedCodeExpression(children[0])
		literals.extend(lits1)
		idents = {**idents, **ids1}
		value = 'new '+ callee + '()'
		return [value, literals, idents]

	elif ntype == "Property":
		[key, lits1, ids1] = getAdvancedCodeExpression(children[1])
		[value, lits2, ids2] = getAdvancedCodeExpression(children[0])
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		literals.extend(lits1)
		literals.extend(lits2)
		value = ["%s: %s"%(str(key), str(value)), literals, idents]
		return [value, literals, idents]

	elif ntype == 'ObjectExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= getAdvancedCodeExpression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '{ '  + ', '.join(tempt) + ' }'
			return [value, literals, idents]
		else:
			return ['{ }', literals, idents]

	elif ntype == 'ArrayExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= getAdvancedCodeExpression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '[ '  + ', '.join(tempt) + ' ]'
			return [value, literals, idents]
		else:
			return ['[ ]', literals, idents]

	elif ntype == 'CallExpression':

		if len(children) == 0: # call with no argument 
			[callee, lits1, ids1] = getAdvancedCodeExpression(children[0])
			args = ''
			value = str(callee) + '(' +  args + ')'
			return [value, literals, idents]

		else:
			args = []
			callee = ''
			for i in range(len(children)):
				ch = children[i]
				[expr_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
				idents = {**idents, **ids_i}
				literals.extend(lits_i)
				if i == len(children)-1:
					# this is the name of the caller
					if(isinstance(expr_i, list)):
						callee = expr_i[0]
					else:
						callee = expr_i
				else:
					# this is a call argument
					if(isinstance(expr_i, list)):
						args.append(expr_i[0])
					else:
						args.append(expr_i)

			args = args[::-1] # reverse the args list order 
			value = str(callee) + '(' + ', '.join(args) + ')'
			return [value, literals, idents]

	elif ntype == 'UpdateExpression':
		operator = node['Code']
		ch = children[0]
		[arg, lits, ids] = getAdvancedCodeExpression(ch)
		idents = {**idents, **ids}
		literals.extend(lits)
		value = arg+ operator
		return [value, literals, idents]

	elif ntype == 'VariableDeclaration':
		# can also add node['Kind'] to the return value (e.g., var, let, const)
		kind = node['Kind']
		declarations = []
		for ch in children:
			[expr_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
			idents = {**idents, **ids_i}
			literals.extend(lits_i)

			if(isinstance(expr_i, list)):
				code = expr_i[0]
			else:
				code = expr_i
			code = expr_i
			declarations.append(code)

		declarations = declarations[::-1]
		value = str(kind) + ' ' + ', '.join(declarations)
		return [value, literals, idents]

	elif ntype == 'VariableDeclarator':

		if len(children) == 1:
			[left, lits, ids] = getAdvancedCodeExpression(children[0])
			literals.extend(lits)
			idents = {**idents, **ids}
			value = left;
			return [value, literals, idents]
		else:
			opertor = node['Code']
			[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
			[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
			value = str(left) + ' ' + opertor + ' ' + str(right)
			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
		return [value, literals, idents]


	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression':
		opertor = node['Code']
			
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])

		if node['Computed'] == 'true' or right in lits1: # if right is literal
			value = str(left) + '[' + str(right) + ']'
		else: # right is identifer or compound member expr
			value = str(left) + opertor + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'CatchClause':
		args = []
		body = ''
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[body, lits_i, ids_i] = getAdvancedCodeExpression(ch)
			else:
				[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'catch( ' + ','.join(args) + ' ){ %s'%(body) + ' }'
		return [value, literals, idents]	

	elif ntype == 'TryStatement':
		if len(children) == 2:

			[catch_block, lits2, ids2] = getAdvancedCodeExpression(children[0])
			[try_block, lits1, ids1] = getAdvancedCodeExpression(children[1])

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			value = 'try{ %s } %s'%(try_block, catch_block)
			return [value, literals, idents] 

		elif len(children) == 3:
			[finally_block, lits3, ids3] = getAdvancedCodeExpression(children[0])
			[catch_block, lits2, ids2] = getAdvancedCodeExpression(children[1])
			[try_block, lits1, ids1] = getAdvancedCodeExpression(children[2])

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			value = 'try{ %s } %s finally{ %s }'%(try_block, catch_block, finally_block)
			return [value, literals, idents] 

	elif ntype == 'FunctionExpression':
		args = []
		block = '...'
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[block, lits_i, ids_i] = getAdvancedCodeExpression(ch)	
			else:
				[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)

				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function(' + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	

	elif ntype == 'FunctionDeclaration':
		args = []
		function_name = 'function_name'
		block = '...'
		n_childs = len(children)
		for i in range(n_childs):
			ch = children[i]
			if ch['node']['Type'] == 'BlockStatement':
				[block, lits_i, ids_i] = getAdvancedCodeExpression(ch)	
			else:
				if i == n_childs-1: # function name
					[fname, lits_i, ids_i] = getAdvancedCodeExpression(ch) 
					function_name = fname
				else:
					[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch) 
					args.append(arg_i)


			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function %s('%(function_name) + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	


	else:
		expr = []
		for childWrapperNode in children:
			result = getAdvancedCodeExpression(childWrapperNode)
			currentExpr = result[0]
			lits = result[1]
			ids = result[2]
			expr.append(currentExpr)
			literals.extend(lits)
			idents = {**idents, **ids}

		expr = expr[::-1]
		if is_argument:
			return [ ','.join(expr), literals, idents]
		else:
			return [ '; '.join(expr), literals, idents]

def getCodeOf(tx, node):
	return getAdvancedCodeExpression(getChildsOf(tx, node))[0]
