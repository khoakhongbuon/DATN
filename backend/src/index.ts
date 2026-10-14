import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import categoryRoutes from './routes/category.routes'
import brandRoutes from './routes/brand.routes'
import productRoutes from './routes/product.routes'
import productImageRoutes from './routes/product-image.routes'
import productSpecificationRoutes from './routes/product-specification.routes'
import cartRoutes from './routes/cart.routes'
import authRoutes from './routes/auth.routes'
import addressRoutes from './routes/address.routes'
import orderRoutes from './routes/order.routes'
import paymentRoutes from './routes/payment.routes'
import paymentWebhookRoutes from './routes/payment-webhook.routes'
import pcBuilderRoutes from './routes/pc-builder.routes'
import aiRoutes from './routes/ai.routes'
import userRoutes from './routes/user.routes'
import { errorHandler } from './middlewares/error.middleware'

dotenv.config()

const app = express()

const isProduction = process.env.NODE_ENV === 'production'

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
const allowedOrigins = new Set(
  isProduction
    ? configuredOrigins
    : [...configuredOrigins, ...defaultDevOrigins]
)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests or same-origin requests (e.g. server-to-server IPN, curl, health check)
      if (!origin) {
        return callback(null, true)
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '')

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true)
      }

      // In production, reject unauthorized origins; in development with no config, allow localhost
      if (!isProduction && defaultDevOrigins.includes(normalizedOrigin)) {
        return callback(null, true)
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS policy`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  return res.json({ success: true, message: 'Backend is running' })
})

app.use('/api/categories', categoryRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/products', productRoutes)
app.use('/api/products/:productId/images', productImageRoutes)
app.use('/api/products/:productId/specifications', productSpecificationRoutes)
app.use('/api/cart/:userId', cartRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users/:userId/addresses', addressRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders/:orderId/payment', paymentRoutes)
app.use('/api/payments', paymentWebhookRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/pc-builder', pcBuilderRoutes)
app.use('/api/ai', aiRoutes)

// error handler (last)
app.use(errorHandler)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
