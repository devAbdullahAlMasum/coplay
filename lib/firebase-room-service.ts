"use client"

import { 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off, 
  remove, 
  serverTimestamp,
  onDisconnect,
  DatabaseReference
} from 'firebase/database'
import { database } from '@/lib/firebase'
import { Room, User, RoomError, RoomErrorCode, CreateRoomRequest, JoinRoomRequest } from '@/types/room'
import { createRoomError, generateUserId } from '@/lib/room-utils'
import { generateUniqueRoomCode } from '@/lib/room-security'

// Firebase database structure
interface FirebaseRoom {
  id: string
  code: string
  name?: string
  hostId: string
  createdAt: number
  updatedAt: number
  maxMembers: number
  isPrivate: boolean
  settings: {
    allowGuestControl: boolean
    requireApproval: boolean
    chatEnabled: boolean
    maxChatLength: number
    autoPlay: boolean
    syncTolerance: number
  }
}

interface FirebaseUser {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  joinedAt: number
  lastSeen: number
}

interface FirebaseVideoState {
  url?: string
  currentTime: number
  isPlaying: boolean
  lastUpdated: number
  updatedBy: string
}

interface FirebaseChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
}

export class FirebaseRoomService {
  private roomRef: DatabaseReference | null = null
  private membersRef: DatabaseReference | null = null
  private videoStateRef: DatabaseReference | null = null
  private chatRef: DatabaseReference | null = null
  private currentUserId: string | null = null
  private currentRoomId: string | null = null

  // Event listeners
  private roomListeners: Array<() => void> = []
  private memberListeners: Array<() => void> = []
  private videoListeners: Array<() => void> = []
  private chatListeners: Array<() => void> = []

