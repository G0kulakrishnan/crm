import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple plugin to emulate Vercel serverless functions in Vite dev server
const vercelApiPlugin = () => ({
  name: 'vercel-api-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api')) {
        try {
          const [urlPath] = req.url.split('?')
          let filePath = path.join(__dirname, urlPath + '.js')
          if (!fs.existsSync(filePath)) {
            filePath = path.join(__dirname, urlPath, 'index.js')
          }
          if (fs.existsSync(filePath)) {
            // Read body
            let bodyStr = ''
            req.on('data', chunk => { bodyStr += chunk })
            await new Promise(resolve => req.on('end', resolve))
            
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {}
            } catch (e) {
              req.body = {}
            }

            // Vercel function polyfills
            res.status = (code) => { res.statusCode = code; return res; }
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
            }
            // Pass the loaded dotenv vars down
            req.env = process.env;

            // Import handler dynamically (adding timestamp to bypass cache if it's changing)
            const module = await import('file://' + filePath.replace(/\\/g, '/') + '?t=' + Date.now())
            const handler = module.default
            await handler(req, res)
            return
          }
        } catch (err) {
          console.error('API Error:', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
          return
        }
      }
      next()
    })
  }
})

export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
})
