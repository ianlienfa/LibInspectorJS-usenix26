#!/opt/homebrew/bin/node
const acorn = require("acorn");
const walk = require("acorn-walk");
const fs = require("fs");
const path = require("path");
const logger = require('./logger');
const { features } = require("process");


function acron_parse(code){
    const acron_config_obj = {ecmaVersion: 2022}    
    try {
        return acorn.parse(code, acron_config_obj);
    } catch (error) {
        ;    
    }
    try {
        config = acron_config_obj
        config.sourceType = "module"
        return acorn.parse(code, config);
    } catch (error) {
        console.log("Error parsing.")
        return undefined;
    }
}

// code = `( () => {
//     var e, r, n, t = {
//         689: (e, r, n) => {
//             const t = n(692);
//             window.changeColor = function(e) {
//                 t("p").css("color", e)
//             }
//         }
//     }, o = {};
//     function i(e) {
//         var r = o[e];
//         if (void 0 !== r)
//             return r.exports;
//         var n = o[e] = {
//             exports: {}
//         }
//           , d = {
//             id: e,
//             module: n,
//             factory: t[e],
//             require: i
//         };
//         return i.i.forEach((function(e) {
//             e(d)
//         }
//         )),
//         n = d.module,
//         d.factory.call(n.exports, n, n.exports, d.require),
//         n.exports
//     }
//     i.O(void 0, [199, 692], ( () => i(953))),
//     i.O(void 0, [199, 692], ( () => i(943)));
//     var d = i.O(void 0, [199, 692], ( () => i(689)));
//     d = i.O(d)
// }
// )();
// `

function rand_alnum(length) {
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
let result = '';
for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
}
return result;
}
  
function insert_after_char(code, charat, code_segment){
    return code.slice(0, charat+1) + code_segment + code.slice(charat+1);
}

function insert_before_char(code, charat, code_segment){
    return code.slice(0, charat) + code_segment + code.slice(charat);
}

function code_validity_check(code){    
    try {
        ok = acron_parse(code);
        return (ok) ? true : false;
    } catch (error) {
        return false;
    }
}

