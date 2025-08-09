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


def get_cfg_level_nodes_for_statements():

	esprimaCFGLevelNodeTypes= [
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
	    "ForInStatemen",
	    "ThrowStatement",
	    "TryStatement",
	    "WithStatement",
	    "FunctionDeclaration", # I need this to get the initial declaration
		'FunctionExpression', # I need this to get the initial declaration
		'ArrowFunctionExpression', # I need this to get the initial declaration
		# 'SequenceExpression' # For bundler support
	]

	return esprimaCFGLevelNodeTypes


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


def get_ast_topmost(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return topmost parent of an AST node
	"""

	CFG_LEVEL_STATEMENTS = get_cfg_level_nodes_for_statements()

	if "Type" in node:
		node_type = node["Type"]
	else:
		node = get_node_by_id(tx, node["Id"]) # re-assign the input parameter here
		node_type = node["Type"]

	if node_type in CFG_LEVEL_STATEMENTS:
		return node

	
	done = False
	iterator = node
	while not done:
		parent = get_ast_parent(tx, iterator)
		if parent is None:
			done = True
			return iterator

		if parent['Type'] in CFG_LEVEL_STATEMENTS:
			done = True
			break
		else:
			iterator = parent # loop

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
	# query = """
	# CALL {
	# 	MATCH (topMostExprNode {Id: '%s'})

	# 	// Attempt strict match
	# 	OPTIONAL MATCH p1 = (topMostExprNode)<-[:AST_parentOf|CFG_parentOf*0..]-(decl1)
	# 		-[:AST_parentOf*]->(med1)-[:AST_parentOf {RelationType: 'id'}]->(initDclId1 {Code: '%s'})
	# 	WHERE decl1.Type IN [
	# 		'VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration',
	# 		'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration',
	# 		'ExportAllDeclaration', 'CatchClause'
	# 	]

	# 	// Fallback match if the above fails
	# 	OPTIONAL MATCH p2 = (topMostExprNode)<-[:AST_parentOf|CFG_parentOf*0..]-(decl2 {Type: 'ExpressionStatement'})
	# 		-[:AST_parentOf*]->(med2)-[:AST_parentOf {RelationType: 'left'}]->(initDclId2 {Code: '%s'})


	# 	// Combine the two, preferring p1 if it exists
	# 	WITH
	# 	CASE WHEN p1 IS NOT NULL THEN decl1 ELSE decl2 END AS declarationNode,
	# 	CASE WHEN p1 IS NOT NULL THEN p1 ELSE p2 END AS p,
	# 	CASE WHEN p1 IS NOT NULL THEN initDclId1 ELSE initDclId2 END AS initialDeclarationIdentifierNode

	# 	WITH declarationNode, length(p) AS depth, initialDeclarationIdentifierNode
	# 	ORDER BY depth ASC LIMIT 1
	# 	RETURN declarationNode, initialDeclarationIdentifierNode, depth

	# 	UNION

	# 	// Take care of the function reference case
	# 	MATCH p = (topMostExprNode)-[:AST_parentOf]->(callExpressionNode {Type: 'CallExpression'})
	# 			-[:CG_parentOf*]->(declarationNode),
	# 		(declarationNode)-[:AST_parentOf*0..]->(med)
	# 							-[:AST_parentOf {RelationType: 'id'}]->(initialDeclarationIdentifierNode)
	# 	WHERE topMostExprNode.Id = "%s"
	# 	AND declarationNode.Type IN [
	# 		'VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration',
	# 		'ImportDeclaration', 'ExportNamedDeclaration',
	# 		'ExportDefaultDeclaration', 'ExportAllDeclaration', 'CatchClause'
	# 	]
	# 	AND initialDeclarationIdentifierNode.Code = "%s"
	# 	WITH declarationNode, initialDeclarationIdentifierNode, length(p) AS depth
	# 	ORDER BY depth ASC LIMIT 1
	# 	RETURN declarationNode, initialDeclarationIdentifierNode, depth

	# 	UNION

	# 	// Take care of argument declaration types
	# 	MATCH p = (topMostExprNode)<-[:AST_parentOf*0..]-(declarationNode)
	# 	,(declarationNode)-[:AST_parentOf {RelationType: 'params'}]->(initialDeclarationIdentifierNode{Type: 'Identifier'})
	# 	WHERE topMostExprNode.Id = "%s"
	# 	AND declarationNode.Type IN ['ArrowFunctionExpression', 'FunctionDeclaration', 'MethodDefinition']
	# 	AND initialDeclarationIdentifierNode.Code = "%s"
	# 	WITH declarationNode, initialDeclarationIdentifierNode, length(p) as depth
	# 	// Find the closest declaration
	# 	ORDER BY depth ASC LIMIT 1 
	# 	RETURN declarationNode,initialDeclarationIdentifierNode, depth
	# }
	# WITH declarationNode, initialDeclarationIdentifierNode, depth
	# ORDER BY depth ASC
	# LIMIT 1
	# RETURN declarationNode, initialDeclarationIdentifierNode
	# """%(top_most_expr['Id'], node['Code'], node['Code'], top_most_expr['Id'], node['Code'], top_most_expr['Id'], node['Code'])
	# # print("getInitialDeclaration query", query)

	# Having assumption that topMostExprNode should be CFG node
	query = """
	CALL {
		// from the current expression backtrack definition
		MATCH p = (topMostExprNode)<-[:CFG_parentOf*0..]-(declarationNode)
				// ensure from x = y + 1 we're getting x
              ,(declarationNode)-[:AST_parentOf*]->(med)-[:AST_parentOf {RelationType: 'id'}]->(initialDeclarationIdentifierNode)
		WHERE topMostExprNode.Id = "%s"
		AND declarationNode.Type IN ['VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration', 'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'ExportAllDeclaration', 'CatchClause']
		AND initialDeclarationIdentifierNode.Code = "%s"
		WITH declarationNode, initialDeclarationIdentifierNode, length(p) as depth
		// Find the closest declaration
		ORDER BY depth ASC LIMIT 1 
		RETURN declarationNode,initialDeclarationIdentifierNode, depth

		UNION

		// Take care of the function reference case
		MATCH p = (topMostExprNode)-[:AST_parentOf]->(callExpressionNode {Type: 'CallExpression'})
				-[:CG_parentOf*]->(declarationNode),
			(declarationNode)-[:AST_parentOf*0..]->(med)
								-[:AST_parentOf {RelationType: 'id'}]->(initialDeclarationIdentifierNode)
		WHERE topMostExprNode.Id = "%s"
		AND declarationNode.Type IN [
			'VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration',
			'ImportDeclaration', 'ExportNamedDeclaration',
			'ExportDefaultDeclaration', 'ExportAllDeclaration', 'CatchClause'
		]
		AND initialDeclarationIdentifierNode.Code = "%s"
		WITH declarationNode, initialDeclarationIdentifierNode, length(p) AS depth
		ORDER BY depth ASC LIMIT 1
		RETURN declarationNode, initialDeclarationIdentifierNode, depth

		UNION

		// Take care of argument declaration types
		MATCH p = (topMostExprNode)<-[:AST_parentOf*0..]-(declarationNode)
		,(declarationNode)-[:AST_parentOf {RelationType: 'params'}]->(initialDeclarationIdentifierNode{Type: 'Identifier'})
		WHERE topMostExprNode.Id = "%s"
		AND declarationNode.Type IN ['ArrowFunctionExpression', 'FunctionDeclaration', 'MethodDefinition']
		AND initialDeclarationIdentifierNode.Code = "%s"
		WITH declarationNode, initialDeclarationIdentifierNode, length(p) as depth
		// Find the closest declaration
		ORDER BY depth ASC LIMIT 1 
		RETURN declarationNode,initialDeclarationIdentifierNode, depth

		UNION 

		// Take care of statementExpression type of variable declaration
		MATCH p = (topMostExprNode)<-[:CFG_parentOf*0..]-(declarationNode {Type: 'ExpressionStatement'})
		,(declarationNode)-[:AST_parentOf*]->(med)-[:AST_parentOf {RelationType: 'left'}]->(initialDeclarationIdentifierNode {Type: 'Identifier'})
		WHERE initialDeclarationIdentifierNode.Code = "%s"
		AND topMostExprNode.Id = "%s"
		WITH declarationNode, initialDeclarationIdentifierNode, length(p) as depth
		// // Find the closest declaration
		ORDER BY depth ASC LIMIT 1 
		RETURN declarationNode, initialDeclarationIdentifierNode, depth
	}
	WITH declarationNode, initialDeclarationIdentifierNode, depth
	ORDER BY depth ASC
	LIMIT 1
	RETURN declarationNode, initialDeclarationIdentifierNode
	"""%(top_most_expr['Id'], node['Code'], top_most_expr['Id'], node['Code'], top_most_expr['Id'], node['Code'], node['Code'], top_most_expr['Id'])
	# print("query", query)
	results = tx.run(query)	
	
	ans = []
	for record in results:				
		declarationNode = record['declarationNode']
		initialDeclarationIdentifierNode = record['initialDeclarationIdentifierNode']		
		ans = [declarationNode, initialDeclarationIdentifierNode]
		break
	if not ans:
		ans = [top_most_expr, node] # if not found, return the top most expression as initial seen scope
	cache[node['Id']] = ans
	return ans
	


def getIdentifierLiteralScopeOf(tx, node):
	"""
	@param {pointer} tx
	@param {node object} node
	@return {node object} returns the scope node of this node 
	"""
	print("getIdentifierLiteralScopeOf call on", node)
	[initialDeclNode, idNode] = getInitialDeclaration(tx, node)
	query = """
		MATCH (node {Id: '%s'})<-[:CFG_parentOf|AST_parentOf*0..1]-(scopeNode)
		WHERE scopeNode.Type IN ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'Program', "BlockStatement"]
		RETURN DISTINCT(scopeNode)
	"""%(initialDeclNode['Id'])
	# print("query", query)
	results = tx.run(query)
	for record in results:
		# print(record)		
		scopeNode = record['scopeNode']
		return scopeNode
	return None

def getRange(node):		
	range_str = "".join(filter(lambda char: char not in "[]", node['Range']))
	return list(map(int, range_str.split(',')))


def getScopeOf(tx, node, scopeCache = {}):		
	def getAllIdentifierNodes(tx, node):
		query = """
		MATCH (IdNode {Type: 'Identifier'})<-[:AST_parentOf*]-(node {Id: '%s'})
		RETURN IdNode
		"""%(node['Id'])
		res = []
		results = tx.run(query)			
		res = [record['IdNode'] for record in results]
		return res

	if node['Id'] in scopeCache:
		return scopeCache[node['Id']]
	if node['Type'] == 'Identifier' or node['Type'] == 'Literal':
		IdNodes = [node]
	else:
		IdNodes = getAllIdentifierNodes(tx, node)		
	def get_or_compute_scope(idnode):
		return scopeCache.setdefault(idnode['Id'], getIdentifierLiteralScopeOf(tx, idnode))
	scopeNodes = [get_or_compute_scope(idnode) for idnode in IdNodes]
	scope = max(scopeNodes, key=lambda x: getRange(x)[0])  # find the tightest scope					
	return scope


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
			MATCH (idNode {Type: 'Identifier'})<-[:AST_parentOf|CFG_parentOf*]-(scope)
			WHERE scope.Id = "%s"
			AND idNode.Code = "%s"
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
	res = [record['idNode'] for record in results]
	return res


def getIdenticalObjectInScope(tx, node, scope = None):
	"""
		@param {pointer} tx
		@param {node object} the node to look for identical object for
		@return {[node object]}: a list of identical object found in the same scope				
	"""	
	# look for this expression identical_obj = id	
	# 1. look for variable with the same name as id's name in the same scope
	# 2. get their top expression, and see if that's a Assignment expression, if so push 
	# 3. only recursively visit left hand side if in the assignment 
	
	def isLeftAssignment(tx, node, scope):
		query = """
			MATCH p = (node {Id: '%s'})<-[:AST_parentOf {RelationType: 'left'}]-(med)<-[:AST_parentOf|CFG_parentOf*0..]-(scope {Id: '%s'})
			RETURN p
		"""%(node['Id'], scope['Id'])	
		# print("isLeftAssignment q", query)	
		res = []
		results = tx.run(query)			
		res = [record['p'] for record in results]
		return res != []

	def isDirectInitializer(tx, node):
		query = """
			MATCH p = (node {Id: '%s'})<-[:AST_parentOf]-(assignRelatedExpr)
			WHERE assignRelatedExpr.Type IN ['VariableDeclarator', 'AssignmentExpression']
			RETURN p
		"""%(node['Id'])	
		# print("isLeftAssignment q", query)	
		res = []
		results = tx.run(query)			
		res = [record['p'] for record in results]
		return res != []
	

	def applyHashingOnScope(tx, scope, scopeCacheSet = set()):
		if scope in scopeCacheSet:
			return
		else:
			scopeCacheSet.add(scope)
		query = """
		// Step 1: Initialize leaf node hashes
		CALL {
			MATCH (n)<-[:AST_parentOf|CFG_parentOf*]-(scope {Id: '%s'})
			WHERE NOT (n)-[:AST_parentOf]->()
			WITH n, 
				CASE 
					WHEN n.Type = 'Literal' THEN n.Value
					ELSE n.Code
				END AS val
			SET n.hash = apoc.util.md5([val])
		}

		// Step 2: Process parent nodes
		MATCH (parent)-[:AST_parentOf]->(child)
		WHERE child.hash IS NOT NULL
		WITH parent, apoc.coll.sort(collect(child.hash)) AS childHashes,  
			CASE 
				WHEN parent.Code IS NOT NULL THEN parent.Code
				ELSE ''
			END AS val
		SET parent.hash = apoc.util.md5([val, parent.type, childHashes])
		RETURN parent, childHashes
		"""%(scope['Id'])
		# print("hashing query", query)
		res = []
		results = tx.run(query)			
		res = [[record['parent'], record['childHashes']] for record in results]
		return res

	def getNodesWithSameHashInScope(tx, node, scope):
		query = """
			MATCH (node)<-[:AST_parentOf|CFG_parentOf*0..]-(scope {Id: '%s'}), (nodeB {Id: '%s'})
			WHERE node.hash = nodeB.hash
			AND node.Id <> nodeB.Id
			RETURN node
		"""%(scope['Id'], node['Id'])
		res = []
		results = tx.run(query)			
		res = [record['node'] for record in results]
		return res

	# def getTightestScopeOfNode(tx, node):		
	# 	if node['Id'] in scopeCache:
	# 		return scopeCache[node['Id']]
	# 	if node['Type'] == 'Identifier':
	# 		IdNodes = [node]
	# 	else:
	# 		IdNodes = getAllIdentifierNodes(tx, node)		
	# 	def get_or_compute_scope(idnode):
	# 		return scopeCache.setdefault(idnode['Id'], getScopeOf(tx, idnode))
	# 	scopeNodes = [get_or_compute_scope(idnode) for idnode in IdNodes]
	# 	scope = max(scopeNodes, key=lambda x: getRange(x)[0])  # find the tightest scope					
	# 	return scope

	def _rec(tx, node, scope = None):
		if scope == None:
			scope = getScopeOf(tx, node)
		applyHashingOnScope(tx, scope)
		matchingNodes = [node] + getNodesWithSameHashInScope(tx, node, scope)
		matchingNodes = sorted(matchingNodes, key = lambda x: getRange(x)[0], reverse=True)

		# the assertion: here all the matching nodes should have the right Code and ordered by its starting range from large to small	
		# print("matchingNodes bf", matchingNodes)

		# Remove all matching nodes that might be polluted by assignments
		for i in range(len(matchingNodes)):
			mnode = matchingNodes[i]
			if isLeftAssignment(tx, mnode, scope) and mnode['Id'] != node['Id']:
				matchingNodes = matchingNodes[i+1:]
				break
	
		# the assertion: only the nodes before the first assignment if left
		# print("matchingNodes after left assignment test", matchingNodes)
				
		new_res = []
		print(f"hash matchingNodes for {[node['Id'], node['Code'] if node['Code'] else node['Value']]}:", [[n['Id'], node['Code'] if node['Code'] else node['Value']] for n in matchingNodes])
		for matchingNode in matchingNodes:
			if isDirectInitializer(tx, matchingNode):				
				scope = getScopeOf(tx, matchingNode)
				leftNode = getAssignee(tx, matchingNode, scope)							
				# Make sure that the leftNode returned is not itself
				if leftNode and leftNode['Id'] != matchingNode['Id']:	
					# print('matchingNode', getCodeOf(tx, matchingNode))					
					# print('leftNode', getCodeOf(tx, leftNode))								
					identicalObjs, *_ = getIdenticalObjectInScope(tx, leftNode) # propagate 	
					print("identicalObjs", identicalObjs)
					new_res += identicalObjs
		matchingNodes += new_res		
		return matchingNodes		
	return list(set(_rec(tx, node, scope))), scope


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