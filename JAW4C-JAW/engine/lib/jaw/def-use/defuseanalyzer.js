/*
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
*/

/*
 * Def-Use analyzer
 */
var varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    varfactory = require('./varfactory'),
    dupairFactory = require('./dupairfactory'),
    pairFactory = require('./pairfactory'),
    scopeCtrl = require('./../scope/scopectrl'),
    modelCtrl = require('./../model/modelctrl'),
    FlowNode = require('../../esgraph/flownode'),
    loggerModule = require('./../../../core/io/logging'),
    constantsModule = require('./../constants');

var Set = require('../../analyses/set'),
    walkes = require('walkes'),
    // walkes = require('../../esgraph/walkes'),
    worklist = require('../../analyses'),
    Map = require('core-js/es6/map');

const util = require('util');
var escodegen = require('escodegen');

/**
 * DefUseAnalyzer
 * @constructor
 */
function DefUseAnalyzer() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
        _analyzeBuiltInObjects: analyzeBuiltInObjects,
        _analyzeDefaultValueOfLocalVariables: analyzeDefaultValueOfLocalVariables,
        _analyzeClosureVariables: analyzeClosureVariables,
        _getVarDefsOfLocalVariablesReachingInExitNode: getVarDefsOfLocalVariablesReachingInExitNode,
        _findVariableAndItsDefinitionsFromASet: findVariableAndItsDefinitionsFromASet,
        _getNonReachableVarDefs: getNonReachableVarDefs
    };
    /* end-test-block */
}



/**
 * Analyze an intra-procedural model to create and set the GEN set of the definitions for built-in objects
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function analyzeBuiltInObjects(model) {
    'use strict';
    if(!model.graph) return;
    var builtInObjectVars = model.mainlyRelatedScope.builtInObjectVars;
    var builtInObjects = model.mainlyRelatedScope.builtInObjects;
    var vardefOfBuiltInObjects = new Set();
    var modelGraphEntryNode = model.graph[0];

    builtInObjects.forEach(function (objDescriptor) {
        var variable = builtInObjectVars.get(objDescriptor.name);
        vardefOfBuiltInObjects.add(varDefFactory.createGlobalVarDef(variable, modelGraphEntryNode, objDescriptor.def));
    });

    modelGraphEntryNode.generate = Set.union(modelGraphEntryNode.generate, vardefOfBuiltInObjects);
}

/**
 * Analyze an intra-procedural model to create and set GEN set of the default definition of local variables
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function analyzeDefaultValueOfLocalVariables(model) {
    "use strict";
    if(!model.graph) return;
    var scope = model.mainlyRelatedScope;
    var scopeEntryNode = model.graph[0];
    var vardefOfLocalVars = new Set();

    var ast = (scopeEntryNode.astNode.type === 'Program')? scopeEntryNode.astNode : scopeEntryNode.astNode.body;
    walkes(ast, {
        VariableDeclaration: function (node) {
            for(let declarationNode of node.declarations){
                var varName = scope.vars.get(declarationNode.id.name);
                if (!!varName && !scope.hasNamedFunction(varName) && !scope.hasBuiltInObject(varName)){
                    vardefOfLocalVars.add(varDefFactory.create(varName, defFactory.createUndefinedDef(scopeEntryNode, declarationNode.range, node)));
                }         
            }
        }
    });

    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfLocalVars);


}

/**
 * Analyze definition of declaration of inner functions
 * @param {Model} model
 */
function analyzeFunctionDeclaration(model) {
    "use strict";
    if(!model.graph) return;

    var scope = model.mainlyRelatedScope;
    var scopeEntryNode = model.graph[0];
    var vardefOfNamedFunctions = new Set();

    var ast = (scopeEntryNode.astNode.type === 'Program')? scopeEntryNode.astNode : scopeEntryNode.astNode.body;
    walkes(ast, {
        FunctionDeclaration: function (node) {
            var funVar = scope.namedFunctionVars.get(node.id.name);
            if (!!funVar) {
                vardefOfNamedFunctions.add(varDefFactory.create(funVar, defFactory.createFunctionDef(scopeEntryNode, node.range, node)));
            }
        },


    });
    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfNamedFunctions);
    // console.log("GEN", scopeEntryNode.astNode.type, scope.params)
}


