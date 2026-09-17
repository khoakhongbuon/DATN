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
import pcBuilderRoutes from './routes/pc-builder.routes'
import aiRoutes from './routes/ai.routes'
import { errorHandler } from './middlewares/error.middleware'

dotenv.config()

const app = express()
app.use(cors())
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
app.use('/api/orders/:orderId/payment', paymentRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/pc-builder', pcBuilderRoutes)
app.use('/api/ai', aiRoutes)

// error handler (last)
app.use(errorHandler)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
