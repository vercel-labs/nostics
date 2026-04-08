import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

export interface TransformResult {
  code: string
  map: ReturnType<MagicString['generateMap']>
}

export interface TransformOptions {
  /**
   * The package name to detect imports from.
   * @default 'logs-sdk'
   */
  packageName?: string
}

/**
 * Transforms code that imports from `logs-sdk`:
 * - Adds `\/*#__PURE__*\/` to `defineDiagnostics()` and `createLogger()` call expressions
 * - Prepends `process.env.NODE_ENV !== 'production' &&` to expression statements using logger variables
 */
export function transform(code: string, id: string, options?: TransformOptions): TransformResult | undefined {
  const packageName = options?.packageName ?? 'logs-sdk'

  // Fast filter
  if (!code.includes(packageName))
    return undefined

  const result = parseSync(id, code)
  const ast = result.program

  // Step 1: Find imports from the package
  const importedNames = new Map<string, string>() // localName -> importedName
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === packageName) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
          importedNames.set(spec.local.name, importedName)
        }
      }
    }
  }

  if (importedNames.size === 0)
    return undefined

  const s = new MagicString(code)
  const trackedVars = new Set<string>()

  // Step 2: Walk all statements recursively
  walkStatements(ast.body, s, importedNames, trackedVars)

  if (!s.hasChanged())
    return undefined

  return {
    code: s.toString(),
    map: s.generateMap({ hires: 'boundary' }),
  }
}

const CONDITION = 'process.env.NODE_ENV !== \'production\''

function walkStatements(
  body: any[],
  s: MagicString,
  importedNames: Map<string, string>,
  trackedVars: Set<string>,
): void {
  for (const stmt of body) {
    // Variable declaration: const x = importedFn(...)
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (
          decl.init?.type === 'CallExpression'
          && decl.init.callee?.type === 'Identifier'
          && importedNames.has(decl.init.callee.name)
          && decl.id?.type === 'Identifier'
        ) {
          // Track the variable
          trackedVars.add(decl.id.name)
          // Add /*#__PURE__*/ before the call expression
          s.appendLeft(decl.init.start, '/*#__PURE__*/ ')
        }
      }
    }

    // Expression statement using a tracked variable
    if (stmt.type === 'ExpressionStatement') {
      if (expressionUsesTrackedVar(stmt.expression, trackedVars)) {
        s.appendLeft(stmt.expression.start, `${CONDITION} && `)
      }
    }

    // Recurse into block-containing statements
    if (stmt.type === 'BlockStatement' || stmt.type === 'Program') {
      walkStatements(stmt.body, s, importedNames, trackedVars)
    }
    if (stmt.type === 'IfStatement') {
      if (stmt.consequent?.type === 'BlockStatement') {
        walkStatements(stmt.consequent.body, s, importedNames, trackedVars)
      }
      if (stmt.alternate?.type === 'BlockStatement') {
        walkStatements(stmt.alternate.body, s, importedNames, trackedVars)
      }
    }
    if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement') {
      if (stmt.body?.type === 'BlockStatement') {
        walkStatements(stmt.body.body, s, importedNames, trackedVars)
      }
    }
    if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ArrowFunctionExpression') {
      if (stmt.body?.type === 'BlockStatement') {
        walkStatements(stmt.body.body, s, importedNames, trackedVars)
      }
    }
    // Handle ExportNamedDeclaration wrapping a VariableDeclaration
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      walkStatements([stmt.declaration], s, importedNames, trackedVars)
    }
  }
}

/**
 * Check if an expression references a tracked variable as the root of a member/call chain.
 */
function expressionUsesTrackedVar(node: any, trackedVars: Set<string>): boolean {
  if (!node)
    return false

  // Direct identifier reference
  if (node.type === 'Identifier') {
    return trackedVars.has(node.name)
  }

  // Member expression: check the object (root of the chain)
  if (node.type === 'MemberExpression') {
    return expressionUsesTrackedVar(node.object, trackedVars)
  }

  // Call expression: check the callee
  if (node.type === 'CallExpression') {
    return expressionUsesTrackedVar(node.callee, trackedVars)
  }

  return false
}