/**
 * Analyze closure variables: variables used in a function but defined in parent scopes
 * OLD VERSION: Creates fake definitions at entry node (broken PDG chains)
 * This is kept for initial analysis pass before parent reachOuts are available
 * @param {Model} model
 */
function analyzeClosureVariables(model) {
    "use strict";
    if(!model.graph) return;

    var scope = model.mainlyRelatedScope;

    // Only function scopes have closures (not Program/domain scopes)
    if(!scope.parent || scope.type === 'page' || scope.type === 'domain') {
        return;
    }

    var scopeEntryNode = model.graph[0];
    var vardefOfClosureVars = new Set();

    // Use the scope's AST (the function node) to walk the entire function body
    // For Program scopes, use the entry node's AST, for functions use scope.ast.body
    var ast = (scope.type === 'page') ? scopeEntryNode.astNode : scope.ast.body;

    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] Analyzing scope:', scope.name, `(${scope.ast.loc.start.line}, ${scope.ast.loc.start.column}), (${scope.ast.loc.end.line}, ${scope.ast.loc.end.column})`);
    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] Scope type:', scope.type);
    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] Scope AST type:', scope.ast ? scope.ast.type : 'null');
    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] AST to walk type:', ast ? ast.type : 'null');

    // Collect all identifiers used in this scope
    var usedIdentifiers = new Set();
    walkes(ast, {
        Identifier: function (node) {
            usedIdentifiers.add(node.name);
        }
    });

    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] Used identifiers:', Array.from(usedIdentifiers));

    // For each identifier, check if it's a closure variable
    usedIdentifiers.forEach(function(varName) {
        // Skip if it's a local variable/param in this scope
        if(scope.hasLocalVariable(varName)) {
            constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE]   -', varName, 'is local, skipping');
            return;
        }

        // Check if defined in parent scope (getVariable walks up the parent chain)
        if(scope.hasVariable(varName)) {
            constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE]   -', varName, 'is closure variable, adding to GEN');
            var closureVar = scope.getVariable(varName);
            // Create a def for this closure variable at entry node
            vardefOfClosureVars.add(
                varDefFactory.create(closureVar,
                    defFactory.createLiteralDef(scopeEntryNode, scope.ast.range))
            );
        } else {
            constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE]   -', varName, 'not found in any scope');
        }
    });

    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE] Found', vardefOfClosureVars.size, 'closure variables');

    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfClosureVars);
}

/**
 * Analyze closure variables using REAL definitions from parent scope's reachOuts
 * NEW VERSION: Links parent scope definitions via extraReachIns (proper PDG chains)
 * This should be called AFTER parent scope has been analyzed and has reachOuts
 * @param {Model} model The child scope model
 * @param {ScopeTree} scopeTree The scope tree containing the model
 */
