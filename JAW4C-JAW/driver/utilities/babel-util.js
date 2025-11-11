// babel-util.js
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate  = require("@babel/generator").default;
const t         = require("@babel/types");
const exp = require("constants");
const babel = require("@babel/core");

function splitSequence(code) {
  // Parse with all modern syntax enabled
  const ast = parser.parse(code, {
    sourceType: "unambiguous",  // Auto-detect module vs script
    plugins: [
      'optionalChaining',
      'nullishCoalescingOperator',
      'objectRestSpread',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'numericSeparator',
      'logicalAssignment',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom'
    ]
   });

  traverse(ast, {
    ExpressionStatement(path) {
      const expr = path.get("expression");

      // Handle sequence expressions
      if (expr.isSequenceExpression()) {
        const parts = expr.node.expressions;
        const stmts = parts.map((subExpr, i) => {
          // Wrap last expression in ExpressionStatement
          return t.expressionStatement(subExpr);
        });
        path.replaceWithMultiple(stmts);
        return;
      }

      // Handle Object IIFE pattern: ({...}).method(args)
      // Example: ({target: "...", render: function(e) {...}}).render(r)
      if (expr.isCallExpression()) {
        const callee = expr.node.callee;

        // Check if it's a member expression like (objectExpr).method
        if (t.isMemberExpression(callee)) {
          const object = callee.object;

          // Check if the object is an ObjectExpression (literal object)
          if (t.isObjectExpression(object)) {
            // Generate unique temp variable
            const tempId = path.scope.generateUidIdentifier("tmp");

            // Create: const tmp = {...}
            const varDecl = t.variableDeclaration("const", [
              t.variableDeclarator(tempId, object)
            ]);

            // Create: tmp.method(args)
            const newCall = t.callExpression(
              t.memberExpression(tempId, callee.property, callee.computed),
              expr.node.arguments
            );

            path.replaceWithMultiple([
              varDecl,
              t.expressionStatement(newCall)
            ]);
            return;
          }
        }
      }
    },

    ReturnStatement(path) {
    const argument = path.get("argument");
    if (argument.isSequenceExpression()) {
        const parts = argument.node.expressions;

        const sideEffects = parts.slice(0, -1); // everything before the final expression
        const finalExpr = parts[parts.length - 1]; // what the return value should be

        const resultIdentifier = path.scope.generateUidIdentifier("tmp_" + Math.random().toString(36).substring(2, 8));
        const stmts = [];

        // emit side-effect statements in correct order
        for (let i = 0; i < sideEffects.length; i++) {
        stmts.push(t.expressionStatement(sideEffects[i]));
        }

        // store final expression in tmp, then return it
        stmts.push(
        t.variableDeclaration("const", [
            t.variableDeclarator(resultIdentifier, finalExpr)
        ])
        );
        stmts.push(t.returnStatement(resultIdentifier));

        path.replaceWithMultiple(stmts);
        }
    },

    VariableDeclaration(path) {
      const kind = path.node.kind; // 'const', 'let', or 'var'

      // Handle ALL Function Expression IIFE patterns:
      // - const n = function n(r) {...}(692)
      // - const x = function() {...}()
      // - const foo = function bar() {...}()
      // Transform to: function tmp_fn(r) {...}; const varName = tmp_fn(692);
      // This keeps the result in the original variable name to avoid breaking other call sites
      if (path.node.declarations.length === 1) {
        const declarator = path.node.declarations[0];
        const init = declarator.init;

        // Check if init is a CallExpression
        if (t.isCallExpression(init)) {
          const callee = init.callee;

          // Check if callee is a FunctionExpression (with or without a name)
          if (t.isFunctionExpression(callee)) {
            const varName = declarator.id;

            // Generate unique function name to avoid collision
            const uniqueFuncName = path.scope.generateUidIdentifier("tmp");

            // Create function declaration with unique name: function _tmp(r) {...}
            const funcDecl = t.functionDeclaration(
              uniqueFuncName,
              callee.params,
              callee.body,
              callee.generator,
              callee.async
            );

            // Create variable declaration with ORIGINAL variable name: const varName = _tmp(692)
            // This ensures other code referencing the variable gets the result, not the function
            const resultVarDecl = t.variableDeclaration(kind, [
              t.variableDeclarator(
                varName,
                t.callExpression(uniqueFuncName, init.arguments)
              )
            ]);

            path.replaceWithMultiple([funcDecl, resultVarDecl]);
            return;
          }
        }
      }

      // Split multiple declarators into separate declarations
      // e.g., const a = 1, b = 2; -> const a = 1; const b = 2;
      if (path.node.declarations.length > 1) {
        // Create separate VariableDeclaration for each declarator
        const separateDeclarations = path.node.declarations.map(declarator => {
          return t.variableDeclaration(kind, [declarator]);
        });

        // Replace with multiple single-declarator statements
        path.replaceWithMultiple(separateDeclarations);
      }
    }
  });

  // Generate code first
  const intermediateCode = generate(ast, { /* retain formatting */ }).code;

  // Transform to ES2017 using Babel with explicit syntax lowering
  // Resolve plugin paths relative to this module's location
  const resolvePlugin = (name) => require.resolve(name, { paths: [__dirname] });

  const result = babel.transformSync(intermediateCode, {
    sourceType: "unambiguous",  // Auto-detect module vs script
    comments: true,
    sourceMaps: false,
    retainLines: true,
    presets: [
      [resolvePlugin("@babel/preset-env"), {
        targets: { node: "8.0" },       // ES2017-era baseline (before object spread)
        bugfixes: true,
        shippedProposals: false,
        modules: "auto"                  // Auto-transform modules based on sourceType
      }]
    ],
    plugins: [
      // ES2020+
      resolvePlugin("@babel/plugin-transform-optional-chaining"),              // a?.b, a?.[x], a?.()
      resolvePlugin("@babel/plugin-transform-nullish-coalescing-operator"),    // a ?? b
      resolvePlugin("@babel/plugin-transform-export-namespace-from"),          // export * as ns from 'x'
      resolvePlugin("babel-plugin-dynamic-import-node"),                       // dynamic import → require()

      // ES2021
      resolvePlugin("@babel/plugin-transform-logical-assignment-operators"),   // a ||= b, a &&= b, a ??= b
      resolvePlugin("@babel/plugin-transform-numeric-separator"),              // 1_000_000

      // ES2022 (class features)
      [resolvePlugin("@babel/plugin-transform-class-properties"), { loose: true }],
      [resolvePlugin("@babel/plugin-transform-private-methods"), { loose: true }],
      [resolvePlugin("@babel/plugin-transform-private-property-in-object"), { loose: true }],
      resolvePlugin("@babel/plugin-transform-class-static-block"),
    ]
  });

  return result.code;
}

function transformIfTs(code) {
  try {
    const astWithTs = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript"]
    });

    // Try parsing without typescript plugin
    try {
      parser.parse(code, {
        sourceType: "module"
      });
      return ""; // Valid JS, not TS-specific
    } catch {
      // Parses as TS but not as JS - transform it
      return generate(astWithTs, {}, code).code;
    }
  } catch {
    return ""; // Doesn't parse as either
  }
}

// Example usage (sequencSplitting only)
if (require.main === module) {
  const fs = require("fs");
  const inputCode = fs.readFileSync(process.argv[2], "utf8");
  console.log(splitSequence(inputCode));
}

module.exports = { splitSequence, transformIfTs };