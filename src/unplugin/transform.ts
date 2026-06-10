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
   * @default 'nostics'
   */
  packageName?: string
}

/**
 * Cross-file state: maps file paths to sets of exported variable names
 * that are derived from nostics function calls (e.g. `defineDiagnostics`)
 */
export type TrackedExportsMap = Map<string, Set<string>>

const CONDITION = 'process.env.NODE_ENV !== "production"'

/**
 * Named exports from `nostics` that are side-effect-free factories: calling
 * them only builds and returns a value. Marking their call sites pure lets the
 * bundler drop them along with the `defineDiagnostics()` definition that holds
 * them (e.g. `reporters: [createReporterLog()]`).
 */
const PURE_FACTORIES = new Set(['createReporterLog'])

/**
 * Transforms code that imports from `nostics`:
 * - Adds `\/*#__PURE__*\/` to `defineDiagnostics()` call expressions
 * - Adds `\/*#__PURE__*\/` to calls of known pure factories (e.g. `createReporterLog()`)
 * - Prepends `process.env.NODE_ENV !== 'production' &&` to expression statements using diagnostics variables
 *
 * Also handles cross-file patterns: if a file imports a variable that was
 * created from `defineDiagnostics()` in another file, the usage is tracked
 * and wrapped.
 */
export function transform(
  code: string,
  id: string,
  options?: TransformOptions,
  trackedExportsMap?: TrackedExportsMap,
): TransformResult | undefined {
  const packageName = options?.packageName ?? 'nostics'

  const result = parseSync(id, code)
  const ast = result.program

  // Step 1: Find direct defineDiagnostics and pure-factory imports from the package
  const defineDiagnosticsImports = new Set<string>()
  const pureFactoryImports = new Set<string>()
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === packageName) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          const importedName
            = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
          if (importedName === 'defineDiagnostics') {
            defineDiagnosticsImports.add(spec.local.name)
          }
          else if (PURE_FACTORIES.has(importedName)) {
            pureFactoryImports.add(spec.local.name)
          }
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
              const importedName
                = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
              if (trackedNames.has(importedName)) {
                crossFileTracked.add(spec.local.name)
              }
            }
          }
        }
      }
    }
  }

  if (
    defineDiagnosticsImports.size === 0
    && crossFileTracked.size === 0
    && pureFactoryImports.size === 0
  ) {
    return undefined
  }

  const s = new MagicString(code)
  const trackedVars = new Set<string>(crossFileTracked)

  // Step 3a: track top-level variables derived from defineDiagnostics calls and
  // mark the calls as pure.
  trackTopLevelDefinitions(ast.body, s, defineDiagnosticsImports, trackedVars)

  // Step 3b: mark calls to known pure factories (e.g. `createReporterLog()`) as
  // pure so they can be dropped with the definition that holds them.
  annotatePureFactoryCalls(ast, s, pureFactoryImports)

  // Step 3c: wrap expression statements that use a tracked variable while
  // respecting lexical shadowing in nested scopes.
  wrapTrackedExpressionStatements(ast, s, trackedVars, new Set(), CONDITION)

  if (!s.hasChanged())
    return undefined

  // Step 4: Record exported tracked vars for cross-file tracking
  if (trackedExportsMap) {
    const exportedTracked = new Set<string>()
    for (const node of ast.body) {
      if (
        node.type === 'ExportNamedDeclaration'
        && node.declaration?.type === 'VariableDeclaration'
      ) {
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
 * Analyze a module to find exported variables derived from nostics calls.
 * Results are cached in trackedExportsMap.
 */
function analyzeModule(
  filePath: string,
  packageName: string,
  trackedExportsMap: TrackedExportsMap,
): void {
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

  // Find defineDiagnostics imports from the package
  const defineDiagnosticsImports = new Set<string>()
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === packageName) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          const importedName
            = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
          if (importedName === 'defineDiagnostics') {
            defineDiagnosticsImports.add(spec.local.name)
          }
        }
      }
    }
  }

  if (defineDiagnosticsImports.size === 0)
    return

  // Find exported variables assigned from imported function calls
  const trackedExports = new Set<string>()
  for (const node of ast.body) {
    if (
      node.type === 'ExportNamedDeclaration'
      && node.declaration?.type === 'VariableDeclaration'
    ) {
      for (const decl of node.declaration.declarations) {
        if (
          decl.init?.type === 'CallExpression'
          && decl.init.callee?.type === 'Identifier'
          && defineDiagnosticsImports.has(decl.init.callee.name)
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

function trackTopLevelDefinitions(
  body: any[],
  s: MagicString,
  defineDiagnosticsImports: Set<string>,
  trackedVars: Set<string>,
): void {
  for (const node of body) {
    if (node.type === 'VariableDeclaration') {
      trackVariableDeclaration(node, s, defineDiagnosticsImports, trackedVars)
    }
    else if (
      node.type === 'ExportNamedDeclaration'
      && node.declaration?.type === 'VariableDeclaration'
    ) {
      trackVariableDeclaration(node.declaration, s, defineDiagnosticsImports, trackedVars)
    }
  }
}

function trackVariableDeclaration(
  node: any,
  s: MagicString,
  defineDiagnosticsImports: Set<string>,
  trackedVars: Set<string>,
): void {
  for (const decl of node.declarations) {
    if (
      decl.init?.type === 'CallExpression'
      && decl.init.callee?.type === 'Identifier'
      && defineDiagnosticsImports.has(decl.init.callee.name)
      && decl.id?.type === 'Identifier'
    ) {
      trackedVars.add(decl.id.name)
      s.appendLeft(decl.init.start, '/*#__PURE__*/ ')
    }
  }
}

/**
 * Walks the AST and prepends `\/*#__PURE__*\/` to every call of an imported
 * pure factory (its callee is an identifier in `pureFactoryImports`). The
 * annotation only matters when the call's result is unused, so it is always
 * safe: used results are kept by the bundler regardless.
 */
function annotatePureFactoryCalls(
  node: any,
  s: MagicString,
  pureFactoryImports: Set<string>,
): void {
  if (!node || typeof node !== 'object')
    return

  if (Array.isArray(node)) {
    for (const child of node) {
      annotatePureFactoryCalls(child, s, pureFactoryImports)
    }
    return
  }

  if (
    node.type === 'CallExpression'
    && node.callee?.type === 'Identifier'
    && pureFactoryImports.has(node.callee.name)
  ) {
    s.appendLeft(node.start, '/*#__PURE__*/ ')
  }

  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end')
      continue
    annotatePureFactoryCalls(node[key], s, pureFactoryImports)
  }
}

function wrapTrackedExpressionStatements(
  node: any,
  s: MagicString,
  trackedVars: Set<string>,
  shadowedVars: Set<string>,
  condition: string,
): void {
  if (!node || typeof node !== 'object')
    return

  if (Array.isArray(node)) {
    for (const child of node) {
      wrapTrackedExpressionStatements(child, s, trackedVars, shadowedVars, condition)
    }
    return
  }

  if (node.type === 'Program') {
    wrapTrackedExpressionStatements(node.body, s, trackedVars, shadowedVars, condition)
    return
  }

  if (node.type === 'BlockStatement') {
    const blockShadowedVars = new Set(shadowedVars)
    for (const stmt of node.body) {
      collectStatementBindingNames(stmt, blockShadowedVars)
    }
    wrapTrackedExpressionStatements(node.body, s, trackedVars, blockShadowedVars, condition)
    return
  }

  if (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  ) {
    if (node.body?.type === 'BlockStatement') {
      const functionShadowedVars = new Set(shadowedVars)
      for (const param of node.params ?? []) {
        collectPatternNames(param, functionShadowedVars)
      }
      wrapTrackedExpressionStatements(node.body, s, trackedVars, functionShadowedVars, condition)
    }
    return
  }

  if (node.type === 'CatchClause') {
    const catchShadowedVars = new Set(shadowedVars)
    collectPatternNames(node.param, catchShadowedVars)
    wrapTrackedExpressionStatements(node.body, s, trackedVars, catchShadowedVars, condition)
    return
  }

  if (
    node.type === 'ExpressionStatement'
    && expressionUsesTrackedVar(node.expression, trackedVars, shadowedVars)
  ) {
    if (expressionNeedsParens(node.expression)) {
      s.appendLeft(node.expression.start, `${condition} && (`)
      s.appendRight(node.expression.end, `)`)
    }
    else {
      s.appendLeft(node.expression.start, `${condition} && `)
    }
    return
  }

  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end')
      continue
    wrapTrackedExpressionStatements(node[key], s, trackedVars, shadowedVars, condition)
  }
}

function collectStatementBindingNames(node: any, names: Set<string>): void {
  if (!node)
    return

  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      collectPatternNames(decl.id, names)
    }
  }
  else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    collectPatternNames(node.id, names)
  }
}

