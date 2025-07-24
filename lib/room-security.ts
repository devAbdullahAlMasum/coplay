"use client"

import { Room, User, RoomError, RoomErrorCode, ROOM_CONSTANTS } from '@/types/room'
import { createRoomError } from '@/lib/room-utils'

// Security configuration
export const SECURITY_CONFIG = {
  ROOM_EXPIRY_HOURS: 24, // Rooms expire after 24 hours of inactivity
  MAX_FAILED_ATTEMPTS: 5, // Max failed join attempts before temporary ban
  BAN_DURATION_MINUTES: 15, // Temporary ban duration
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute rate limit window
  MAX_REQUESTS_PER_WINDOW: 10, // Max requests per window
  ROOM_CODE_ENTROPY: 6, // Room code length for security
  SESSION_TIMEOUT_MINUTES: 30, // User session timeout
  MAX_CONCURRENT_ROOMS: 3, // Max rooms a user can create
} as const

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const failedAttemptsStore = new Map<string, { count: number; banUntil?: number }>()
const userSessionStore = new Map<string, { lastActivity: number; roomIds: Set<string> }>()

/**
 * Generate a cryptographically secure room code
 */
export function generateSecureRoomCode(): string {
  const chars = ROOM_CONSTANTS.ROOM_CODE_CHARS
  let result = ''
  
  // Use crypto.getRandomValues for better randomness
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(SECURITY_CONFIG.ROOM_CODE_ENTROPY)
    window.crypto.getRandomValues(array)
    
    for (let i = 0; i < SECURITY_CONFIG.ROOM_CODE_ENTROPY; i++) {
      result += chars.charAt(array[i] % chars.length)
    }
  } else {
    // Fallback for server-side or older browsers
    for (let i = 0; i < SECURITY_CONFIG.ROOM_CODE_ENTROPY; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  
  return result
}

/**
 * Check if room code is unique (in production, check against database)
 */
export function isRoomCodeUnique(code: string, existingRooms: Room[] = []): boolean {
  return !existingRooms.some(room => room.code === code)
}

/**
 * Generate a unique room code
 */
export function generateUniqueRoomCode(existingRooms: Room[] = []): string {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    const code = generateSecureRoomCode()
    if (isRoomCodeUnique(code, existingRooms)) {
      return code
    }
    attempts++
  }
  
  throw new Error('Failed to generate unique room code after maximum attempts')
}

/**
 * Check rate limiting for a client
 */
export function checkRateLimit(clientId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const key = clientId
  const entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS
    })
    return { allowed: true }
  }
  
  if (entry.count >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetTime: entry.resetTime }
  }
  
  entry.count++
  return { allowed: true }
}

/**
 * Record a failed join attempt
 */
export function recordFailedAttempt(clientId: string): void {
  const now = Date.now()
  const entry = failedAttemptsStore.get(clientId) || { count: 0 }
  
  entry.count++
  
  if (entry.count >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
    entry.banUntil = now + (SECURITY_CONFIG.BAN_DURATION_MINUTES * 60 * 1000)
  }
  
  failedAttemptsStore.set(clientId, entry)
}

/**
 * Check if client is banned
 */
export function isClientBanned(clientId: string): { banned: boolean; banUntil?: number } {
  const entry = failedAttemptsStore.get(clientId)
  
  if (!entry || !entry.banUntil) {
    return { banned: false }
  }
  
  const now = Date.now()
  if (now > entry.banUntil) {
    // Ban expired, reset
    entry.count = 0
    entry.banUntil = undefined
    return { banned: false }
  }
  
  return { banned: true, banUntil: entry.banUntil }
}

/**
 * Clear failed attempts for successful join
 */
export function clearFailedAttempts(clientId: string): void {
  failedAttemptsStore.delete(clientId)
}

/**
 * Check if room has expired
 */
export function isRoomExpired(room: Room): boolean {
  const now = Date.now()
  const expiryTime = room.updatedAt.getTime() + (SECURITY_CONFIG.ROOM_EXPIRY_HOURS * 60 * 60 * 1000)
  return now > expiryTime
}

/**
 * Update user session activity
 */
