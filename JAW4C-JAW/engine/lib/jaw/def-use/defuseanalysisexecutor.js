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
 * DefUseAnalysisExecutor module
 */
var jsParser = require('../parser/jsparser'),
	scopeCtrl = require('../scope/scopectrl'),
	modelCtrl = require('../model/modelctrl'),
	modelBuilder = require('../model/modelbuilder'),
	defuseAnalyzer = require('./defuseanalyzer'),
	variableAnalyzer = require('./variableanalyzer'),
    flownodefactory = require('./../../esgraph/flownodefactory'), 
    constantsModule = require('./../constants'),
    loggerModule = require('./../../../core/io/logging');

const { performance } = require('perf_hooks');


function DefUseAnalysisExecutor() {
}

/* start-public-methods */
/**
 * Initialize
 * @param {Array} codeOfPages Source code of each page
 */
DefUseAnalysisExecutor.prototype.initialize = function (codeOfPages) {
	"use strict";
	if (codeOfPages instanceof Array) {
		codeOfPages.forEach(function (code) {
			var ast = jsParser.parseAST(code, {range: true, loc: true, tolerant: constantsModule.tolerantMode});
            jsParser.traverseAST(ast, function(node){
                if(node && node.type){
                    let _id = flownodefactory.count;
                    // if(flownodefactory.generatedExits.some(e => e.id == _id)){ // this statement is slow because of some(), replace with dictonary key lookup
                    if(_id in flownodeFactory.generatedExitsDict){
                         flownodefactory.count= flownodefactory.count + 1; 
                         _id = flownodefactory.count    
                    }
                    node._id = _id;
                    flownodefactory.count= flownodefactory.count + 1;           
                }
            });
			scopeCtrl.addPageScopeTree(ast);
		});
		modelCtrl.initializePageModels();
        variableAnalyzer.setLocalVariables(scopeCtrl.domainScope);
        scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
            pageScopeTree.scopes.forEach(function (scope) {
                variableAnalyzer.setLocalVariables(scope);
            });
        });
	}
};


/**
 * Build model graphs for each intra-procedural model in every PageModels
 */
DefUseAnalysisExecutor.prototype.buildIntraProceduralModelsOfEachPageModels = function () {
	"use strict";

	modelBuilder.buildIntraProceduralModels(); // CFG

    constantsModule.staticModelPrintPhases && console.log('PDG start');
    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
    

    // modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
    //     pageModels.intraProceduralModels.forEach(function (model) {
    //         defuseAnalyzer.doAnalysis(model);
    //         defuseAnalyzer.findDUPairs(model);

    //     });
    // });

    var startTime = performance.now();
    var timeout = constantsModule.timeoutPDGGeneration;

    let pageModelsCollection = modelCtrl.collectionOfPageModels; // map
    let pageModelsIterator = pageModelsCollection.values();
    for (let i=0; i< pageModelsCollection.size; i++){
        let models = pageModelsIterator.next().value.intraProceduralModels; // array
        for (let j=0; j< models.length; j++){
            defuseAnalyzer.doAnalysis(models[j]);
            defuseAnalyzer.findDUPairs(models[j]);

            // Debug output: print summary of analysis results for this model
            try{
                if(constantsModule.staticModelPrintPhases){
                    let model = models[j];
                    let scopeName = (model && model.mainlyRelatedScope && model.mainlyRelatedScope.name)? model.mainlyRelatedScope.name : 'UNKNOWN_SCOPE';
                    console.log('[PDG-DEBUG] Model scope:', scopeName);

                    // CFG node summary
                    if(model.graph && model.graph[2]){
                        console.log('[PDG-DEBUG]   CFG nodes:', model.graph[2].length);
                        model.graph[2].forEach(n => {
                            let reachIns = (n.reachIns)? n.reachIns.size : 0;
                            let cuse = (n.cuse)? n.cuse.size : 0;
                            let puse = (n.puse)? n.puse.size : 0;
                            console.log('[PDG-DEBUG]     node', n.uniqueId, 'reachIns=', reachIns, 'cuse=', cuse, 'puse=', puse);
                        });
                    }

                    // DUPairs summary (print up to 5 variables and up to 5 pairs each)
                    let dupairs = model.dupairs;
                    if(dupairs){
                        try{
                            // Some Map/Set polyfills in older runtimes aren't iterable with `for..of`.
                            // Use `forEach` which is supported by the Map/Set implementations used in this repo.
                            console.log('[PDG-DEBUG]   DUPairs variables count:', dupairs.size);
                            let vcount = 0;
                            dupairs.forEach(function (pairs, variable) {
                                if(vcount >= 5) return;
                                let varName = (variable && variable.name)? variable.name : (variable && variable.toString)? variable.toString() : String(variable);
                                console.log('[PDG-DEBUG]     var:"', varName, '" pairs_count=', pairs.size);
                                let pcount = 0;
                                pairs.forEach(function (pair) {
                                    if(pcount >= 5) return;
                                    // pair.def / pair.use
                                    let defNode = pair.def || pair.first || null;
                                    let useNode = pair.use || pair.second || null;
                                    let defId = defNode && defNode.uniqueId? defNode.uniqueId : JSON.stringify(defNode);
                                    let useDesc = (Array.isArray(useNode))? ('IF-predicate AST id=' + (useNode[0] && useNode[0]._id)) : (useNode && useNode.uniqueId? ('useNode ' + useNode.uniqueId) : JSON.stringify(useNode));
                                    console.log('[PDG-DEBUG]       def -> use :', defId, '->', useDesc);
                                    pcount++;
                                });
                                vcount++;
                            });
                        }catch(e){
                            console.log('[PDG-DEBUG]   error while printing dupairs:', e && e.stack? e.stack : e);
                        }
                    }
                }
            }catch(e){
                // swallow debug errors to avoid interrupting analysis
                try{ console.log('[PDG-DEBUG] unexpected debug error:', e && e.stack? e.stack : e); }catch(e2){}
            }

            if(performance.now() - startTime > timeout){
                constantsModule.staticModelPrintPhases && console.log('breaking loop');
                return true;
            }

        } 
    }

    constantsModule.staticModelPrintPhases && console.log('PDG end');
    return false;
};

DefUseAnalysisExecutor.prototype.buildInterProceduralModelsOfEachPageModels = function () {
    "use strict";

    
    modelBuilder.buildInterProceduralModels();  // CFG

    // modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
    //     pageModels.interProceduralModels.forEach(function (model) {
    //         defuseAnalyzer.doAnalysis(model);
    //         defuseAnalyzer.findDUPairs(model);
    //     });
    // });

    var startTime = performance.now();
    var timeout = constantsModule.timeoutPDGGeneration;

    let pageModelsCollection = modelCtrl.collectionOfPageModels; // map
    let pageModelsIterator = pageModelsCollection.values();
    for (let i=0; i< pageModelsCollection.size; i++){
        let models = pageModelsIterator.next().value.interProceduralModels; // array
        for (let j=0; j< models.length; j++){
            defuseAnalyzer.doAnalysis(models[j]);
            defuseAnalyzer.findDUPairs(models[j]);

            if(performance.now() - startTime > timeout){
                constantsModule.staticModelPrintPhases && console.log('breaking loop');
                return true;
            }
        } 
    }
    return false;
 
};


/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;