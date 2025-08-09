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
        'PAYLOAD_IDENTIFIER_STR': "PAYLOAD"
    }

    blackList = blackList || ['Program', 'ExpressionStatement']

	flattened = {
        "libkeys": [],
		"leaves": [],
		"constructs": {},
        "payloads": []
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
        if(!blackList.includes(node.type)){            
            // generate key for the node
            nodeId = `${node.type}_${crypto.randomUUID().slice(0, 8)}`;
            
            // AST element specific copy function 
            flattened["constructs"][nodeId] = elementsToCopy(node, node.type)

            // without merge!!!!
            typeSpecificHook(nodeId, node, node['type'])


            // bookkeeping of the parent node
            if(!parentId){
                flattened["constructs"][nodeId]["root"] = true
            } else {
                flattened["constructs"][nodeId]["next"] = [[parentId, parentKey]]
            }
        }
        // recursive call
        let leaves = true
        for (var key in node) { 
            if (node.hasOwnProperty(key)) {
                var child = node[key];
                if (typeof child === 'object' && child !== null) { 
                    leaves = false
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
        
        // no traversable elements
        if(leaves){
            leafSet.add(nodeId)
        }
        return nodeId
    }

    ast = esprimaParser.parseAST(poc, {range: false, loc: false})        
    astDfsWAlk(undefined, undefined, ast)

    // merge, bottom up level by level traversing, for accurate identical node hash matching
    // let traverse = [[...leafSet]]
    // while(true){
    //     levelNodes = traverse[traverse.length-1]
    //     let tmpSet = new Set()
    //     for(leaf of levelNodes){            
    //         if('next' in flattened["constructs"][leaf]){
    //             next = flattened["constructs"][leaf]['next']
    //             for([n, key] of next){
    //                 tmpSet.add(n)
    //             }
    //         }
    //     }
    //     if(tmpSet.size === 0){
    //         break
    //     }
    //     else{
    //         traverse.push([...tmpSet])
    //     }
    // }

    // // console.log("traverse", traverse)

    // to_del = []
    // for(i = 0; i < traverse.length; i++){
    //     level = traverse[i]
    //     for(nodeId of level){
    //         obj = flattened["constructs"][nodeId]
    //         const clone = { ...obj }; 
    //         clone['next'] = undefined
    //         objHash = getObjHash(clone)
    //         if(uniqueObjSet[objHash] === undefined){
    //             uniqueObjSet[objHash] = nodeId
    //             // type specific hook, libkey id are added here
    //             typeSpecificHook(nodeId, obj, obj['type'])
    //         }
    //         else{
    //             // append its next to the duplicated node's next
    //             mynext = obj['next']
    //             if(mynext){
    //                 // console.log('flattened["constructs"][uniqueObjSet[objHash]]["next"]', flattened["constructs"][uniqueObjSet[objHash]]['next'])
    //                 flattened["constructs"][uniqueObjSet[objHash]]['next'] = [...flattened["constructs"][uniqueObjSet[objHash]]['next'], ...mynext]
    //                 // change the parent node's property too
    //                 for([parentId, prop] of mynext){
    //                     if(Array.isArray(flattened["constructs"][parentId][prop])){
    //                         flattened["constructs"][parentId][prop] = flattened["constructs"][parentId][prop].map(x => x === nodeId ? uniqueObjSet[objHash] : x);
    //                     }
    //                     else{
    //                         flattened["constructs"][parentId][prop] = uniqueObjSet[objHash]
    //                     }
    //                 }
    //                 if(i !== 0){
    //                     // go back and delete the next having me
    //                     for(prevNodeId of traverse[i-1]){
    //                         element = flattened["constructs"][prevNodeId]
    //                         if('next' in element){                                
    //                             element['next'] = element['next'].filter(x => x[0] !== nodeId)
    //                         }
    //                     }
    //                 }
    //                 to_del.push(nodeId)
    //                 if(leafSet.has(nodeId)){
    //                     leafSet.delete(nodeId)
    //                 }
    //             }
    //         }
    //     }
    // }
    // for([nodeId, obj] of Object.entries(flattened["constructs"])){
    //     const clone = { ...obj }; 
    //     clone['next'] = undefined
    //     objHash = getObjHash(clone)
    //     if(uniqueObjSet[objHash] === undefined){
    //         uniqueObjSet[objHash] = nodeId
    //         // type specific hook, libkey id are added here
    //         typeSpecificHook(nodeId, obj, obj['type'])
    //     }
    //     else{
    //         // append its next to the duplicated node's next
    //         mynext = obj['next']
    //         flattened["constructs"][uniqueObjSet[objHash]]['next'] = [...flattened["constructs"][uniqueObjSet[objHash]]['next'], ...mynext]
    //         to_del.push(nodeId)
    //         if(leafSet.has(nodeId)){
    //             leafSet.delete(nodeId)
    //         }
    //     }
    // }

    // console.log("to_del", to_del)
    // for(d of to_del){
    //     delete flattened['constructs'][d]
    // }

    //  post-processing
    flattened["leaves"] = [...leafSet]

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
        console.error("Usage: node pocparser.js '<[\"code1\", \"code2\"]>'");
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