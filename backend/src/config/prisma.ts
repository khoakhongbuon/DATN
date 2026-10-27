import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envLocalPath = path.resolve(__dirname, '../../.env.local')
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true })
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const connectionString = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })

export const prisma = global.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
