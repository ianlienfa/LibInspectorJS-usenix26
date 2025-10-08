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
      if (expr.isSequenceExpression()) {
        const parts = expr.node.expressions;
        const stmts = parts.map((subExpr, i) => {
          // Wrap last expression in ExpressionStatement
          return t.expressionStatement(subExpr);
        });
        path.replaceWithMultiple(stmts);
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