import { Collection, ObjectId } from 'mongodb'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import User from '~/models/User.schema'
import RefreshToken from '~/models/RefreshToken.schema'
import Product from '~/models/Product.schema'
import Cart from '~/models/Cart.schema'
import Order from '~/models/Order.schema'
import { ProductCategory } from '~/constants/enums'

dotenv.config()

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
type PostgresTableName = 'users' | 'refresh_tokens' | 'products' | 'carts' | 'orders'

const JSONB_COLUMNS = new Set(['images', 'items', 'status_history'])
const VALID_IDENTIFIERS = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function assertValidIdentifier(ident: string) {
  if (!VALID_IDENTIFIERS.test(ident)) {
    throw new Error(`Invalid SQL identifier: ${ident}`)
  }
}

function serializePgValue(col: string, val: any): any {
  if (val === undefined) return null
  if (val === '$$NOW') return new Date()
  if (val instanceof ObjectId) return val.toString()
  if (val instanceof Date) return val
  if (JSONB_COLUMNS.has(col)) {
    return JSON.stringify(val ?? [])
  }
  return val
}

function normalizeRow(row: any, projection?: Record<string, number>) {
  if (!row) return null
  const cloned: any = { ...row }

  if (cloned._id && ObjectId.isValid(cloned._id)) {
    cloned._id = new ObjectId(cloned._id)
  }
  if (cloned.user_id && typeof cloned.user_id === 'string' && ObjectId.isValid(cloned.user_id)) {
    cloned.user_id = new ObjectId(cloned.user_id)
  }
  if (Array.isArray(cloned.items)) {
    cloned.items = cloned.items.map((item: any) => ({
      ...item,
      product_id:
        item.product_id && typeof item.product_id === 'string' && ObjectId.isValid(item.product_id)
          ? new ObjectId(item.product_id)
          : item.product_id
    }))
  }

  if (projection) {
    for (const k of Object.keys(projection)) {
      if (projection[k] === 0) {
        delete cloned[k]
      }
    }
  }
  return cloned
}

function extractSetObject(update: any): Record<string, any> {
  let setObj: Record<string, any> = {}
  if (Array.isArray(update)) {
    const setStage = update.find((stage: any) => stage.$set)
    if (setStage) setObj = { ...setStage.$set }
  } else if (update && update.$set) {
    setObj = { ...update.$set }
  }
  for (const key of Object.keys(setObj)) {
    if (setObj[key] === '$$NOW') {
      setObj[key] = new Date()
    }
  }
  return setObj
}

class PostgresTableAdapter<T extends { _id?: ObjectId | string }> {
  constructor(
    private pool: Pool,
    private tableName: PostgresTableName
  ) {
    assertValidIdentifier(tableName)
  }

  private buildWhereClause(filter: Record<string, any> = {}, startParamIndex = 1) {
    const keys = Object.keys(filter)
    if (keys.length === 0) {
      return { whereSql: '', values: [] as any[] }
    }
    const clauses: string[] = []
    const values: any[] = []
    keys.forEach((key, idx) => {
      assertValidIdentifier(key)
      clauses.push(`"${key}" = $${startParamIndex + idx}`)
      values.push(serializePgValue(key, filter[key]))
    })
    return {
      whereSql: `WHERE ${clauses.join(' AND ')}`,
      values
    }
  }

  async insertOne(doc: any) {
    const payload = { ...doc }
    if (!payload._id) {
      payload._id = new ObjectId()
    }

    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined)
    keys.forEach(assertValidIdentifier)

    const columnsSql = keys.map((k) => `"${k}"`).join(', ')
    const placeholdersSql = keys.map((_, i) => `$${i + 1}`).join(', ')
    const values = keys.map((k) => serializePgValue(k, payload[k]))

    await this.pool.query(
      `INSERT INTO "${this.tableName}" (${columnsSql}) VALUES (${placeholdersSql})`,
      values
    )

