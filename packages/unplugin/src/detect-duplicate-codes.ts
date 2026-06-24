import type { CallExpression, Expression } from 'oxc-parser'
import type { TransformOptions } from './transform'
import { parseSync } from 'oxc-parser'

/**
 * A duplicate diagnostic code and every file that defines it.
 */
export interface DuplicateCode {
  code: string
  files: string[]
}

/**
 * Statically extract the diagnostic codes declared by `defineDiagnostics()`
 * calls in a module.
 *
 * Only the keys of the `codes` object are returned, and only when they are
 * statically known: bare identifier keys (`MATH_E001: {...}`) and string-literal
 * keys (`'MATH_E001': {...}`). Computed keys (`[FOO]: {}`) and spreads
 * (`...base`) are skipped on purpose so the duplicate check never reports a code
 * it cannot prove. Returns `[]` when the file does not import `defineDiagnostics`
 * from `packageName`.
 */
export function extractDiagnosticCodes(
  code: string,
  id: string,
  options?: TransformOptions,
): string[] {
  // Cheap bail-out before parsing: every relevant file mentions the call.
  if (!code.includes('defineDiagnostics'))
    return []

  const packageName = options?.packageName ?? 'nostics'

  const result = parseSync(id, code)
  const ast = result.program

  // Local names bound to `defineDiagnostics` imported from the package root.
  const defineDiagnosticsImports = new Set<string>()
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== packageName)
      continue
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

  if (defineDiagnosticsImports.size === 0)
    return []

  const codes: string[] = []
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        collectCallCodes(decl.init, defineDiagnosticsImports, codes)
      }
    }
    else if (
      node.type === 'ExportNamedDeclaration'
      && node.declaration?.type === 'VariableDeclaration'
    ) {
      for (const decl of node.declaration.declarations) {
        collectCallCodes(decl.init, defineDiagnosticsImports, codes)
      }
    }
  }

  return codes
}

/**
 * Walk a variable initializer, collecting the codes of any `defineDiagnostics()`
 * call it contains. Recognizes a direct call and the production-builds ternary
 * (`cond ? defineProdDiagnostics(...) : defineDiagnostics({ codes })`), where the
 * dev branch holds the call with the codes.
 */
function collectCallCodes(
  init: Expression | null | undefined,
  defineDiagnosticsImports: Set<string>,
  codes: string[],
): void {
  if (!init)
    return
  if (
    init.type === 'CallExpression'
    && init.callee?.type === 'Identifier'
    && defineDiagnosticsImports.has(init.callee.name)
  ) {
    collectCodesFromCall(init, codes)
    return
  }
  if (init.type === 'ConditionalExpression') {
    collectCallCodes(init.consequent, defineDiagnosticsImports, codes)
    collectCallCodes(init.alternate, defineDiagnosticsImports, codes)
  }
}

/**
 * Pull the static keys of the `codes` object out of a `defineDiagnostics()` call.
 */
function collectCodesFromCall(call: CallExpression, codes: string[]): void {
  const arg = call.arguments[0]
  if (!arg || arg.type !== 'ObjectExpression')
    return

  const codesProp = arg.properties.find(
    p =>
      p.type === 'Property'
      && !p.computed
      && ((p.key.type === 'Identifier' && p.key.name === 'codes')
        || (p.key.type === 'Literal' && p.key.value === 'codes')),
  )
  if (!codesProp || codesProp.type !== 'Property' || codesProp.value.type !== 'ObjectExpression')
    return

  for (const prop of codesProp.value.properties) {
    if (prop.type !== 'Property' || prop.computed)
      continue
    if (prop.key.type === 'Identifier') {
      codes.push(prop.key.name)
    }
    else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
      codes.push(prop.key.value)
    }
  }
}

/**
 * Tracks which file owns each diagnostic code so collisions across files can be
 * reported. State is updated per file: re-running {@link CodeRegistry.update}
 * for a file replaces its previous codes (so HMR re-transforms stay accurate),
 * and {@link CodeRegistry.remove} drops a deleted file entirely.
 */
export interface CodeRegistry {
  /** Replace the codes recorded for a file. */
  update: (id: string, codes: string[]) => void
  /** Forget a file (e.g. it was deleted). */
  remove: (id: string) => void
  /**
   * Return the codes of `id` that are also defined in at least one other file,
   * each paired with every owning file (sorted, including `id`).
   */
  findDuplicatesFor: (id: string) => DuplicateCode[]
}

export function createCodeRegistry(): CodeRegistry {
  const fileCodes = new Map<string, Set<string>>()
  const codeOwners = new Map<string, Set<string>>()

  function remove(id: string): void {
    const previous = fileCodes.get(id)
    if (!previous)
      return
    for (const code of previous) {
      const owners = codeOwners.get(code)
      if (!owners)
        continue
      owners.delete(id)
      if (owners.size === 0)
        codeOwners.delete(code)
    }
    fileCodes.delete(id)
  }

  function update(id: string, codes: string[]): void {
    remove(id)
    const unique = new Set(codes)
    fileCodes.set(id, unique)
    for (const code of unique) {
      let owners = codeOwners.get(code)
      if (!owners) {
        owners = new Set()
        codeOwners.set(code, owners)
      }
      owners.add(id)
    }
  }

  function findDuplicatesFor(id: string): DuplicateCode[] {
    const codes = fileCodes.get(id)
    if (!codes)
      return []
    const duplicates: DuplicateCode[] = []
    for (const code of codes) {
      const owners = codeOwners.get(code)
      if (owners && owners.size > 1) {
        duplicates.push({ code, files: [...owners].sort() })
      }
    }
    return duplicates
  }

  return { update, remove, findDuplicatesFor }
}