  /**
   * Create a new room
   */
  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; data?: Room; error?: RoomError }> {
    try {
      console.log('🔥 Firebase createRoom called with:', request)

      if (!database) {
        console.error('🔥 Firebase database not initialized')
        return {
          success: false,
          error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Firebase not initialized')
        }
      }

      console.log('🔥 Firebase database available, creating room...')

      // Generate unique room code
      const roomCode = await this.generateUniqueRoomCode()
      const userId = generateUserId()
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log('🔥 Generated:', { roomCode, userId, roomId })

      // Create room data
      const firebaseRoom: FirebaseRoom = {
        id: roomId,
        code: roomCode,
        name: request.roomName || `${request.userName}'s Room`,
        hostId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxMembers: 10,
        isPrivate: false,
        settings: {
          allowGuestControl: false,
          requireApproval: false,
          chatEnabled: true,
          maxChatLength: 500,
          autoPlay: true,
          syncTolerance: 1000
        }
      }

      // Create user data
      const firebaseUser: FirebaseUser = {
        id: userId,
        name: request.userName.trim(),
        isHost: true,
        isOnline: true,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      }

      // Save to Firebase
      const roomRef = ref(database, `rooms/${roomId}`)
      const memberRef = ref(database, `rooms/${roomId}/members/${userId}`)
      const videoStateRef = ref(database, `rooms/${roomId}/videoState`)

      await set(roomRef, firebaseRoom)
      await set(memberRef, firebaseUser)
      await set(videoStateRef, {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        updatedBy: userId
      })

      // Set up disconnect handling
      await this.setupDisconnectHandling(roomId, userId)

      // Convert to Room format
      const room: Room = this.convertFirebaseRoomToRoom(firebaseRoom, [firebaseUser])

      this.currentUserId = userId
      this.currentRoomId = roomId

      return { success: true, data: room }
    } catch (error) {
      console.error('Error creating room:', error)
      return { 
        success: false, 
        error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Failed to create room') 
      }
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(request: JoinRoomRequest): Promise<{ success: boolean; data?: Room; error?: RoomError }> {
    try {
      console.log('🔥 Firebase joinRoom called with:', request)

      if (!database) {
        console.error('🔥 Firebase database not initialized')
        return {
          success: false,
          error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Firebase not initialized')
        }
      }

      console.log('🔥 Looking for room with code:', request.roomCode)
      // Find room by code
      const roomId = await this.findRoomByCode(request.roomCode)
      console.log('🔥 Found room ID:', roomId)

      if (!roomId) {
        console.error('🔥 Room not found for code:', request.roomCode)
        return {
          success: false,
          error: createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found')
        }
      }

      // Get room data
      const roomRef = ref(database, `rooms/${roomId}`)
      const roomSnapshot = await get(roomRef)
      
      if (!roomSnapshot.exists()) {
        return { 
          success: false, 
          error: createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found') 
        }
      }

      const firebaseRoom = roomSnapshot.val() as FirebaseRoom

      // Get current members
      const membersRef = ref(database, `rooms/${roomId}/members`)
      const membersSnapshot = await get(membersRef)
      const members: FirebaseUser[] = membersSnapshot.exists() ? Object.values(membersSnapshot.val()) : []

      // Check if room is full
      if (members.length >= firebaseRoom.maxMembers) {
        return { 
          success: false, 
          error: createRoomError(RoomErrorCode.ROOM_FULL, 'Room is full') 
        }
      }

      // Check if username already exists
      console.log('🔥 Checking for existing users:', members.map(m => m.name))
      console.log('🔥 Trying to join with name:', request.userName)

      const existingUser = members.find(member =>
        member.name.toLowerCase() === request.userName.toLowerCase()
      )
      if (existingUser) {
        console.error('🔥 Username already exists:', existingUser.name)
        return {
          success: false,
          error: createRoomError(RoomErrorCode.USER_ALREADY_EXISTS, `A user with the name "${request.userName}" already exists in the room. Please choose a different name.`)
        }
      }

      // Create user
      const userId = generateUserId()
      const firebaseUser: FirebaseUser = {
        id: userId,
        name: request.userName.trim(),
        isHost: false,
        isOnline: true,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      }

      // Add user to room
      const memberRef = ref(database, `rooms/${roomId}/members/${userId}`)
      await set(memberRef, firebaseUser)

      // Update room timestamp
      await set(ref(database, `rooms/${roomId}/updatedAt`), Date.now())

      // Set up disconnect handling
      await this.setupDisconnectHandling(roomId, userId)

      // Convert to Room format
      const allMembers = [...members, firebaseUser]
      const room: Room = this.convertFirebaseRoomToRoom(firebaseRoom, allMembers)

      this.currentUserId = userId
      this.currentRoomId = roomId

      return { success: true, data: room }
    } catch (error) {
      console.error('Error joining room:', error)
      return { 
        success: false, 
        error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Failed to join room') 
      }
    }
  }

  /**
   * Leave the current room
   */
  async leaveRoom(): Promise<{ success: boolean; error?: RoomError }> {
    try {
      if (!this.currentRoomId || !this.currentUserId) {
        return { success: true } // Already not in a room
      }

      // Remove user from room
      const memberRef = ref(database, `rooms/${this.currentRoomId}/members/${this.currentUserId}`)
      await remove(memberRef)

      // Clean up listeners
      this.cleanup()

      return { success: true }
    } catch (error) {
      console.error('Error leaving room:', error)
      return { 
        success: false, 
        error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Failed to leave room') 
      }
    }
  }

  /**
   * Listen to room updates
   */
  onRoomUpdate(callback: (room: Room | null) => void): () => void {
    if (!this.currentRoomId || !database) {
      return () => {}
    }

    const roomRef = ref(database, `rooms/${this.currentRoomId}`)
    const membersRef = ref(database, `rooms/${this.currentRoomId}/members`)

    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }

      const firebaseRoom = snapshot.val() as FirebaseRoom
      
      // Get members
      get(membersRef).then((membersSnapshot) => {
        const members: FirebaseUser[] = membersSnapshot.exists() 
          ? Object.values(membersSnapshot.val()) 
          : []
        
        const room = this.convertFirebaseRoomToRoom(firebaseRoom, members)
        callback(room)
      })
    })

    const unsubscribeMembers = onValue(membersRef, (snapshot) => {
      // This will trigger the room update above
    })

    const cleanup = () => {
      off(roomRef, 'value', unsubscribeRoom)
      off(membersRef, 'value', unsubscribeMembers)
    }

    this.roomListeners.push(cleanup)
    return cleanup
  }

  /**
   * Helper methods
   */
  private async generateUniqueRoomCode(): Promise<string> {
    // In a real implementation, you'd check against existing room codes
    return generateUniqueRoomCode([])
  }

  private async findRoomByCode(code: string): Promise<string | null> {
    if (!database) return null

    try {
      const roomsRef = ref(database, 'rooms')
      const snapshot = await get(roomsRef)
      
      if (!snapshot.exists()) return null

      const rooms = snapshot.val()
      for (const [roomId, room] of Object.entries(rooms)) {
        if ((room as FirebaseRoom).code === code.toUpperCase()) {
          return roomId
        }
      }
      
      return null
    } catch (error) {
      console.error('Error finding room by code:', error)
      return null
    }
  }

  private async setupDisconnectHandling(roomId: string, userId: string): Promise<void> {
    if (!database) return

    const memberRef = ref(database, `rooms/${roomId}/members/${userId}`)
    const disconnectRef = onDisconnect(memberRef)
    
    // Remove user when they disconnect
    await disconnectRef.remove()
  }

  private convertFirebaseRoomToRoom(firebaseRoom: FirebaseRoom, members: FirebaseUser[]): Room {
    return {
      id: firebaseRoom.id,
      code: firebaseRoom.code,
      name: firebaseRoom.name,
      hostId: firebaseRoom.hostId,
      members: members.map(member => ({
        id: member.id,
        name: member.name,
        isHost: member.isHost,
        isOnline: member.isOnline,
        joinedAt: new Date(member.joinedAt),
        lastSeen: new Date(member.lastSeen)
      })),
      createdAt: new Date(firebaseRoom.createdAt),
      updatedAt: new Date(firebaseRoom.updatedAt),
      maxMembers: firebaseRoom.maxMembers,
      isPrivate: firebaseRoom.isPrivate,
      settings: firebaseRoom.settings
    }
  }

  private cleanup(): void {
    // Clean up all listeners
    this.roomListeners.forEach(cleanup => cleanup())
    this.memberListeners.forEach(cleanup => cleanup())
    this.videoListeners.forEach(cleanup => cleanup())
    this.chatListeners.forEach(cleanup => cleanup())

    this.roomListeners = []
    this.memberListeners = []
    this.videoListeners = []
    this.chatListeners = []

    this.currentUserId = null
    this.currentRoomId = null
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId
  }
}

// Export singleton instance
export const firebaseRoomService = new FirebaseRoomService()