    return { acknowledged: true, insertedId: payload._id }
  }

  async findOne(query: any = {}, options?: any) {
    const { whereSql, values } = this.buildWhereClause(query)
    const result = await this.pool.query(
      `SELECT * FROM "${this.tableName}" ${whereSql} LIMIT 1`,
      values
    )
    if (result.rows.length === 0) return null
    return normalizeRow(result.rows[0], options?.projection)
  }

  async updateOne(filter: any, update: any, _options?: any) {
    const setObj = extractSetObject(update)
    const setKeys = Object.keys(setObj).filter((k) => setObj[k] !== undefined)
    if (setKeys.length === 0) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }
    }

    setKeys.forEach(assertValidIdentifier)
    const setClauses = setKeys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ')
    const setValues = setKeys.map((k) => serializePgValue(k, setObj[k]))

    const { whereSql, values: whereValues } = this.buildWhereClause(filter, setKeys.length + 1)
    const result = await this.pool.query(
      `UPDATE "${this.tableName}" SET ${setClauses} ${whereSql}`,
      [...setValues, ...whereValues]
    )

    const count = result.rowCount || 0
    return { acknowledged: true, matchedCount: count, modifiedCount: count }
  }

  async findOneAndUpdate(filter: any, update: any, options?: any) {
    const setObj = extractSetObject(update)
    const setKeys = Object.keys(setObj).filter((k) => setObj[k] !== undefined)
    if (setKeys.length === 0) {
      return this.findOne(filter, options)
    }

    setKeys.forEach(assertValidIdentifier)
    const setClauses = setKeys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ')
    const setValues = setKeys.map((k) => serializePgValue(k, setObj[k]))

    const { whereSql, values: whereValues } = this.buildWhereClause(filter, setKeys.length + 1)
    const result = await this.pool.query(
      `UPDATE "${this.tableName}" SET ${setClauses} ${whereSql} RETURNING *`,
      [...setValues, ...whereValues]
    )

    if (result.rows.length === 0) return null
    return normalizeRow(result.rows[0], options?.projection)
  }

  async deleteOne(filter: any, _options?: any) {
    const { whereSql, values } = this.buildWhereClause(filter)
    const result = await this.pool.query(
      `DELETE FROM "${this.tableName}" ${whereSql}`,
      values
    )
    return { acknowledged: true, deletedCount: result.rowCount || 0 }
  }

  find(query: any = {}) {
    const self = this
    const executeQuery = async (sortObj?: Record<string, 1 | -1>) => {
      const { whereSql, values } = self.buildWhereClause(query)
      let orderSql = ''
      if (sortObj && Object.keys(sortObj).length > 0) {
        const sortKey = Object.keys(sortObj)[0]
        assertValidIdentifier(sortKey)
        const dir = sortObj[sortKey] === -1 ? 'DESC' : 'ASC'
        orderSql = `ORDER BY "${sortKey}" ${dir}`
      }
      const result = await self.pool.query(
        `SELECT * FROM "${self.tableName}" ${whereSql} ${orderSql}`,
        values
      )
      return result.rows.map((r) => normalizeRow(r))
    }

    return {
      toArray: () => executeQuery(),
      sort: (sortObj: Record<string, 1 | -1>) => ({
        toArray: () => executeQuery(sortObj)
      })
    }
  }
}

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

    if (options && options.projection) {
      for (const k in options.projection) {
        if (options.projection[k] === 0) {
          delete cloned[k]
        }
      }
    }
    return cloned
  }

  async updateOne(filter: any, update: any, _options?: any) {
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

    const setObj = extractSetObject(update)
    const item = items[index]
    for (const key in setObj) {
      const val = setObj[key]
      item[key] = val instanceof Date ? val.toISOString() : val
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

    const setObj = extractSetObject(update)
    const item = items[index]
    for (const key in setObj) {
      const val = setObj[key]
      item[key] = val instanceof Date ? val.toISOString() : val
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

  async deleteOne(filter: any, _options?: any) {
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

class DatabaseServices {
  private pool!: Pool
  private isFallbackMode = false

  constructor() {
    try {
      const connectionString = process.env.POSTGRES_URL
      this.pool = connectionString
        ? new Pool({ connectionString, connectionTimeoutMillis: 4000 })
        : new Pool({
            host: process.env.PG_HOST || 'localhost',
            port: Number(process.env.PG_PORT || 5432),
            user: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD || 'postgres',
            database: process.env.PG_DATABASE || 'shopping_cart_be',
            connectionTimeoutMillis: 4000
          })
    } catch (err) {
      this.isFallbackMode = true
    }
  }

  private async ensureDatabaseExists() {
    const dbName = process.env.PG_DATABASE || 'shopping_cart_be'
    assertValidIdentifier(dbName)
    const adminPool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: 'postgres',
      connectionTimeoutMillis: 4000
    })
    try {
      const check = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
      if (check.rowCount === 0) {
        await adminPool.query(`CREATE DATABASE "${dbName}"`)
        console.log(`🐘 Created PostgreSQL database "${dbName}" automatically!`)
      }
    } finally {
      await adminPool.end()
    }
  }

  async connect() {
    if (this.isFallbackMode) {
      console.warn('--- Local JSON database fallback active ---')
      await this.seedProducts()
      return
    }
    try {
      try {
        await this.pool.query('SELECT 1')
      } catch (err: any) {
        if (err && err.code === '3D000') {
          await this.ensureDatabaseExists()
          await this.pool.query('SELECT 1')
        } else {
          throw err
        }
      }
      console.log('🐘 Connected to PostgreSQL database successfully!')
      await this.initPostgresTables()
      await this.seedProducts()
    } catch (error) {
      console.warn('--- WARNING: Could not connect to PostgreSQL ---')
      console.warn((error as Error).message)
      console.warn('--- Activating local JSON database fallback (local_db.json) ---')
      this.isFallbackMode = true
      await this.seedProducts()
    }
  }

  private async initPostgresTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT '',
        email VARCHAR(255) UNIQUE NOT NULL,
        date_of_birth TIMESTAMPTZ,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        email_verify_token TEXT NOT NULL DEFAULT '',
        forgot_password_token TEXT NOT NULL DEFAULT '',
        verify INTEGER NOT NULL DEFAULT 0,
        bio TEXT NOT NULL DEFAULT '',
        location VARCHAR(255) NOT NULL DEFAULT '',
        website VARCHAR(255) NOT NULL DEFAULT '',
        username VARCHAR(255) NOT NULL DEFAULT '',
        avatar TEXT NOT NULL DEFAULT '',
        cover_photo TEXT NOT NULL DEFAULT '',
        role INTEGER NOT NULL DEFAULT 2
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        _id VARCHAR(64) PRIMARY KEY,
        token TEXT NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price DOUBLE PRECISION NOT NULL,
        original_price DOUBLE PRECISION NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        brand VARCHAR(100) NOT NULL DEFAULT '',
        rating DOUBLE PRECISION NOT NULL DEFAULT 4.5,
        sold_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS carts (
        _id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        _id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_amount DOUBLE PRECISION NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        shipping_address TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

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
      })
    ]

    for (const product of sampleProducts) {
      await this.products.insertOne(product as any)
    }
    console.log(`✅ Seeded ${sampleProducts.length} products successfully.`)
  }

  get users(): Collection<User> {
    if (this.isFallbackMode) {
      return new MockCollection<User>('users') as any
    }
    return new PostgresTableAdapter<User>(this.pool, 'users') as any
  }

  get refreshTokens(): Collection<RefreshToken> {
    if (this.isFallbackMode) {
      return new MockCollection<RefreshToken>('refreshTokens') as any
    }
    return new PostgresTableAdapter<RefreshToken>(this.pool, 'refresh_tokens') as any
  }

  get products(): Collection<Product> {
    if (this.isFallbackMode) {
      return new MockCollection<Product>('products') as any
    }
    return new PostgresTableAdapter<Product>(this.pool, 'products') as any
  }

  get carts(): Collection<Cart> {
    if (this.isFallbackMode) {
      return new MockCollection<Cart>('carts') as any
    }
    return new PostgresTableAdapter<Cart>(this.pool, 'carts') as any
  }

  get orders(): Collection<Order> {
    if (this.isFallbackMode) {
      return new MockCollection<Order>('orders') as any
    }
    return new PostgresTableAdapter<Order>(this.pool, 'orders') as any
  }
}

const databaseServices = new DatabaseServices()
export default databaseServices
