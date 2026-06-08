import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import User from '~/models/User.schema'
import RefreshToken from '~/models/RefreshToken.schema'
import Product from '~/models/Product.schema'
import Cart from '~/models/Cart.schema'
import Order from '~/models/Order.schema'
import { ProductCategory, OrderStatus } from '~/constants/enums'

dotenv.config() //ket noi den file .env

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@shoppingcartprojectclus.p2kri9o.mongodb.net/?appName=shoppingCartProjectCluster`

const LOCAL_DB_PATH = path.resolve(process.cwd(), 'local_db.json')

function readLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(
      LOCAL_DB_PATH,
      JSON.stringify({ users: [], refreshTokens: [], products: [], carts: [], orders: [] }, null, 2)
    )
  }
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8')
    const parsed = JSON.parse(data)
    // Ensure all collections exist even in old db files
    if (!parsed.products) parsed.products = []
    if (!parsed.carts) parsed.carts = []
    if (!parsed.orders) parsed.orders = []
    return parsed
  } catch (err) {
    return { users: [], refreshTokens: [], products: [], carts: [], orders: [] }
  }
}

function writeLocalDb(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2))
}

type LocalCollectionName = 'users' | 'refreshTokens' | 'products' | 'carts' | 'orders'

class MockCollection<T extends { _id?: ObjectId | string }> {
  constructor(private name: LocalCollectionName) {}

  async insertOne(doc: any) {
    const db = readLocalDb()
    if (!doc._id) {
      doc._id = new ObjectId()
    }
    db[this.name].push(doc)
    writeLocalDb(db)
    return { acknowledged: true, insertedId: doc._id }
  }

  async findOne(query: any, options?: any) {
    const db = readLocalDb()
    const items = db[this.name]
    const item = items.find((x: any) => {
      for (const key in query) {
        let val = query[key]
        let itemVal = x[key]

        // Handle ObjectId comparison
        if (val instanceof ObjectId) val = val.toString()
        if (itemVal && typeof itemVal === 'object' && itemVal.$oid) itemVal = itemVal.$oid
        if (itemVal instanceof ObjectId) itemVal = itemVal.toString()
        
        if (key === '_id' && typeof itemVal === 'string') {
          if (itemVal !== val) return false
          continue
        }

        if (itemVal !== val) return false
      }
      return true
    })

    if (!item) return null

    const cloned = JSON.parse(JSON.stringify(item))
    if (cloned._id) {
      cloned._id = new ObjectId(cloned._id)
    }

    // Handle projection
    if (options && options.projection) {
      for (const k in options.projection) {
        if (options.projection[k] === 0) {
          delete cloned[k]
        }
      }
    }
    return cloned
  }

  async updateOne(filter: any, update: any, options?: any) {
    const db = readLocalDb()
    const items = db[this.name]
    const index = items.findIndex((x: any) => {
      for (const key in filter) {
        let val = filter[key]
        let itemVal = x[key]
        if (val instanceof ObjectId) val = val.toString()
        if (itemVal && typeof itemVal === 'object' && itemVal.$oid) itemVal = itemVal.$oid
        if (itemVal instanceof ObjectId) itemVal = itemVal.toString()
        if (key === '_id' && typeof itemVal === 'string') {
          if (itemVal !== val) return false
          continue
        }
        if (itemVal !== val) return false
      }
      return true
    })

    if (index === -1) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }
    }

    let setObj: any = {}
    if (Array.isArray(update)) {
      const setStage = update.find((stage: any) => stage.$set)
      if (setStage) setObj = setStage.$set
    } else if (update && update.$set) {
      setObj = update.$set
    }

    const item = items[index]
    for (const key in setObj) {
      let val = setObj[key]
      if (val === '$$NOW') {
        val = new Date().toISOString()
      }
      item[key] = val
    }

    db[this.name][index] = item
    writeLocalDb(db)
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
  }

  async findOneAndUpdate(filter: any, update: any, options?: any) {
    const db = readLocalDb()
    const items = db[this.name]
    const index = items.findIndex((x: any) => {
      for (const key in filter) {
        let val = filter[key]
        let itemVal = x[key]
        if (val instanceof ObjectId) val = val.toString()
        if (itemVal && typeof itemVal === 'object' && itemVal.$oid) itemVal = itemVal.$oid
        if (itemVal instanceof ObjectId) itemVal = itemVal.toString()
        if (key === '_id' && typeof itemVal === 'string') {
          if (itemVal !== val) return false
          continue
        }
        if (itemVal !== val) return false
      }
      return true
    })

    if (index === -1) return null

    let setObj: any = {}
    if (Array.isArray(update)) {
      const setStage = update.find((stage: any) => stage.$set)
      if (setStage) setObj = setStage.$set
    } else if (update && update.$set) {
      setObj = update.$set
    }

    const item = items[index]
    for (const key in setObj) {
      let val = setObj[key]
      if (val === '$$NOW') {
        val = new Date().toISOString()
      }
      item[key] = val
    }

    db[this.name][index] = item
    writeLocalDb(db)

    const cloned = JSON.parse(JSON.stringify(item))
    if (cloned._id) {
      cloned._id = new ObjectId(cloned._id)
    }

    if (options && options.projection) {
      for (const k in options.projection) {
        if (options.projection[k] === 0) {
          delete cloned[k]
        }
      }
    }
    return cloned
  }

  async deleteOne(filter: any, options?: any) {
    const db = readLocalDb()
    const items = db[this.name]
    const index = items.findIndex((x: any) => {
      for (const key in filter) {
        let val = filter[key]
        let itemVal = x[key]
        if (val instanceof ObjectId) val = val.toString()
        if (itemVal && typeof itemVal === 'object' && itemVal.$oid) itemVal = itemVal.$oid
        if (itemVal instanceof ObjectId) itemVal = itemVal.toString()
        if (key === '_id' && typeof itemVal === 'string') {
          if (itemVal !== val) return false
          continue
        }
        if (itemVal !== val) return false
      }
      return true
    })

    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 }
    }

    items.splice(index, 1)
    db[this.name] = items
    writeLocalDb(db)
    return { acknowledged: true, deletedCount: 1 }
  }

  private matchesQuery(item: any, query: any): boolean {
    for (const key in query) {
      let val = query[key]
      let itemVal = item[key]
      if (val instanceof ObjectId) val = val.toString()
      if (itemVal && typeof itemVal === 'object' && itemVal.$oid) itemVal = itemVal.$oid
      if (itemVal instanceof ObjectId) itemVal = itemVal.toString()
      if (itemVal !== val) return false
    }
    return true
  }

  find(query: any = {}) {
    const self = this
    const base = {
      toArray: async () => {
        const db = readLocalDb()
        const items = db[self.name] || []
        if (Object.keys(query).length === 0) return items
        return items.filter((x: any) => self.matchesQuery(x, query))
      }
    }
    return {
      ...base,
      sort: (sortObj: Record<string, 1 | -1>) => ({
        toArray: async () => {
          const items = await base.toArray()
          const key = Object.keys(sortObj)[0]
          const dir = sortObj[key]
          return items.sort((a: any, b: any) => {
            const aVal = a[key]
            const bVal = b[key]
            if (aVal < bVal) return dir === -1 ? 1 : -1
            if (aVal > bVal) return dir === -1 ? -1 : 1
            return 0
          })
        }
      })
    }
  }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
class DatabaseServices {
  private client!: MongoClient //prop
  private db!: Db //prop
  private isFallbackMode = false

  constructor() {
    try {
      this.client = new MongoClient(uri)
      this.db = this.client.db(process.env.DB_NAME)
    } catch (err) {
      this.isFallbackMode = true
    }
  }

  async connect() {
    if (this.isFallbackMode) {
      console.warn('--- Local JSON database fallback active ---')
      await this.seedProducts()
      return
    }
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
      await this.seedProducts()
    } catch (error) {
      console.warn('--- WARNING: Could not connect to MongoDB Atlas ---')
      console.warn(error)
      console.warn('--- Activating local JSON database fallback ---')
      this.isFallbackMode = true
      await this.seedProducts()
    }
  }

  // Tao du lieu mau san pham neu chua co
  private async seedProducts() {
    const existing = await this.products.find({}).toArray()
    if (existing.length > 0) return

    const sampleProducts = [
      new Product({
        name: 'MacBook Pro 16" M3 Pro',
        description:
          'Laptop Apple MacBook Pro 16 inch chip M3 Pro 12-core CPU, 18-core GPU, RAM 36GB, SSD 512GB. Màn hình Liquid Retina XDR 16.2 inch, pin 22 giờ.',
        price: 69990000,
        original_price: 79990000,
        stock: 15,
        category: ProductCategory.Laptop,
        image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop',
        brand: 'Apple',
        rating: 4.9,
        sold_count: 234
      }),
      new Product({
        name: 'iPhone 15 Pro Max 256GB',
        description:
          'iPhone 15 Pro Max 256GB chip A17 Pro, camera 48MP ProRAW, màn hình Super Retina XDR 6.7 inch ProMotion 120Hz, hỗ trợ USB-C.',
        price: 32990000,
        original_price: 34990000,
        stock: 42,
        category: ProductCategory.Phone,
        image_url: 'https://images.unsplash.com/photo-1696446700704-46954d394066?w=600&h=600&fit=crop',
        brand: 'Apple',
        rating: 4.8,
        sold_count: 1205
      }),
      new Product({
        name: 'Samsung Galaxy S24 Ultra',
        description:
          'Samsung Galaxy S24 Ultra 256GB chip Snapdragon 8 Gen 3, bút S Pen, camera 200MP, màn hình Dynamic AMOLED 6.8 inch 120Hz.',
        price: 29990000,
        original_price: 33990000,
        stock: 28,
        category: ProductCategory.Phone,
        image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop',
        brand: 'Samsung',
        rating: 4.7,
        sold_count: 876
      }),
      new Product({
        name: 'Sony WH-1000XM5',
        description:
          'Tai nghe chống ồn chủ động Sony WH-1000XM5, driver 30mm, pin 30 giờ, kết nối Bluetooth 5.2, hỗ trợ LDAC Hi-Res Audio.',
        price: 7490000,
        original_price: 8990000,
        stock: 67,
        category: ProductCategory.Headphone,
        image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop',
        brand: 'Sony',
        rating: 4.8,
        sold_count: 2341
      }),
      new Product({
        name: 'Apple Watch Ultra 2',
        description:
          'Apple Watch Ultra 2 chip S9 SiP, màn hình LTPO OLED 49mm, GPS chính xác cao, chống nước 100m, pin 60 giờ chế độ năng lượng thấp.',
        price: 19990000,
        original_price: 22990000,
        stock: 19,
        category: ProductCategory.Watch,
        image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop',
        brand: 'Apple',
        rating: 4.9,
        sold_count: 432
      }),
      new Product({
        name: 'iPad Pro 12.9" M2',
        description:
          'iPad Pro 12.9 inch M2 chip, màn hình Liquid Retina XDR ProMotion 120Hz, camera 12MP Ultra Wide, hỗ trợ Apple Pencil 2 và Magic Keyboard.',
        price: 27990000,
        original_price: 29990000,
        stock: 33,
        category: ProductCategory.Tablet,
        image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop',
        brand: 'Apple',
        rating: 4.8,
        sold_count: 567
      }),
    ]

    for (const product of sampleProducts) {
      await this.products.insertOne(product as any)
    }
    console.log(`✅ Seeded ${sampleProducts.length} products successfully.`)
  }

  // method ket noi collection users
  get users(): Collection<User> {
    if (this.isFallbackMode) {
      return new MockCollection<User>('users') as any
    }
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }

  // dung de luu refreshToken cua nguoi dung vao database
  get refreshTokens(): Collection<RefreshToken> {
    if (this.isFallbackMode) {
      return new MockCollection<RefreshToken>('refreshTokens') as any
    }
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }

  // collection san pham
  get products(): Collection<Product> {
    if (this.isFallbackMode) {
      return new MockCollection<Product>('products') as any
    }
    return this.db.collection('products')
  }

  // collection gio hang (1 user - 1 cart)
  get carts(): Collection<Cart> {
    if (this.isFallbackMode) {
      return new MockCollection<Cart>('carts') as any
    }
    return this.db.collection('carts')
  }

  // collection don hang
  get orders(): Collection<Order> {
    if (this.isFallbackMode) {
      return new MockCollection<Order>('orders') as any
    }
    return this.db.collection('orders')
  }
}

//tao instance ngay tai day
const databaseServices = new DatabaseServices()
export default databaseServices
