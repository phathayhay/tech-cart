import usersRoutes from './routes/users.routes'
import express from 'express'
import databaseServices from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import mediasRoutes from './routes/medias.routes'
import productsRoutes from './routes/products.routes'
import cartsRoutes from './routes/carts.routes'
import ordersRoutes from './routes/orders.routes'
import { initFolder } from './utils/file'
import staticRoutes from './routes/static.routes'
import path from 'path'

const app = express() //dung server len
const PORT = 3000

databaseServices.connect()
initFolder()
app.use(express.json())
app.use(express.static(path.resolve('public')))
app.use('/users', usersRoutes)
app.use('/medias', mediasRoutes)
app.use('/products', productsRoutes)
app.use('/cart', cartsRoutes)
app.use('/orders', ordersRoutes)
app.use('/static', staticRoutes)
//localhost:3000/users/get-me

// error handle tong
app.use(defaultErrorHandler)

//cho app mo cong don khach
app.listen(PORT, () => {
  console.log(`This Project running at localhost:${PORT}`)
})