function analyzeClosureVariablesWithParentDefs(model, scopeTree) {
    "use strict";
    if(!model.graph) return;

    var scope = model.mainlyRelatedScope;
    // Only function scopes have closures (not Program/domain scopes)
    if(!scope.parent || scope.type === 'page' || scope.type === 'domain') {
        return;
    }

    var scopeEntryNode = model.graph[0];

    // Collect identifiers used in this function
    var ast = (scope.type === 'page') ? scopeEntryNode.astNode : scope.ast.body;
    var usedIdentifiers = new Set();
    walkes(ast, {
        Identifier: function (node) {
            usedIdentifiers.add(node.name);
        }
    });

    // Find closure variables and their REAL definitions from parent
    var closureVarDefs = new Set();

    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE-LINK] Analyzing scope:', scope.name, `(${scope.ast.loc.start.line}, ${scope.ast.loc.start.column}), (${scope.ast.loc.end.line}, ${scope.ast.loc.end.column})`);

    usedIdentifiers.forEach(function(varName) {
        // Skip if local to this scope
        if(scope.hasLocalVariable(varName)) {
            return;
        }

        // Check if defined in parent scope
        var scopeAndVar = scope.hasVariableGetScope(varName)
        if(scopeAndVar !== null) {
            var parentScope = scopeAndVar[0];
            var closureVar = scopeAndVar[1];

            // Get parent scope's model
            var parentModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, parentScope);

            if (!parentModel || !parentModel.graph) {
                constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE-LINK] Parent model not available for scope:', scope.name);
                return;
            }

            var parentExitNode = parentModel.graph[1];  // Exit node
            var parentReachOuts = parentExitNode.reachOuts || new Set();
            constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE-LINK] Parent reachOuts count:', parentReachOuts.size);

            if (parentReachOuts.size === 0) {
                constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE-LINK] Parent has no reachOuts for scope:', scope.name);
                return;
            }

            // Find the REAL VarDef from parent's reachOuts
            var foundCount = 0;
            parentReachOuts.forEach(function(parentVarDef) {
                if (parentVarDef.variable === closureVar) {
                    closureVarDefs.add(parentVarDef);  // Use real VarDef!
                    foundCount++;
                }
            });

            constantsModule.DEBUG_CLOSURE_ANALYSIS && foundCount > 0 && console.log(
                '[CLOSURE-LINK]   Found', foundCount, 'real definitions for closure variable:', varName
            );
        }
    });

    if (closureVarDefs.size === 0) {
        constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log('[CLOSURE-LINK] No closure variables found for scope:', scope.name);
        return;
    }

    // Set extraReachIns on entry node to receive parent's definitions
    if (!scopeEntryNode.extraReachIns) {
        scopeEntryNode.extraReachIns = new Set();
    }

    // Clear any fake definitions from generate that were added by old analyzeClosureVariables
    // (We keep other GEN items like function declarations, just remove closure fakes)
    // if (scopeEntryNode.generate) {
    //     var newGenerate = new Set();
    //     scopeEntryNode.generate.forEach(function(vardef) {
    //         var isClosure = false;
    //         usedIdentifiers.forEach(function(varName) {
    //             if (!scope.hasLocalVariable(varName) &&
    //                 scope.hasVariable(varName) &&
    //                 vardef.variable === scope.getVariable(varName)) {
    //                 isClosure = true;
    //             }
    //         });
    //         if (!isClosure) {
    //             newGenerate.add(vardef);
    //         }
    //     });
    //     scopeEntryNode.generate = newGenerate;
    // }

    // Add parent's real VarDefs to extraReachIns
    scopeEntryNode.extraReachIns = Set.union(
        scopeEntryNode.extraReachIns,
        closureVarDefs
    );

    constantsModule.DEBUG_CLOSURE_ANALYSIS && console.log(
        '[CLOSURE-LINK] Set', closureVarDefs.size, 'parent definitions as extraReachIns for scope:', scope.name
    );
}

/**
 * Initially analyze intra-procedural models
 */
DefUseAnalyzer.prototype.initiallyAnalyzeIntraProceduralModels = function () {
    "use strict";
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    pageScopeTrees.forEach(function (scopeTree) {
        var scopes = scopeTree.scopes;
        scopes.forEach(function (scope) {            
            var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);

            /* Calling this will create ReachIn definitions
             * for Builtin objects (e.g., window, document)
             * specified in scope/pagescope.js. However,
             * since we cannot add PDG edges for such built-in definitions (no definiton node),
             * we do not also need to store the ReachIn definitions in nodes.
             */
            // analyzeBuiltInObjects(model);
            analyzeDefaultValueOfLocalVariables(model);
            analyzeFunctionDeclaration(model);
            // analyzeClosureVariables(model);


        });
    });
};


/**
 * Sets the set of exportable objects for each model, i.e., `Program` or FILE nodes.
 */
