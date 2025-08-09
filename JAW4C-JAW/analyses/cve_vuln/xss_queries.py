import re
import code

SRC_QUERY_STR = {
    'document.location': "(w {Code: 'window'})<-[:AST_parentOf{RelationType: 'object'}]-(src {Type: 'MemberExpression'})-[:AST_parentOf{RelationType: 'property'}]->(l {Code: 'location'})",
    'document.cookie': "(w {Code: 'document'})<-[:AST_parentOf {RelationType: 'object'}]-(src {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(p {Code: 'cookie'})",
    'document.referrer': "(w {Code: 'document'})<-[:AST_parentOf {RelationType: 'object'}]-(src:MemberExpression)-[:AST_parentOf {RelationType: 'property'}]->(:Identifier {Code: 'referrer'})"
}

def get_replaced_query(template, params):
    pattern = r"\$[\w]+"
    result = template
    for (key, val) in params.items():
        val = '\'' + val + '\''
        pattern = re.compile(r"\$" + key)
        result = re.sub(pattern, val, result)
    return result

def vuln_existence_query(tx, params):
    """
        query for identifying if the vulnerable function is in used
        params = {'module_id': <>, func_name: '<func_name>'}	
    """    
    query = """
        // look for library obj assignment
        MATCH (vd {Type: 'VariableDeclarator'})-[:AST_parentOf]->(v {Type: 'Identifier'}),
        // look for require function call with the given id
        (vd {Type: 'VariableDeclarator'})-[:AST_parentOf*1..]->(id {Type: 'Literal', Value: $module_id}),
        // look for the current scope (too strict for now)
        (bs {Type: 'BlockStatement'})-[:AST_parentOf*1..]->(vd {Type: 'VariableDeclarator'}),
        // look for member usage for that library object in this scope
        (bs {Type: 'BlockStatement'})-[:AST_parentOf*]->(mem {Type: 'MemberExpression'}),
        (mem {Type: 'MemberExpression'})-[:AST_parentOf*]->(vuln {Type: 'Identifier'})
        // the name matching of the require/usage for library obj
        // the matching of vulnerable function member name
        // return the callexpression
        WHERE vuln.Code=$vuln_func

        MATCH p = (vuln)<-[:AST_parentOf*]-(callexpr {Type: 'CallExpression'})
        WITH vuln, callexpr, length(p) as depth
        ORDER BY depth ASC LIMIT 1

        // get the argument of the vulnerable function call: 'e' from html(e)
        WITH vuln as vuln_id, callexpr as vuln_callexpr
        MATCH (vuln_callexpr)-[:AST_parentOf{RelationType: 'arguments'}]->(e {Type: 'Identifier'})

        // get the innermost expressionStatement of e_cfg for dataflow analysis
        WITH e
        MATCH p = (e)<-[:AST_parentOf*]-(e_cfg{Type:'ExpressionStatement'})
        WITH e, e_cfg, length(p) as depth
        ORDER BY depth LIMIT 1

        // get the topmost dataflow then the innermost functionDecl
        MATCH p = (e_cfg)<-[:CFG_parentOf|PDG_parentOf*1..100]-(wl)
        WITH length(p) as depth, wl, e_cfg
        ORDER BY depth DESC LIMIT 1
        MATCH p = (wl)-[:AST_parentOf*0..100]-(vuln_func_dcl)
        WHERE vuln_func_dcl.Type IN [
        'FunctionDeclaration',
        'ArrowFunctionExpression',
        'FunctionExpression'
        ]
        WITH length(p) as depth, wl, e_cfg, vuln_func_dcl
        ORDER BY depth ASC LIMIT 1

        WITH wl, vuln_func_dcl
        // get the scope of the function declaration
        MATCH p = (vuln_func_dcl)<-[:AST_parentOf*]-(scope)
        WHERE scope.Type IN [
        'Program',
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'BlockStatement'
        ]
        WITH length(p) as depth, vuln_func_dcl, scope
        ORDER BY depth ASC LIMIT 1
        RETURN vuln_func_dcl, scope
    """    
    query = get_replaced_query(query, params)
    q_res = tx.run(query)
    res = []
    for record in q_res:
        print("vuln_func_dcl:", record['vuln_func_dcl'])
        print("scope", record['scope'])
        res.append((record['vuln_func_dcl']._properties['Id'], record['scope']._properties['Id']))
    return res

def vuln_func_data_flow_trace(tx, func_dcl_id, scope_id, src_str):
    query = """
        MATCH (vuln_func_dcl {Id: $vuln_func_dcl})
        MATCH (scope {Id: $scope})
        OPTIONAL MATCH (vuln_func_dcl)-[:AST_parentOf {RelationType: 'id'}]->(func_id_decl{Type: 'Identifier'})
        OPTIONAL MATCH (vuln_func_dcl)<-[:AST_parentOf {RelationType: 'right'}]-(asign)-[:AST_parentOf {RelationType: 'left'}]->(func_id_expr {Type: 'Identifier'})
        WITH
        vuln_func_dcl,
        func_id_decl,
        func_id_expr,
        scope
        WITH
        CASE
            WHEN vuln_func_dcl.Type = 'FunctionDeclaration' AND func_id_decl IS NOT NULL THEN func_id_decl
            WHEN (vuln_func_dcl.Type = 'FunctionExpression' OR vuln_func_dcl.Type = 'ArrowFunctionExpression') AND func_id_expr IS NOT NULL THEN func_id_expr
            ELSE null
        END AS func_id, scope

        // XSS: window.location
        // window.location member expression fetch
        MATCH %s
        // check 1. if member expression is under the current scope
        OPTIONAL MATCH match1 = (scope{Type:'BlockStatement'})-[:AST_parentOf*]->(src)
        // check 2. if member expression is within the CallExpression of the vulnerable wrapped function
        OPTIONAL MATCH match2 = (src)<-[:AST_parentOf*1..100]-(src_topmost)-[:PDG_parentOf|CFG_parentOf*]->(func_call_cfg_topmost)-[:AST_parentOf*0..100]->(callexpr {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]->(func{Code:func_id.Code})
        RETURN src, callexpr AS sink, match2, scope,
        CASE WHEN match1 is not null AND match1 is not null
          THEN true
          ELSE null
        END AS sat
    """%(SRC_QUERY_STR[src_str])
    params = {'vuln_func_dcl':func_dcl_id, 'scope': scope_id}
    query = get_replaced_query(query, params)
    print(query)
    q_res = tx.run(query)
    
    sat_set = {}
    for record in q_res:
        if record['sat']:
            sat_set['src'] = record['src']
            sat_set['sink'] = record['sink']
            sat_set['scope'] = record['scope']
    
    print("sat_set", sat_set)


def xss_query_1(tx, params):
    res = vuln_existence_query(tx, params) # [(vuln_func_dcl.id, scope.id), ...]
    vuln_func_data_flow_trace(tx, res[0][0], res[0][1], 'document.cookie')    