function get_webpack_require(code, ast){
    require_func_name = ""    
    require_func = undefined;
    webpack_found = false;
    info = {}
    walk.full(ast, (node)  => {
        if(node.type === "FunctionDeclaration"){  
            structuralCheck = true                    
            if(node.params.length !== 1){
                structuralCheck = false
            }
            if(node.body.type !== "BlockStatement"){
                structuralCheck = false
            }
            if(node.body.body[node.body.body.length - 1]?.type !== "ReturnStatement"){
                structuralCheck = false
            }
            if(structuralCheck){ // if structural check passed
                walk.simple(node, {
                    ObjectExpression(objexpr) {        
                        require_object_fingerprint = {
                            'id': false, 'module': false, 'factory': false, 'require': false
                        }                    
                        // console.log("Object Expression confirmed", code.slice(objexpr.start, objexpr.end))
                        walk.simple(objexpr, {
                            Property(prop){
                                if(require_object_fingerprint.hasOwnProperty(prop.key.name)){
                                    // console.log(`${prop.key.name} found.`)
                                    require_object_fingerprint[prop.key.name] = true;                                
                                }
                            }
                        })
                        if(Object.values(require_object_fingerprint).every(val => val === true)){
                            webpack_found = true;       
                            require_func_name = node.id.name; // function name
                            require_func = node;     
                            info = {"type": "type1"}                                       
                        }
                    }
                })
                if(!webpack_found){ // test with the second type of structure
                    /*
                        function n(c) { 
                        if (f[c]) return f[c].exports; 
                        var d = f[c] = { i: c, l: !1, exports: {} }; 
                        return e[c].call(d.exports, d, d.exports, n), d.l = !0, d.exports } 

                        // feature1: the first return returns element.exports
                        // feature2: assignment with object key exports
                        // feature3: return with function 'call' and the first and third element referencing exports
                    */
                    feature_pass = true
                    argument_id = undefined
                    walk.simple(node, {
                        BlockStatement(objexpr){
                            feature_pass = true
                            if_statement = undefined
                            variable_declaration = undefined
                            return_statement = undefined                            
                            expected_types = ["IfStatement", "VariableDeclaration", "ReturnStatement"]
                            expected_type_pointer = 0
                            
                            for(element of objexpr.body){
                                if(element.type === expected_types[expected_type_pointer]){
                                    expected_type_pointer += 1    
                                    if(element.type === "IfStatement"){
                                        if_statement = element
                                    }                     
                                    if(element.type === "VariableDeclaration"){
                                        variable_declaration = element
                                    }
                                    if(element.type === "ReturnStatement"){
                                        return_statement = element
                                    }
                                }
                            }
                            if(expected_type_pointer !== 3){
                                feature_pass = false                                
                            }// only if all expected type matches in order
                            else{
                                // feature 1 test
                                // console.log("expected_type_pointer: ", expected_type_pointer)
                                // console.log("feature_pass start: ", feature_pass)
                                // console.log("matching code: ", code.slice(node.start, node.end))
                                if(if_statement){
                                    // console.log("if_statement: ", code.slice(if_statement.start, if_statement.end))                                    
                                    if(!(if_statement?.consequent?.argument?.property?.name === "exports")){
                                        feature_pass = false
                                    }
                                }
                                else{
                                    console.log("should not be here. If already matched, if_statement var should have value")
                                }
                                // console.log("feature 1 pass: ", feature_pass)

                                // feature 2 test
                                if(variable_declaration){
                                    exports_key_match = false        
                                    walk.simple(variable_declaration, {
                                        Property(prop){
                                            if(prop.key.name === "exports"){
                                                exports_key_match = true
                                            }
                                        }                                        
                                    })
                                    if(!exports_key_match){
                                        feature_pass = false                                        
                                    }
                                }
                                else{
                                    console.log("should not be here. If already matched, variable_declaration var should have value")
                                }

                                // console.log("feature 2 pass: ", feature_pass)

                                // feature 3 test
                                if(return_statement){
                                    walk.simple(variable_declaration, {
                                        CallExpression(callexpr){
                                            if(callexpr?.callee?.property?.name !== "call"){
                                                feature_pass = false
                                            }
                                            // check the 1st and 3rd element
                                            if(callexpr?.arguments?.[0]?.property !== "exports"){
                                                feature_pass = false
                                            }
                                            if(callexpr?.arguments?.[3]?.property !== "exports"){
                                                feature_pass = false
                                            }
                                        }                                        
                                    })
                                }
                                // console.log("feature 3 pass: ", feature_pass)
                            }
                                                     
                        }
                    })

                    // fill up argument placeholder
                    argument_id = node?.params?.[0]?.name;
                    if(!argument_id){
                        feature_pass = false
                    }

                    if(feature_pass){
                        webpack_found = true;       
                        require_func_name = node.id.name; // function name
                        require_func = node;    
                        info = {"type": "type2", "if_statement": if_statement, "return_statement": return_statement, "param_id": argument_id}
                    }
                }
            }
        }
    }) 
    if(webpack_found){
        // logger.info(`[${info?.["type"]}] webpack found with require function: ${require_func_name}`);
    }              
    else {
        // console.log("Not a webpack bundle");
        require_func_name = "";
    }
    return [require_func_name, require_func, info];
}

function rename_func(code, node, newname){
    if(!(node && node.id && node.start)){
        console.error("rename_func: undefined node value")
        return "";
    }
    front = code.slice(0, node.id.start)    
    back = code.slice(node.id.end)
    return front + newname + back;
}

function has_include(code, ast){
    has_include = false;
    walk.full(ast, (node)  => {
        // fingerprint by looking for vite paths
        if(node.type === "ImportDeclaration"){
            is_vite = true;
        }
    }) 
    return has_include;
}

// return object if found {import_type: [func/arr], node: func_node}
function is_vite_bundle(code, ast){
    func_obj = undefined
    name_exports_match = false
    return_exports_match = false
    default_unwrapper_holder = undefined
    func_or_arr_import = "arr"    
    walk.simple(ast, {
        // pattern 1. exists dictionary declaration where the key has the name exports
        FunctionDeclaration(func_node){
            logical_expr_with_and = false
            esmodule_found = false
            default_found = false
            func_or_arr = "arr"
            walk.simple(func_node, {
                AssignmentExpression(node){
                    walk.simple(node, {
                        Property(prop_node){
                            if(prop_node.key && prop_node.key.name === "exports"){
                                func_or_arr = "func";
                            }
                        }
                    })
                },
                MemberExpression(node){
                    if(node.property){
                        if(node.property.name === "__esModule"){
                            esmodule_found = true
                        }
                        if(node.property.name === "default"){
                            default_found = true
                        }
                    }
                },
                LogicalExpression(node){
                    if(node.operator === "&&"){
                        logical_expr_with_and = true
                    }
                }
            })
            if(esmodule_found && default_found && logical_expr_with_and){
                default_unwrapper_holder = func_node;
            }
            if(func_or_arr === "func"){
                func_obj = {import_type: "func", node: func_node};
                func_or_arr_import = "func";
            }
        },
        AssignmentExpression(node){
            walk.simple(node, {
                Property(prop_node){
                    if(prop_node.key && prop_node.key.name === "exports"){
                        name_exports_match = true
                    }
                }
            })
        },
        // pattern 2. exists SequenceExpression in a return statement where the last element is something.export
        ReturnStatement(node){
            walk.simple(node, {
                SequenceExpression(expr_node){
                    if(expr_node.expressions.length){
                        const last_element = expr_node.expressions[expr_node.expressions.length - 1]
                        if(last_element.type === "MemberExpression" && last_element.property && last_element.property.name === "exports"){
                            return_exports_match = true
                        }
                    }
                }
            })
        }
    }) 
    if(func_or_arr_import !== "func" && default_unwrapper_holder){
        // arr
        func_obj = {import_type: "arr", node: default_unwrapper_holder};
    }
    return func_obj;
}