DefUseAnalyzer.prototype.setExitNodeReachIns = function (){
    'use strict';

    // file name -> file exportables (variables, functions)
    // var fileMap = { }; 

    modelCtrl.collectionOfPageModels.forEach(function (pageModel) {
        
        // get all intra-procedural scope models
        var intraProceduralFileModels = pageModel.intraProceduralModels;

        // get the model for the `Program` node scope among all intra-procedural scopes
        // instance of `Model`
        var fileModel = intraProceduralFileModels[0]; 
        if(!fileModel.graph) return;  


        // --------------------------------------------------- // 
        //          Only for Future References 
        // --------------------------------------------------- // 

        // get the `Scope` instance of the fileModel
        // var fileGlobalScope = fileModel.mainlyRelatedScope;
        // var funcs = fileGlobalScope.namedFunctionVars;
        // var vars  = fileGlobalScope.vars;


        // the reachIns on the CFG `exit` node are all the possible variables and functions that
        // can be used/imported in other files
        // but this has redundant results!
        // console.log(fileModel.mainlyRelatedScope.name);
        // fileModel.graph[1].reachIns.forEach( reachInDefinitionObject => {
        //     let n = reachInDefinitionObject.definition.fromNodeActual;
        //     loggerModule.consoleLog(n);
        // });


        // alternatively, we can use the `generate` attribute previously set for the `Program` nodes
        // which is set in `analyzeFunctionDeclaration` and `analyzeDefaultValueOfLocalVariables`
        // For example:
        // console.log(fileModel.mainlyRelatedScope.name);
        // cfgEntryNode.generate.forEach(varDefObject => {
        //     console.log(varDefObject.definition.fromNodeActual);
        //     console.log(varDefObject.variable.name)
        // });


        // --------------------------------------------------- // 
        //          Exportable Objects 
        // --------------------------------------------------- // 

        /**
         * Note: 
         *  The object `cfgEntryNode.generate` contains a list of `VarDef` items.
         *  Each `VarDef` object is a dictionary with `var` and `def` keys.
         *  The `var` stores under the `name` property the name of the exportable identifer object 
         *  The `def` stores under the `fromNodeActual` the exact node where the item is defined.
         *  As such, when exporting the HPG, we should set the list of exportable items on each `fileModel`, and then 
         *  connect a PDG edge from each exportable item to the entry `Program` node of that 
         *  file accessible via `fileModel.graph[0].astNode`.
         */

        let cfgEntryNode = fileModel.graph[0];
        // let fileName = cfgEntryNode.astNode.value;
        // fileMap[fileName] = cfgEntryNode.generate;
        fileModel.exitNodeReachIns = cfgEntryNode.generate.values(); // .values() -> make sure to pass a List, not a Set
        // loggerModule.consoleLog(fileModel.exitNodeReachIns);

    });

}

/**
 * Get Def-Use pairs of a model
 * @param {Model} model
 */
DefUseAnalyzer.prototype.findDUPairs = function (model) {
    'use strict';
    if(!model.graph) return;
    var dupairs = new Map();


    for(let node of model.graph[2]){
        // console.log("node.reachIns for node: ", (!!node.astNode) && `{${node.astNode.loc.start.line}, ${node.astNode.loc.start.column}} - {${node.astNode.loc.end.line}, ${node.astNode.loc.end.column}}`);
        // (!!node.reachIns._values) && node.reachIns._values.forEach(vardef => {            
        //     console.log(`${(!!vardef.variable.name) && vardef.variable.name} at {${(vardef.definition?.fromNodeActual?.loc.start.line)}, ${vardef.definition.fromNodeActual?.loc.start.column}}`)
        //     debugger;
        // });

        var nodeCUse = getUsedDefs(node.reachIns, node.cuse),
            nodePUse = getUsedDefs(node.reachIns, node.puse);
        
        // console.log(nodeCUse.values().toString());
        // console.log(node.astNode);
        // console.log('---')


        // @Note: elem is an instance of VarDef object
        /// Initialization
        if(node.reachIns){
            for(let elem of  node.reachIns.values()){
                var pairs = dupairs.get(elem.variable) || new Set();
                dupairs.set(elem.variable, pairs);         
            }


        }
        /// add Def-Use pairs of c-use
        for(let elem of nodeCUse.values()){
            var pairs = dupairs.get(elem.variable);
            if(pairs){
                /// Assume each id of CFG nodes will be different
                pairs.add(dupairFactory.create(elem.definition.fromNode, node));
                dupairs.set(elem.variable, pairs);         
            }             
        }



        /// add Def-Use pairs of p-use
        for(let elem of nodePUse.values()){
            var pairs = dupairs.get(elem.variable);
            /// Assume each id of CFG nodes will be different
            // pairs.add(dupairFactory.create(elem.definition.fromNode, pairFactory.create(node, node.true)));
            // pairs.add(dupairFactory.create(elem.definition.fromNode, pairFactory.create(node, node.false)));
            // pairs.add(dupairFactory.create(elem.definition.fromNode, [node, node.true, 'true']));
            // pairs.add(dupairFactory.create(elem.definition.fromNode, [node, node.false, 'false']));
            
            // PDG control dependence edges
            var ifStatement = node.parent;
            if(ifStatement) { // not null
                pairs.add(dupairFactory.create(elem.definition.fromNode, [ifStatement, ifStatement.consequent, ifStatement.alternate])); // node, true, false
            }
            dupairs.set(elem.variable, pairs);
        };
    };

    model.dupairs = dupairs;
}