function collectPatternNames(node: any, names: Set<string>): void {
  if (!node)
    return

  if (node.type === 'Identifier') {
    names.add(node.name)
  }
  else if (node.type === 'AssignmentPattern') {
    collectPatternNames(node.left, names)
  }
  else if (node.type === 'RestElement') {
    collectPatternNames(node.argument, names)
  }
  else if (node.type === 'ArrayPattern') {
    for (const element of node.elements) {
      collectPatternNames(element, names)
    }
  }
  else if (node.type === 'ObjectPattern') {
    for (const property of node.properties) {
      collectPatternNames(property.value ?? property.argument, names)
    }
  }
}

/**
 * Check if an expression references a tracked variable as the root of a member/call chain.
 */
function expressionUsesTrackedVar(
  node: any,
  trackedVars: Set<string>,
  shadowedVars: Set<string>,
): boolean {
  if (!node)
    return false

  // Direct identifier reference
  if (node.type === 'Identifier') {
    return trackedVars.has(node.name) && !shadowedVars.has(node.name)
  }

  // Member expression: check the object (root of the chain)
  if (node.type === 'MemberExpression') {
    return expressionUsesTrackedVar(node.object, trackedVars, shadowedVars)
  }

  // Call expression: check the callee
  if (node.type === 'CallExpression') {
    return expressionUsesTrackedVar(node.callee, trackedVars, shadowedVars)
  }

  // Logical expression: check either side
  if (node.type === 'LogicalExpression') {
    return (
      expressionUsesTrackedVar(node.left, trackedVars, shadowedVars)
      || expressionUsesTrackedVar(node.right, trackedVars, shadowedVars)
    )
  }

  // Conditional (ternary): check consequent or alternate
  if (node.type === 'ConditionalExpression') {
    return (
      expressionUsesTrackedVar(node.consequent, trackedVars, shadowedVars)
      || expressionUsesTrackedVar(node.alternate, trackedVars, shadowedVars)
    )
  }

  // Unary expression: check argument
  if (node.type === 'UnaryExpression') {
    return expressionUsesTrackedVar(node.argument, trackedVars, shadowedVars)
  }

  // Await expression: check argument
  if (node.type === 'AwaitExpression') {
    return expressionUsesTrackedVar(node.argument, trackedVars, shadowedVars)
  }

  // Sequence expression: check any element
  if (node.type === 'SequenceExpression') {
    return node.expressions.some((expr: any) =>
      expressionUsesTrackedVar(expr, trackedVars, shadowedVars),
    )
  }

  // Parenthesized expression: unwrap
  if (node.type === 'ParenthesizedExpression') {
    return expressionUsesTrackedVar(node.expression, trackedVars, shadowedVars)
  }

  return false
}