// return undefined if not browserify
// return the function node if found
function is_browserify_bundle(code, ast){    

    // look for pattern
    // 1. p=n[i]={exports:{}}; -> property with 'export' key in an assign statement
    // 2. literal with module_not_found in a throw statement
    let function_node = undefined
    walk.full(ast, (node)  => {
        if(node.type === "FunctionDeclaration"){
            let exports_key_match = false
            let module_not_found_match = false        
            let deepest_match = true
            // 1. property with export key check
            walk.ancestor(node, {
                Property(_node, _state, ancestors){
                    if(_node.key.name === "exports"){
                        ancestors_type_arr = ancestors.map(n => n.type);
                        // console.log("[exports] ancestors_type_arr", ancestors_type_arr)
                        if(ancestors_type_arr.includes('AssignmentExpression')){
                            exports_key_match = true
                        }
                    }
                },
                Literal(_node, _state, ancestors) {
                    if(_node.value && _node.value === "MODULE_NOT_FOUND"){
                      ancestors_type_arr = ancestors.map(n => n.type);
                    //   console.log("[MODULE_NOT_FOUND] ancestors_type_arr", ancestors_type_arr)
                      if(ancestors_type_arr.includes('ThrowStatement')){
                          module_not_found_match = true;
                      }
                    }
                },
                FunctionDeclaration(_node, _state, ancestors){
                    // not the deepest function
                    if(_node !== node){
                        deepest_match = false
                    }
                }
            });
            if(exports_key_match && module_not_found_match && deepest_match){
                function_node = node;
            }
        }
    });

    return function_node;
}

function vite_lift(code, node, ast){
    if(node && node['import_type'] && node['node']){
        import_type = node['import_type']
        func_node = node['node']
        if(import_type === "func"){
            walk.simple(func_node, {
                ReturnStatement(node){
                    // build up sequence expression
                    if(node.argument && node.argument.type === "SequenceExpression" && node.argument.expressions && node.argument.expressions.length){
                        // insert to the second to last element
                        ele_second_to_last = node.argument.expressions[node.argument.expressions.length-1]
                        code = insert_before_char(code, ele_second_to_last.start, "eval(`window.mod_" + func_node.params[0].name + "_" + func_node.start + "_" + rand_alnum(4) + "=e[r].exports`), ")
                    }
                    else{
                        // simply build up sequence expression, naming: mod_{func_id}_{func_line_num}_{randid}
                        code = insert_before_char(code, func_node.argument.start, "eval(`window.mod_" + func_node.params[0].name + "_" + func_node.start + "_" + rand_alnum(4) + "=e[r].exports`), ")
                    }
                }
            })
            return code;
        }
        else if(import_type === "arr"){
            func_id = func_node.name            
            walk.ancestor(ast, {
                FunctionDeclaration(node){
                    if(node.id.name === func_id){

                    }
                }
            })
            return code;
        }
        else {
            console.error("import_type matching, should not be here")
        }
        return ""
    }
    else {
        return ""
    }
}

