import { StartDevServer } from '.'
import { makeHtmlPlugin } from './makeHtmlPlugin'
import http from 'http'
import { resolve } from 'path'
import NollupDevMiddleware from 'nollup/lib/dev-middleware'
import express from 'express'
import { RollupOptions, Plugin } from 'rollup'

/**
 * Inject HMR runtime into each bundle, since Nollup
 * does not do this.
 */
function injectHmrPlugin (): Plugin {
  return {
    name: 'MyPlugin',
    transform: (code) => {
      return {
        // inject HMR runtime
        // TODO: see if this ruins the source map
        code: `
          if (module) {
            module.hot.accept(() => {
              window.location.reload()
            })
          }

          ${code}
        `,
      }
    },
  }
}

interface NollupDevServer {
  port: number
  server: http.Server
}

export async function start (devServerOptions: StartDevServer): Promise<NollupDevServer> {
  const config = devServerOptions.options.specs
  .map<RollupOptions>((spec) => {
    return {
      ...devServerOptions.rollupConfig,
      input: spec.absolute,
      plugins: (devServerOptions.rollupConfig.plugins || []).concat(
        injectHmrPlugin(),
      ),
    }
  })

  const app = express()
  const server = http.createServer(app)
  const contentBase = resolve(__dirname, devServerOptions.options.config.projectRoot)
  /* random port between 3000 and 23000 */
  const port = parseInt(((Math.random() * 20000) + 3000).toFixed(0), 10)

  const nollup = NollupDevMiddleware(app, config, {
    contentBase,
    port,
    publicPath: '/',
    hot: true,
  }, server)

  app.use(nollup)

  makeHtmlPlugin(
    devServerOptions.options.config.projectRoot,
    devServerOptions.options.config.supportFile,
    app,
  )

  return {
    port,
    server,
  }
}
