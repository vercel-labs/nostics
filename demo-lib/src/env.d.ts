// Minimal ambient typing so `process.env.NODE_ENV` typechecks without @types/node.
// The `nosticsStrip` plugin replaces this guard at build time.
declare const process: {
  env: { NODE_ENV?: string }
}
