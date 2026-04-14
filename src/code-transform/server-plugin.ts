import type { UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import { createFileReporter } from '../node-reporter'

export interface LogsSdkServerOptions {
  /**
   * Path to the log file.
   * @default '.nostics.log'
   */
  logFile?: string
}

export const logsSDKServer: UnpluginInstance<LogsSdkServerOptions | undefined> = createUnplugin((options) => {
  const reporter = createFileReporter({ logFile: options?.logFile })

  return {
    name: 'nostics-server',
    enforce: 'pre',

    vite: {
      configureServer(server) {
        server.ws.on('nostics:report', (data) => {
          // TODO: validate data shape
          reporter(data, '')
        })
      },
    },
  }
})