function webpack_lift_type1(code, node, ast){
    // rename webpack require function
    // the old require function will be renamed as '__original_webpack_require__'
    code = rename_func(code, node, '__original_webpack_require__');
    if(code === ""){
        console.error("Error in renaming require");
    }

    // new require insertion
    first_block_statement = undefined;
    try {
        walk.simple(ast, {
            BlockStatement(node){
                first_block_statement = node;            
            }
        });    
    } catch (error) {
        console.error("Error in simple walk after original require renaming, ", error)
    }

    let result = "";
    try {
        if(!first_block_statement){
            console.log("no block statement found.")
            return;
        }
        if(!first_block_statement.body[0]){
            console.log("no body found in block statement.")
        }
        else {
            // insert require function wrapper before the first element of the block statement
            const new_require = `
        function ${require_func_name}(moduleId) {
            const libobj = __original_webpack_require__(moduleId);
            const objstr = \`mod_\${moduleId}\`;
            console.log(moduleId + " is imported")
            eval(\`window.\${objstr} = libobj\`);

            if (window['lift_arr']) {
                window['lift_arr'].push(objstr);
            } else {
                window['lift_arr'] = [objstr];
            }

            return libobj;
        }
            `;
            result = insert_before_char(code, first_block_statement.body[0].start, new_require);
        }

    } catch (error) {
        console.error("error in object lifting", error);
    }
    if(code_validity_check(result)){
        return result;
    }
    else{        
        console.error("failed in code validity check", error);
        console.error("code: ", code);
        return "";
    }
}

function webpack_lift_type2(code, node, ast, info){
    /*
    function n(c) { 
        if (f[c]) return f[c].exports; 
        var d = f[c] = { i: c, l: !1, exports: {} }; 
        return e[c].call(d.exports, d, d.exports, n), d.l = !0, d.exports } 
    */

    /*
        // if the function has member reference
        function n(r) {
        if (e[r])
            return eval(`window.mod_${r}=e[r].exports`), ((window['lift_arr']) ? window['lift_arr'].push(`mod_${r}`) : (window['lift_arr'] = `mod_${r}`;) ), e[r].exports;
        var i = e[r] = {
            i: r,
            l: !1,
            exports: {}
        };
        // return the unwrapped rth element in array t
        return t[r].call(i.exports, i, i.exports, n),
        i.l = !0,
        eval(`window.mod_${r}=i.exports`),
        ((window['lift_arr']) ? window['lift_arr'].push(`mod_${r}`) : (window['lift_arr'] = `mod_${r}`;) ),
        i.exports
    }
    */    

    // get the if and require statement from info
    let result = "";
    if_statement = info?.["if_statement"]
    return_statement = info?.["return_statement"]
    argument_id = info?.["param_id"]
    if((!if_statement) || (!return_statement)){
        console.error("webpack_lift_type2: undefined if or return statement")
        return ""
    }

    // build up insert string for if_statement
    e_r_exports_str = code.slice(if_statement?.consequent?.argument?.start, if_statement?.consequent?.argument?.end)
    if_insert_str = 'eval(`window.mod_${'+ argument_id + '}=' + e_r_exports_str + '`)'; // code lifting part
    if_insert_str += ", ((window['lift_arr']) ? window['lift_arr'].push(`mod_${"+ argument_id +"}`) : (window['lift_arr'] = `mod_${"+ argument_id +"}`) ),"; // bookkeeping part

    // insert into if statement
    varying_offset = 0
    first_e_r_export_offset = if_statement?.consequent?.argument?.start;
    result = insert_before_char(code, first_e_r_export_offset + varying_offset, if_insert_str)
    varying_offset = if_insert_str.length


    // return can be in two possibilities: SequenceExpression or Memberexpression
    if(return_statement?.argument?.type === "SequenceExpression"){
        // insert into return 
        expressions = return_statement?.argument?.expressions
        i_exports_str = code.slice(expressions[expressions.length-1]?.start, expressions[expressions.length-1]?.end)
        return_insert_str = 'eval(`window.mod_${'+ argument_id +'}=' + i_exports_str + '`)'; // code lifting part
        return_insert_str += ", ((window['lift_arr']) ? window['lift_arr'].push(`mod_${"+ argument_id +"}`) : (window['lift_arr'] = `mod_${" + argument_id + "}`) ),"; // bookkeeping part
        i_exports_offset = expressions?.[expressions.length - 1]?.start
        result = insert_before_char(result, i_exports_offset + varying_offset, return_insert_str)
    }
    else if(return_statement?.argument?.type === "MemberExpression"){
        i_exports_str = code.slice(return_statement?.argument?.start, return_statement?.argument?.end)
        return_insert_str = 'eval(`window.mod_${'+ argument_id +'}=' + i_exports_str + '`)'; // code lifting part
        return_insert_str += ", ((window['lift_arr']) ? window['lift_arr'].push(`mod_${"+ argument_id +"}`) : (window['lift_arr'] = `mod_${" + argument_id + "}`) ),"; // bookkeeping part
        i_exports_offset = return_statement?.argument?.start
        result = insert_before_char(result, i_exports_offset + varying_offset, return_insert_str)
    }

    // insert lift_arr declaration
    lift_arr_dclr = "window.lift_arr = window.lift_arr || [];; console.log('entry script ran');"
    result = insert_before_char(result, 0, lift_arr_dclr)

    // console.log("function segment:", result.slice(node?.start, 1000))

    if(code_validity_check(result)){
        return result;
    }
    else{
        console.error("failed in code validity check");
        return "";
    }
}

