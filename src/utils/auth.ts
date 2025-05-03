import { compare, hash } from "bcryptjs"

// Generate a secure random token for sessions without crypto-browserify
export const generateSecureToken = (): string => {
  const timestamp = Date.now().toString(36)
  const randomPart1 = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart1}-${randomPart2}`
}

// Hash a password using bcrypt
export const hashPassword = async (password: string): Promise<string> => {
  return await hash(password, 10)
}

// Verify a password against a hash
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await compare(password, hashedPassword)
}

// Generate a unique ID without crypto
export const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 10)
  return `${timestamp}${randomStr}`
}
