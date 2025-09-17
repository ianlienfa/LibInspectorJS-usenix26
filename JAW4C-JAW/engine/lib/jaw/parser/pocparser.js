const { Operation } = require('php-parser');
var esprimaParser = require('./jsparser');
const crypto = require('crypto');
const { traverse } = require('esmangle/lib/common');

function getObjHash(obj){
    const json = JSON.stringify(obj); // stable serialization
    return crypto.createHash('md5').update(json).digest('hex');
}

function pocFlattenedTreeGen(poc, blackList = undefined, options = undefined, typeSpecificHook = undefined, elementsToCopy = undefined){
    allbut = (node, constructArr) => { 
        res = {}
        for (var key in node) { 
            if (node.hasOwnProperty(key) && (!constructArr.includes(key))) {
                var child = node[key];
                if (child !== null) { 
                    if(typeof child !== 'object'){
                        res[key] = child
                    }
                    else {
                        res[key] = undefined
                    }
                }
            }
        }
        return res
    }

    options = options || {
        'LIBOBJ_IDENTIFIER_STR': "LIBOBJ",
        'PAYLOAD_IDENTIFIER_STR': "PAYLOAD",
        'WILDCARD_IDENTIFIER_STR': "WILDCARD",
    }

    blackList = blackList || ['Program', 'ExpressionStatement']

	flattened = {
        "libkeys": [],
		"constructs": {},
        "payloads": [],
        "search_order": {},
        "root": ""
	}

    leafSet = new Set()
    uniqueObjSet = {}
    
    elementsToCopy = elementsToCopy || function elementsToCopy(node, type){
        switch(type) {       
        case "AssignmentExpression":
            return allbut(node, ['operator'])
        case "MemberExpression":
            // remove property match if the POC has computed property
            return (node["computed"] === true) ? allbut(node, ['operator', 'computed', 'property']) : allbut(node, ['operator', 'computed']) 
        case "Literal":
            return allbut(node, ['raw'])
        case "Identifier":
            return (Object.values(options).includes(node["name"]) ? allbut(node, ['type']) : allbut(node, []))
        default:
            return allbut(node, [])
        }
    }

    typeSpecificHook = typeSpecificHook || function typeSpecificHook(nodeId, node, type){
        switch(type) {        
            case "Identifier":
                if(node["name"] === options.LIBOBJ_IDENTIFIER_STR){
                    flattened["libkeys"].push(nodeId)
                }
                if(node["name"] === options.PAYLOAD_IDENTIFIER_STR){
                    flattened["payloads"].push(nodeId)
                }
            default:
                break
        }
    }

    function astDfsWAlk(parentId, parentKey, node){
        let nodeId = undefined
        let lv = undefined
        if(!blackList.includes(node.type)){            
            // generate key for the node
            nodeId = `${node.type}_${crypto.randomUUID().slice(0, 8)}`;
            
            // AST element specific copy function 
            flattened["constructs"][nodeId] = elementsToCopy(node, node.type)

            if(!parentId){
                lv = flattened["constructs"][nodeId]['level'] = 0
            }
            else{
                lv = flattened["constructs"][nodeId]['level'] = flattened["constructs"][parentId]['level'] + 1
            }

            // without merge!!!!
            typeSpecificHook(nodeId, node, node['type'])

            // bookkeeping of the parent node
            if(!parentId){
                flattened["constructs"][nodeId]["root"] = true
                flattened["root"] = nodeId
            } else {
                flattened["constructs"][nodeId]["next"] = [[parentId, parentKey]]
            }

            // build search order
            if(!flattened['search_order'].hasOwnProperty(lv)){
                flattened['search_order'][lv] = []
            }
            flattened['search_order'][lv].push(nodeId)
        }

        // recursive call
        for (var key in node) { 
            if (node.hasOwnProperty(key)) {
                var child = node[key];
                if (typeof child === 'object' && child !== null) { 
                    if (Array.isArray(child)) {
                        if(!blackList.includes(node.type)){
                            flattened["constructs"][nodeId][key] = []
                        }
                        for(let prop of child){ 
                            argId = astDfsWAlk(nodeId, key, prop)
                            if(!blackList.includes(node.type)){
                                flattened["constructs"][nodeId][key].push(argId);  
                            }
                        }
                    } else {
                        childId = astDfsWAlk(nodeId, key, child);
                        if(!blackList.includes(node.type)){
                            flattened["constructs"][nodeId][key] = childId
                        }
                    }
                }
            }
        }
        return nodeId
    }

    ast = esprimaParser.parseAST(poc, {range: false, loc: false})        
    astDfsWAlk(undefined, undefined, ast)
    search_order = (Object.keys(flattened['search_order'])).sort((a, b) => b - a).map(k => flattened['search_order'][k])
    flattened['search_order'] = search_order

    return flattened
}


function pocsFlattening(pocArr){
	pocFlattenedArr = []
	for(poc of pocArr){
		pocFlattenedArr.push(pocFlattenedTreeGen(poc))
	}
    return pocFlattenedArr
}

module.exports = {
    pocsFlattening,
    pocFlattenedTreeGen
};

// For direct CLI usage:
if (require.main === module) {
    const fs = require('fs');

    // Read JSON input from command-line argument or stdin
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: node pocparser.js '[\"code1\", \"code2\"]'");
        process.exit(1);
    }

    try {
        const pocArray = JSON.parse(args[0]);  // Expect JSON array of code strings
        const result = pocsFlattening(pocArray);
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Invalid input or execution error:", err.message);
        process.exit(1);
    }

    // vuln_info = {"module_id": '692', "poc_str": ["LIBOBJ.html = LIBOBJ.html(data = PAYLOAD)"] }	
    // result = pocsFlattening(vuln_info['poc_str'])
    // console.log(JSON.stringify(result))
}