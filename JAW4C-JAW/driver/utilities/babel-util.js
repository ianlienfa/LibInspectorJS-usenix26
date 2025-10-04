// babel-util.js
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate  = require("@babel/generator").default;
const t         = require("@babel/types");
const exp = require("constants");

function splitSequence(code) {
  const ast = parser.parse(code, { sourceType: "module" });

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

  return generate(ast, { /* retain formatting */ }).code;
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