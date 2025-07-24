"use client"

import { Room, User, RoomState, ConnectionStatus } from '@/types/room'

// Storage keys
const STORAGE_KEYS = {
  ROOM_STATE: 'coplay_room_state',
  USER_PREFERENCES: 'coplay_user_preferences',
  RECENT_ROOMS: 'coplay_recent_rooms',
  SESSION_ID: 'coplay_session_id'
} as const

// Storage interface for different storage types
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

// Browser storage adapters
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage disabled
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      // Only clear CoPlay-related items
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    } catch {
      // Storage disabled
    }
  }
}

class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(key, value)
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Storage disabled
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      // Only clear CoPlay-related items
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key)
      })
    } catch {
      // Storage disabled
    }
  }
}

// In-memory storage for fallback
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>()

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.storage.delete(key)
    })
  }
}

// Storage manager
class RoomStorageManager {
  private localStorage: StorageAdapter
  private sessionStorage: StorageAdapter
  private memoryStorage: StorageAdapter

  constructor() {
    this.localStorage = new LocalStorageAdapter()
    this.sessionStorage = new SessionStorageAdapter()
    this.memoryStorage = new MemoryStorageAdapter()
  }

  // Safely parse JSON
  private safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback
    try {
      return JSON.parse(json)
    } catch {
      return fallback
    }
  }

  // Safely stringify JSON
  private safeJsonStringify(data: any): string {
    try {
      return JSON.stringify(data)
    } catch {
      return '{}'
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get or create session ID
  getSessionId(): string {
    let sessionId = this.sessionStorage.getItem(STORAGE_KEYS.SESSION_ID)
    if (!sessionId) {
      sessionId = this.generateSessionId()
      this.sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
    }
    return sessionId
  }

  // Save room state (persistent)
  saveRoomState(state: RoomState): void {
    const stateToSave = {
      ...state,
      // Don't persist loading states or temporary errors
      isLoading: false,
      error: null,
      // Reset connection status to allow reconnection
      connectionStatus: state.currentRoom ? ConnectionStatus.DISCONNECTED : ConnectionStatus.DISCONNECTED
    }

    this.localStorage.setItem(
      STORAGE_KEYS.ROOM_STATE,
      this.safeJsonStringify(stateToSave)
    )
  }

  // Load room state (persistent)
  loadRoomState(): RoomState | null {
    const stateJson = this.localStorage.getItem(STORAGE_KEYS.ROOM_STATE)
    if (!stateJson) return null

    const state = this.safeJsonParse<RoomState | null>(stateJson, null)
    if (!state) return null

    // Validate the loaded state
    if (state.currentRoom && state.currentUser) {
      // Convert date strings back to Date objects
      if (state.currentRoom.createdAt) {
        state.currentRoom.createdAt = new Date(state.currentRoom.createdAt)
      }
      if (state.currentRoom.updatedAt) {
        state.currentRoom.updatedAt = new Date(state.currentRoom.updatedAt)
      }
      
      state.currentRoom.members = state.currentRoom.members.map(member => ({
        ...member,
        joinedAt: new Date(member.joinedAt),
        lastSeen: new Date(member.lastSeen)
      }))

      return state
    }

    return null
  }

  // Clear room state
  clearRoomState(): void {
    this.localStorage.removeItem(STORAGE_KEYS.ROOM_STATE)
  }

  // Save user preferences
  saveUserPreferences(preferences: {
    userName?: string
    preferredSettings?: any
  }): void {
    this.localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      this.safeJsonStringify(preferences)
    )
  }

  // Load user preferences
  loadUserPreferences(): { userName?: string; preferredSettings?: any } {
    const prefsJson = this.localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    return this.safeJsonParse(prefsJson, {})
  }

  // Save recent room
  saveRecentRoom(room: { code: string; name?: string; joinedAt: Date }): void {
    const recentRooms = this.getRecentRooms()
    
    // Remove existing entry for this room code
    const filteredRooms = recentRooms.filter(r => r.code !== room.code)
    
    // Add new entry at the beginning
    const updatedRooms = [room, ...filteredRooms].slice(0, 10) // Keep only last 10
    
    this.localStorage.setItem(
      STORAGE_KEYS.RECENT_ROOMS,
      this.safeJsonStringify(updatedRooms)
    )
  }

  // Get recent rooms
  getRecentRooms(): Array<{ code: string; name?: string; joinedAt: Date }> {
    const roomsJson = this.localStorage.getItem(STORAGE_KEYS.RECENT_ROOMS)
    const rooms = this.safeJsonParse<Array<any>>(roomsJson, [])
    
    return rooms.map(room => ({
      ...room,
      joinedAt: new Date(room.joinedAt)
    })).sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
  }

  // Clear recent rooms
  clearRecentRooms(): void {
    this.localStorage.removeItem(STORAGE_KEYS.RECENT_ROOMS)
  }

  // Check if storage is available
  isStorageAvailable(): boolean {
    try {
      const testKey = '__coplay_storage_test__'
      this.localStorage.setItem(testKey, 'test')
      this.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  // Clear all storage
  clearAll(): void {
    this.localStorage.clear()
    this.sessionStorage.clear()
    this.memoryStorage.clear()
  }

  // Export data for backup
  exportData(): string {
    const data = {
      roomState: this.localStorage.getItem(STORAGE_KEYS.ROOM_STATE),
      userPreferences: this.localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
      recentRooms: this.localStorage.getItem(STORAGE_KEYS.RECENT_ROOMS),
      exportedAt: new Date().toISOString()
    }
    return this.safeJsonStringify(data)
  }

  // Import data from backup
  importData(dataJson: string): boolean {
    try {
      const data = JSON.parse(dataJson)
      
      if (data.roomState) {
        this.localStorage.setItem(STORAGE_KEYS.ROOM_STATE, data.roomState)
      }
      if (data.userPreferences) {
        this.localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, data.userPreferences)
      }
      if (data.recentRooms) {
        this.localStorage.setItem(STORAGE_KEYS.RECENT_ROOMS, data.recentRooms)
      }
      
      return true
    } catch {
      return false
    }
  }
}

// Create singleton instance
export const roomStorage = new RoomStorageManager()

// Hook for using room storage
export function useRoomStorage() {
  return roomStorage
}
