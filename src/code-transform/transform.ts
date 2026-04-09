import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

export interface TransformResult {
  code: string
  map: ReturnType<MagicString['generateMap']>
}

export interface TransformOptions {
  /**
   * The package name to detect imports from.
   * @default '@antfu/experimental-logs-sdk'
   */
  packageName?: string
}

/**
 * Cross-file state: maps file paths to sets of exported variable names
 * that are derived from logs-sdk function calls (createLogger, defineDiagnostics, etc.)
 */
export type TrackedExportsMap = Map<string, Set<string>>

/**
 * Transforms code that imports from `logs-sdk`:
 * - Adds `\/*#__PURE__*\/` to `defineDiagnostics()` and `createLogger()` call expressions
 * - Prepends `process.env.NODE_ENV !== 'production' &&` to expression statements using logger variables
 *
 * Also handles cross-file patterns: if a file imports a variable that was
 * created from `createLogger()` or `defineDiagnostics()` in another file,
 * the usage is tracked and wrapped.
 */
export function transform(
  code: string,
  id: string,
  options?: TransformOptions,
  trackedExportsMap?: TrackedExportsMap,
): TransformResult | undefined {
  const packageName = options?.packageName ?? '@antfu/experimental-logs-sdk'

  const result = parseSync(id, code)
  const ast = result.program

  // Step 1: Find direct imports from the package
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

  // Step 2: Find cross-file tracked imports
  const crossFileTracked = new Set<string>()
  if (trackedExportsMap) {
    for (const node of ast.body) {
      if (node.type === 'ImportDeclaration' && node.source.value !== packageName) {
        const source = node.source.value as string
        // Only resolve relative imports
        if (!source.startsWith('.'))
          continue

        const resolvedPath = resolveModulePath(source, id)
        if (!resolvedPath)
          continue

        // Analyze the imported module if not already cached
        if (!trackedExportsMap.has(resolvedPath)) {
          analyzeModule(resolvedPath, packageName, trackedExportsMap)
        }

        const trackedNames = trackedExportsMap.get(resolvedPath)
        if (trackedNames) {
          for (const spec of node.specifiers) {
            if (spec.type === 'ImportSpecifier') {
              const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
              if (trackedNames.has(importedName)) {
                crossFileTracked.add(spec.local.name)
              }
            }
          }
        }
      }
    }
  }

  if (importedNames.size === 0 && crossFileTracked.size === 0)
    return undefined

  const s = new MagicString(code)
  const trackedVars = new Set<string>(crossFileTracked)

  // Step 3: Walk all statements recursively
  walkStatements(ast.body, s, importedNames, trackedVars)

  if (!s.hasChanged())
    return undefined

  // Step 4: Record exported tracked vars for cross-file tracking
  if (trackedExportsMap) {
    const exportedTracked = new Set<string>()
    for (const node of ast.body) {
      if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
        for (const decl of node.declaration.declarations) {
          if (decl.id?.type === 'Identifier' && trackedVars.has(decl.id.name)) {
            exportedTracked.add(decl.id.name)
          }
        }
      }
    }
    if (exportedTracked.size > 0) {
      trackedExportsMap.set(id, exportedTracked)
    }
  }

  return {
    code: s.toString(),
    map: s.generateMap({ hires: 'boundary' }),
  }
}

const CONDITION = 'process.env.NODE_ENV !== \'production\''

/**
 * Check if an expression has lower precedence than `&&` and needs inner parens
 * when used as the right-hand side of `guard && expr`.
 */
function expressionNeedsParens(node: any): boolean {
  if (node.type === 'ConditionalExpression')
    return true
  if (node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??'))
    return true
  if (node.type === 'SequenceExpression')
    return true
  if (node.type === 'AssignmentExpression')
    return true
  return false
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']

function resolveModulePath(source: string, importer: string): string | undefined {
  const dir = dirname(importer)
  const base = join(dir, source)

  // Try exact path (for imports with extension)
  if (existsSync(base))
    return base

  // Try with extensions
  for (const ext of EXTENSIONS) {
    const candidate = base + ext
    if (existsSync(candidate))
      return candidate
  }

  // Try index files
  for (const ext of EXTENSIONS) {
    const candidate = join(base, `index${ext}`)
    if (existsSync(candidate))
      return candidate
  }

  return undefined
}

/**
 * Analyze a module to find exported variables derived from logs-sdk calls.
 * Results are cached in trackedExportsMap.
 */
function analyzeModule(filePath: string, packageName: string, trackedExportsMap: TrackedExportsMap): void {
  // Mark as analyzed (even if no tracked exports) to avoid re-analysis
  trackedExportsMap.set(filePath, new Set())

  let source: string
  try {
    source = readFileSync(filePath, 'utf-8')
  }
  catch {
    return
  }

  if (!source.includes(packageName))
    return

  const result = parseSync(filePath, source)
  const ast = result.program

  // Find imports from the package
  const importedNames = new Set<string>()
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === packageName) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          importedNames.add(spec.local.name)
        }
      }
    }
  }

  if (importedNames.size === 0)
    return

  // Find exported variables assigned from imported function calls
  const trackedExports = new Set<string>()
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      for (const decl of node.declaration.declarations) {
        if (
          decl.init?.type === 'CallExpression'
          && decl.init.callee?.type === 'Identifier'
          && importedNames.has(decl.init.callee.name)
          && decl.id?.type === 'Identifier'
        ) {
          trackedExports.add(decl.id.name)
        }
      }
    }
  }

  if (trackedExports.size > 0) {
    trackedExportsMap.set(filePath, trackedExports)
  }
}

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
        const needsParens = expressionNeedsParens(stmt.expression)
        if (needsParens) {
          s.appendLeft(stmt.expression.start, `${CONDITION} && (`)
          s.appendRight(stmt.expression.end, `)`)
        }
        else {
          s.appendLeft(stmt.expression.start, `${CONDITION} && `)
        }
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

  // Logical expression: check either side
  if (node.type === 'LogicalExpression') {
    return expressionUsesTrackedVar(node.left, trackedVars)
      || expressionUsesTrackedVar(node.right, trackedVars)
  }

  // Conditional (ternary): check consequent or alternate
  if (node.type === 'ConditionalExpression') {
    return expressionUsesTrackedVar(node.consequent, trackedVars)
      || expressionUsesTrackedVar(node.alternate, trackedVars)
  }

  // Unary expression: check argument
  if (node.type === 'UnaryExpression') {
    return expressionUsesTrackedVar(node.argument, trackedVars)
  }

  // Await expression: check argument
  if (node.type === 'AwaitExpression') {
    return expressionUsesTrackedVar(node.argument, trackedVars)
  }

  // Sequence expression: check any element
  if (node.type === 'SequenceExpression') {
    return node.expressions.some((expr: any) => expressionUsesTrackedVar(expr, trackedVars))
  }

  // Parenthesized expression: unwrap
  if (node.type === 'ParenthesizedExpression') {
    return expressionUsesTrackedVar(node.expression, trackedVars)
  }

  return false
}