/**
 * Get used definitions by getting the intersection of RD and USE
 * @param defs reaching definitions
 * @param used used definition names
 * @returns used definitions
 */
function getUsedDefs(defs, used) {
    
    'use strict';
    var usedDefs = new Set();
    if (defs instanceof Set && used instanceof Set) {
        defs.forEach(function (vardef) {
            used.forEach(function (variable) {
                if (vardef.variable === variable) {
                    usedDefs.add(vardef);
                }
            });
        });  
    }
    return usedDefs;
}

/**
 * Do reach definition analysis
 * @param {Model} model
 */
DefUseAnalyzer.prototype.doAnalysis = function (model) {
    "use strict";
    var thisAnalyzer = this;
    var reachDefinitions = worklist(
        model.graph,
        function (input) { /// input = ReachIn(n)

            var currentNode = this;
            
            if (!!currentNode.extraReachIns) {
                if (!!input) {
                    input = Set.union(input, currentNode.extraReachIns);
                } else {
                    input = new Set(currentNode.extraReachIns);
                }
            }

            var kill = currentNode.kill || thisAnalyzer.findKILLSet(currentNode);
            var UseSet = thisAnalyzer.findUSESet(currentNode); // set c-use & p-use on flow node
            
            var generate = currentNode.generate || thisAnalyzer.findGENSet(currentNode);   
          
            // console.log('useset', UseSet.cuse.values().toString());
            // console.log('generate', generate.values().toString());
            // console.log('---')

            if (!!currentNode.scope) {
                currentNode.scope.lastReachIns = new Set(input);
            }
           
            return  Set.union(Set.minus(input, kill), generate);
            // return  Set.union(input, generate);
        },
        {direction: 'forward', start: new Set()}
    );
    if(!reachDefinitions) return;

    reachDefinitions.inputs.forEach(async function (varDefSet, node) {

        // await console.log('id:' + node.uniqueId)
        // await varDefSet.forEach(o => console.log(o.toString()));
        // console.log(util.inspect(varDefSet, false, null, true /* enable colors */))
        node.reachIns = new Set(varDefSet);
        
  
    });
    reachDefinitions.outputs.forEach(function (varDefSet, node) {
        node.reachOuts = new Set(varDefSet);
    });

    return 1;
};