function include_lift(code, ast){
    lift_code_arr = []    
    walk.full(ast, (node)  => {
        // fingerprint by looking for vite paths
        if(node.type === "ImportDeclaration" && node.specifiers.length){
            for(id of node.specifiers){
                if(id.local && id.local.name !== ""){
                    lift_code = `window.mod_${id.local.name} = ${id.local.name}`
                    lift_code_arr.push()
                }
            }
        }
    }) 
    console.log("lift_code_arr: ", lift_code_arr);
    if(ast.body && ast.body[ast.body.length - 1]){
        insert_code = ';' + lift_code_arr.join(';\n');
        code = insert_after_char(code, ast.body[ast.body.length - 1].end, insert_code);
    }
    return code;
}

function browserify_lift(code, func_node, ast){
    code = rename_func(code, func_node, 'old_o');
    if(code === ""){
        console.error("Error in renaming require");
        return "";
    }
    try {
        let result = code;
        walk.full(ast, (node)  => {
            if(node.type === "BlockStatement" && node.body.includes(func_node)){
                const new_o = `
                    function o(i, f) { 
                        expt = old_o(i, f);
                        eval(\`window.mod_\${i} = old_o(i, f)\`);
                        return expt;
                    }
                `;
                result = insert_before_char(code, node.body[0].start, new_o);
            }
        })    
        return result;
    } catch (error) {
        console.log("browserify lift: error in insertion.", error)
        return "";
    }
}

// return lifted code
function lift(code){    
    require_func_name = "";
    let node = undefined;

    // first phase parsing
    ast = acron_parse(code)

    // omit webpack push code
    if(code.slice(0, 200).includes("self.webpack") && code.slice(0, 200).includes("push")){
        // logger.info("webpack chunking code, omitted")
        return code
    }

    // try webpack
    if(([require_func_name, node, info] = get_webpack_require(code, ast))){
        if(require_func_name && node){
            // logger.info("Webpack bundle detected")
        }
        if(require_func_name !== ""){
            if(info?.["type"] === "type1"){
                return webpack_lift_type1(code, node, ast);
            }
            else if(info?.["type"] === "type2"){
                return webpack_lift_type2(code, node, ast, info);
            }
        }        
    }
    else {
        logger.info("Not webpack bundle")        
    }

    // try vite
    // if(func_obj = is_vite_bundle(code, ast) && func_obj){
    //     logger.info("Vite bundle", func_obj)        
    //     // return vite_lift(code, func_obj, ast)
    //     return ""; // temporary
    // }
    // else {
    //     // console.log("No vite bundle detected.");
    // }

    // try include statements
    // if(has_include(code, ast)){
    //     return include_lift(code, ast);
    // }
    // else {
    //     console.log("No include statement found")        
    // }

    // try browserify
    if(func_node = is_browserify_bundle(code, ast)){
        logger.info("brwoserify bundle detected")
        return browserify_lift(code, func_node, ast);        
    }
    else {
        // console.log("Not a browserify bundle")
    }

    // logger.info("Not matching any bundle")
    return "";
}

module.exports = lift;

// Run PTdetector if this file is run directly
if (require.main === module) {
    const { ArgumentParser } = require('argparse');
    const parser = new ArgumentParser({
        description: 'Argparse example'
      });
    parser.add_argument('inputfile', { help: 'input file path (positional)' });
    parser.add_argument('outputfile', { help: 'output file path' });    
    const args =parser.parse_args();
            
    inputfile = args.inputfile
    outputfile = args.outputfile

    if(inputfile){
        if(outputfile === undefined){
            if(prefix = inputFile.split('.')[0]){
                outputfile = `${prefix}_lift.js`
            }
            else{
                outputfile = `${inputFile}_lift.js`
            }
        }
        
        let new_data;
        fs.readFile(inputfile, 'utf8', (err, data) => {
            if (err || (data === undefined)) {
                console.error(`Error reading ${inputfile}:`, err);
                process.exit(1);
            }         
            new_data = lift(data);
            if(new_data !== ""){
                fs.writeFile(outputfile, new_data, (err) => {
                    if (err) {
                        logger.error(`Error writing ${outputfile}:`, err);
                        process.exit(1);
                    }
                    logger.info("replacement written into " + outputfile);
                });            
            }
            else {
                console.error(`Unable to lift ${inputfile}`);
            }
        })
    }        
}