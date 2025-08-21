const esprima = require('esprima');


// only recursively walk when seeing [ExpressionStatement, ...]
// bring up the stack after each recursion

// Assuming POCs are only composed of ExpressionStatements 

function walker(astNode, functionTable, offset) {
	function stop() { throw stop; }
	var recurse = function (astNode) {
		if (!astNode || typeof astNode !== 'object' || !astNode.type) {
			return astNode;
		}

		// range based recursion: only recurse when the astNode is in range
		if (offset !== undefined && astNode.range &&
		    (astNode.range[0] > offset || astNode.range[1] < offset)) {
			return astNode;
		}

		var fn = functionTable[astNode.type] || functionTable.default || checkProps;
		return fn(astNode, recurse, stop);
	};
	var ret;
	try {
		ret = recurse(astNode);
	} catch (e) {
		if (e !== stop)
			throw e;
	}
	return ret;
}

BLACK_LIST = ['ExpressionStatement']

function pocFlattenedTreeGen(poc, blackList = BLACK_LIST){
    
}


function pocsFlattening(pocArr){
	pocFlattenedArr = []
	for(poc of pocArr){
		pocFlattenedArr.push(pocFlattenedTreeGen(poc))
	}
}