/**
 * Find variable and its definitions from a VarDef set
 * @param {Set} vardefSet
 * @param {Var} variable
 * @returns {Set}
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function findVariableAndItsDefinitionsFromASet(vardefSet, variable) {
    "use strict";
    var set = new Set();
    vardefSet.forEach(function (vardef) {
        if (vardef.variable === variable) {
            set.add(vardef);
        }
    });
    return set;
}

/**
 * Get local variables and its definitions from reach in definitions of an exit node
 * @param {FlowNode} exitNode
 * @returns {Set} Reach out set
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function getVarDefsOfLocalVariablesReachingInExitNode(exitNode, locals) {
    "use strict";
    var reachIns = exitNode.reachIns || new Set();
    var reachOuts = new Set();
    locals.forEach(function (localVariable) {
        var foundVarDefs = findVariableAndItsDefinitionsFromASet(reachIns, localVariable);
        reachOuts = Set.union(reachOuts, foundVarDefs);
    });
    return reachOuts;
}

/**
 * Get non-reachable VarDefs related to a scope
 * @param {Set} vardefSet
 * @param {Scope} scope
 * @returns {Set}
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function getNonReachableVarDefs(vardefSet, scope) {
    "use strict";
    var nonReachable = new Set();
    vardefSet.forEach(function (vardef) {
        if (vardef.variable !== scope.getVariable(vardef.variable.name)) {
            nonReachable.add(vardef);
        }
    });
    return nonReachable;
}


/**
 * Find set of variable and corresponding definitions which should be killed
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findKILLSet = function (cfgNode) {
    'use strict';
    var killedVarDef = new Set();
    var currentScope = cfgNode.scope;
    var reachIns = cfgNode.reachIns || new Set();
        if (cfgNode.type === FlowNode.EXIT_NODE_TYPE) {
            killedVarDef = Set.union(killedVarDef, getVarDefsOfLocalVariablesReachingInExitNode(cfgNode, currentScope.vars));
        } else if (cfgNode.type === FlowNode.ENTRY_NODE_TYPE) {
            killedVarDef = Set.union(killedVarDef, getNonReachableVarDefs(reachIns, currentScope));
        } else {
            walkes(cfgNode.astNode, {
                Program: function () {},
                ClassDeclaration: function () {},
                FunctionDeclaration: function () {},
                FunctionExpression: function () {},
                AssignmentExpression: function (node, recurse) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            (node.left.type === 'MemberExpression') ? currentScope.getVariable(node.left.object.name) : currentScope.getVariable(node.left.name)
                        )
                    );
                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {/// Sequential assignment
                        recurse(node.right);
                    }
                },
                UpdateExpression: function (node) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            currentScope.getVariable(node.argument.name)
                        )
                    );
                },
                SwitchCase: function () {},
                VariableDeclaration: function (node, recurse) {
                    for(let declarator of node.declarations){
                        recurse(declarator);
                    };
                },
                VariableDeclarator: function (node) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            currentScope.getVariable(node.id.name)
                        )
                    );
                }
            });
        }
    cfgNode.kill = killedVarDef;
    return killedVarDef;
};




/**
 * Find the set of variables and the corresponding definitions which will be generated
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findGENSet = function (cfgNode) {
    'use strict';
    var generatedVarDef = new Set();
    var currentScope = cfgNode.scope;
    var isFunctionArgument = false; // denotes if 'def' is function argument or a part of the function body 
    
    if(cfgNode.astNode){
        walkes(cfgNode.astNode, {
            // Program: function () {},
            Program: function(node, recurse){
                for(let n of node.body){
                    recurse(n);
                }

            },
            FunctionDeclaration: function (node) {
                if(node.params && node.params.length){
                    for(var i=0; i< node.params.length; i++){
                        var param = node.params[i];
                        if(param && param.name){
                            var definedVar = currentScope.getVariable(param.name);
                            if(!!definedVar){
                                generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
                            }
                        }
                    }
                }
            },
            FunctionExpression: function (node) {
                if(node.params && node.params.length){
                    for(var i=0; i< node.params.length; i++){
                        var param = node.params[i];
                        if(param && param.name){
                            var definedVar = currentScope.getVariable(param.name);
                            if(!!definedVar){
                                generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
                            }
                        }
                    }
                }
            },
            AssignmentExpression: function (node, recurse) {
                var definedVar = (node.left.type === 'MemberExpression') ? currentScope.getVariable(node.left.object.name) : currentScope.getVariable(node.left.name);
                if (!!definedVar) {
                    if (node.right.type === 'FunctionExpression') {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.right.range)));
                    } else {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.right.range)));
                        if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                            recurse(node.right);
                        }
                    }
                }
            },
            UpdateExpression: function (node) {
                var definedVar = currentScope.getVariable(node.argument.name);
                if (!!definedVar) {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
                }
            },
            CallExpression: function (node) {
                if(node.callee.type === 'MemberExpression' && node.callee.object.type == 'Identifier'){
                    var property_name = node.callee.property.name;
                    if(property_name && (property_name.includes('append') || property_name.includes('remove') || property_name === 'splice' ||
                       property_name === 'push' || property_name === 'pop' || property_name === 'shift' || property_name === 'unshift')){
                        var definedVar = currentScope.getVariable(node.callee.object.name);
                        if (!!definedVar) {
                            generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
                        }   
                    }
                }
            },
            VariableDeclaration: function (node, recurse) {
                for(let declarator of  node.declarations){
                    recurse(declarator);
                }
            },
            VariableDeclarator: function (node, recurse) {
                var definedVar = currentScope.getVariable(node.id.name);
                if (!!definedVar) {
                    if (!!node.init) {
                        if (node.init.type === 'FunctionExpression') {
                            generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.init.range)));
                        } else {
                            generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.init.range)));
                            recurse(node.init);
                        }
                    } else {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createUndefinedDef(cfgNode, node.range)));
                    }
                }
            },
            SwitchCase: function () {}
        });
    }
    cfgNode.generate = generatedVarDef;
    return generatedVarDef;
};

/**
 * Find the set of used variables (both c-use and p-use)
 * @Note P-use: predicate use – the variable is used when making a decision (e.g. if b > 6).
 * @Note C-use: computation use – the variable is used in a computation (for example, b = 3 + d – with respect to the variable d)
 * @param {FlowNode} cfgNode Graph node
 * @returns {Object} Object collects c-use set and p-use set
 */