export function updateUserSession(userId: string, roomId?: string): void {
  const now = Date.now()
  const session = userSessionStore.get(userId) || { lastActivity: now, roomIds: new Set() }
  
  session.lastActivity = now
  if (roomId) {
    session.roomIds.add(roomId)
  }
  
  userSessionStore.set(userId, session)
}

/**
 * Check if user session is valid
 */
export function isUserSessionValid(userId: string): boolean {
  const session = userSessionStore.get(userId)
  if (!session) return false
  
  const now = Date.now()
  const timeoutMs = SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000
  
  return (now - session.lastActivity) < timeoutMs
}

/**
 * Get user's active room count
 */
export function getUserActiveRoomCount(userId: string): number {
  const session = userSessionStore.get(userId)
  return session ? session.roomIds.size : 0
}

/**
 * Validate room join request with security checks
 */
export function validateSecureRoomJoin(
  roomCode: string,
  userId: string,
  clientId: string,
  room?: Room
): { valid: boolean; error?: RoomError } {
  // Check rate limiting
  const rateLimit = checkRateLimit(clientId)
  if (!rateLimit.allowed) {
    return {
      valid: false,
      error: createRoomError(
        RoomErrorCode.NETWORK_ERROR,
        `Too many requests. Try again in ${Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)} seconds.`
      )
    }
  }
  
  // Check if client is banned
  const banStatus = isClientBanned(clientId)
  if (banStatus.banned) {
    const remainingTime = Math.ceil((banStatus.banUntil! - Date.now()) / 60000)
    return {
      valid: false,
      error: createRoomError(
        RoomErrorCode.PERMISSION_DENIED,
        `Too many failed attempts. Try again in ${remainingTime} minutes.`
      )
    }
  }
  
  // Check if room exists and is not expired
  if (!room) {
    recordFailedAttempt(clientId)
    return {
      valid: false,
      error: createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found')
    }
  }
  
  if (isRoomExpired(room)) {
    return {
      valid: false,
      error: createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room has expired')
    }
  }
  
  // Check room capacity
  if (room.members.length >= room.maxMembers) {
    return {
      valid: false,
      error: createRoomError(RoomErrorCode.ROOM_FULL, 'Room is full')
    }
  }
  
  // Check user session
  if (!isUserSessionValid(userId)) {
    // Create new session
    updateUserSession(userId, room.id)
  }
  
  // Clear failed attempts on successful validation
  clearFailedAttempts(clientId)
  
  return { valid: true }
}

/**
 * Validate room creation with security checks
 */
export function validateSecureRoomCreation(
  userId: string,
  clientId: string
): { valid: boolean; error?: RoomError } {
  // Check rate limiting
  const rateLimit = checkRateLimit(clientId)
  if (!rateLimit.allowed) {
    return {
      valid: false,
      error: createRoomError(
        RoomErrorCode.NETWORK_ERROR,
        `Too many requests. Try again in ${Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)} seconds.`
      )
    }
  }
  
  // Check concurrent room limit
  const activeRoomCount = getUserActiveRoomCount(userId)
  if (activeRoomCount >= SECURITY_CONFIG.MAX_CONCURRENT_ROOMS) {
    return {
      valid: false,
      error: createRoomError(
        RoomErrorCode.PERMISSION_DENIED,
        `You can only create up to ${SECURITY_CONFIG.MAX_CONCURRENT_ROOMS} rooms at a time.`
      )
    }
  }
  
  return { valid: true }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .substring(0, 100) // Limit length
}

/**
 * Generate client fingerprint for tracking
 */
export function generateClientFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server'
  }
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('fingerprint', 10, 10)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Clean up expired sessions and bans
 */
export function cleanupSecurityStore(): void {
  const now = Date.now()
  
  // Clean up rate limit store
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  
  // Clean up failed attempts store
  for (const [key, entry] of failedAttemptsStore.entries()) {
    if (entry.banUntil && now > entry.banUntil) {
      failedAttemptsStore.delete(key)
    }
  }
  
  // Clean up user sessions
  const sessionTimeout = SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000
  for (const [key, session] of userSessionStore.entries()) {
    if ((now - session.lastActivity) > sessionTimeout) {
      userSessionStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupSecurityStore, 5 * 60 * 1000)
}