DefUseAnalyzer.prototype.findUSESet = function (cfgNode) {
    'use strict';
    var cuseVars = new Set(), puseVars = new Set(),  isPUse = false;
    var currentScope = cfgNode.scope;

    walkes(cfgNode.astNode, {
        Program: function () {},
        ClassDeclaration: function () {},
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        AssignmentExpression: function (node, recurse) {
            if (node.right.type === 'AssignmentExpression') {
                recurse(node.right.left);
            } else {
                var selfAssignmentOp = ['+=', '-=', '*=', '/=', '%='];
                if (selfAssignmentOp.indexOf(node.operator) !== -1) {
                    recurse(node.left);
                }
            }
            recurse(node.right);
        },
        BinaryExpression: function (node, recurse) {
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.left);
            recurse(node.right);
            isPUse = false;
        },
        CallExpression: function (node, recurse) {
            // console.log(node)
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.callee);
            isPUse = false;
            
            for(let arg of node.arguments){
                recurse(arg);
            }

        },
        VariableDeclaration: function (node, recurse) {
            for(let decl of node.declarations){
                recurse(decl);
            }
        },
        VariableDeclarator: function (node, recurse) {
            if (!!node.init && node.init.type === 'AssignmentExpression') {
                recurse(node.init.left);
            }
            recurse(node.init);
        },
        UpdateExpression: function (node, recurse) {
            recurse(node.argument);
        },
        NewExpression: function (node, recurse) {
            recurse(node.callee);
            for(let arg of node.arguments){
                recurse(arg);
            }
        },
        UnaryExpression: function (node, recurse) {
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.argument);
            isPUse = false;
        },
        SwitchCase: function (node, recurse) {
            isPUse = true;
            if (!!node.test && !!cfgNode.parent && cfgNode.parent.type === 'SwitchStatement') {
                recurse(cfgNode.parent.discriminant);
            }
        },
        ConditionalExpression: function (node, recurse) {
            isPUse = true;
            recurse(node.test);
            isPUse = false;
            recurse(node.consequent);
            recurse(node.alternate);
        },
        MemberExpression: function (node, recurse) {
            recurse(node.object);
        },
        ReturnStatement: function(node, recurse){
            recurse(node.argument);
        },
        Identifier: function (node) {
            if (cfgNode.astNode.type !== 'Identifier') {
                var usedVar = currentScope.getVariable(node.name);
                if (!!usedVar) {
                    if (!isPUse) {
                        cuseVars.add(usedVar);
                    } else {
                        puseVars.add(usedVar);
                    }

                }
            }
        }
    });
    cfgNode.cuse = cuseVars;
    cfgNode.puse = puseVars;
    return {cuse: cuseVars, puse: puseVars};
};

/**
 * Analyze closure variables with parent definitions
 * @param {Model} model
 * @param {ScopeTree} scopeTree
 */
DefUseAnalyzer.prototype.analyzeClosureVariablesWithParentDefs = function (model, scopeTree) {
    "use strict";
    analyzeClosureVariablesWithParentDefs(model, scopeTree);
};

var singleton = new DefUseAnalyzer();
module.exports = singleton;





















