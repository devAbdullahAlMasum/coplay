import { describe, it, expect, beforeEach, test } from 'bun:test'
import {
  generateRoomCode,
  generateUserId,
  generateRoomId,
  validateRoomCode,
  validateUserName,
  validateCreateRoomRequest,
  validateJoinRoomRequest,
  createRoom,
  createUser,
  createRoomError,
  canUserPerformAction,
  isRoomFull,
  findUserInRoom,
  findUserByName,
  getRoomHost,
  formatRoomError,
  sanitizeInput,
  normalizeRoomCode
} from '@/lib/room-utils'
import { RoomErrorCode, ROOM_CONSTANTS } from '@/types/room'

describe('Room Utils', () => {
  describe('generateRoomCode', () => {
    it('should generate a room code of correct length', () => {
      const code = generateRoomCode()
      expect(code.length).toBe(6)
    })

    it('should generate codes with only valid characters', () => {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })

    it('should generate different codes on multiple calls', () => {
      const codes = Array.from({ length: 10 }, () => generateRoomCode())
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBeGreaterThan(1)
    })
  })

  describe('generateUserId', () => {
    it('should generate a user ID with correct prefix', () => {
      const id = generateUserId()
      expect(id).toMatch(/^user_\d+_[a-z0-9]+$/)
    })

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 10 }, () => generateUserId())
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
    })
  })

  describe('generateRoomId', () => {
    it('should generate a room ID with correct prefix', () => {
      const id = generateRoomId()
      expect(id).toMatch(/^room_\d+_[a-z0-9]+$/)
    })
  })

  describe('validateRoomCode', () => {
    it('should validate correct room codes', () => {
      const result = validateRoomCode('ABC123')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty room codes', () => {
      const result = validateRoomCode('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Room code is required')
    })

    it('should reject room codes that are too short', () => {
      const result = validateRoomCode('AB')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(`Room code must be at least ${ROOM_CONSTANTS.MIN_ROOM_CODE_LENGTH} characters`)
    })

    it('should reject room codes that are too long', () => {
      const result = validateRoomCode('ABCDEFGHIJK')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(`Room code must be no more than ${ROOM_CONSTANTS.MAX_ROOM_CODE_LENGTH} characters`)
    })

    it('should reject room codes with invalid characters', () => {
      const result = validateRoomCode('ABC-123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Room code can only contain letters and numbers')
    })
  })

  describe('validateUserName', () => {
    it('should validate correct user names', () => {
      const result = validateUserName('John Doe')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty names', () => {
      const result = validateUserName('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(ROOM_CONSTANTS.MAX_USER_NAME_LENGTH + 1)
      const result = validateUserName(longName)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(`Name must be no more than ${ROOM_CONSTANTS.MAX_USER_NAME_LENGTH} characters`)
    })

    it('should reject names with invalid characters', () => {
      const result = validateUserName('John<script>')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Name can only contain letters, numbers, spaces, hyphens, and underscores')
    })

    it('should accept names with valid special characters', () => {
      const result = validateUserName('John-Doe_123')
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateCreateRoomRequest', () => {
    it('should validate correct create room requests', () => {
      const request = { userName: 'John Doe' }
      const result = validateCreateRoomRequest(request)
      expect(result.isValid).toBe(true)
    })

    it('should validate requests with room names', () => {
      const request = { userName: 'John Doe', roomName: 'Movie Night' }
      const result = validateCreateRoomRequest(request)
      expect(result.isValid).toBe(true)
    })

    it('should reject requests with invalid user names', () => {
      const request = { userName: '' }
      const result = validateCreateRoomRequest(request)
      expect(result.isValid).toBe(false)
    })

    it('should reject requests with invalid room names', () => {
      const request = { userName: 'John Doe', roomName: '<script>alert("xss")</script>' }
      const result = validateCreateRoomRequest(request)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateJoinRoomRequest', () => {
    it('should validate correct join room requests', () => {
      const request = { roomCode: 'ABC123', userName: 'John Doe' }
      const result = validateJoinRoomRequest(request)
      expect(result.isValid).toBe(true)
    })

    it('should reject requests with invalid room codes', () => {
      const request = { roomCode: '', userName: 'John Doe' }
      const result = validateJoinRoomRequest(request)
      expect(result.isValid).toBe(false)
    })

    it('should reject requests with invalid user names', () => {
      const request = { roomCode: 'ABC123', userName: '' }
      const result = validateJoinRoomRequest(request)
      expect(result.isValid).toBe(false)
    })
  })

  describe('createRoom', () => {
    it('should create a room with correct properties', () => {
      const request = { userName: 'Host' }
      const hostId = 'host-123'
      const room = createRoom(request, hostId)

      expect(room.id).toMatch(/^room_\d+_[a-z0-9]+$/)
      expect(room.code).toMatch(/^[A-Z0-9]{6}$/)
      expect(room.hostId).toBe(hostId)
      expect(room.members).toHaveLength(0)
      expect(room.maxMembers).toBe(ROOM_CONSTANTS.MAX_ROOM_MEMBERS)
      expect(room.isPrivate).toBe(false)
      expect(room.settings).toBeDefined()
    })

    it('should create a room with custom name', () => {
      const request = { userName: 'Host', roomName: 'Movie Night' }
      const room = createRoom(request, 'host-123')
      expect(room.name).toBe('Movie Night')
    })
  })

  describe('createUser', () => {
    it('should create a user with correct properties', () => {
      const user = createUser('John Doe')
      
      expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/)
      expect(user.name).toBe('John Doe')
      expect(user.isHost).toBe(false)
      expect(user.isOnline).toBe(true)
      expect(user.joinedAt).toBeInstanceOf(Date)
      expect(user.lastSeen).toBeInstanceOf(Date)
    })

    it('should create a host user', () => {
      const user = createUser('Host User', true)
      expect(user.isHost).toBe(true)
    })

    it('should trim user names', () => {
      const user = createUser('  John Doe  ')
      expect(user.name).toBe('John Doe')
    })
  })

  describe('createRoomError', () => {
    it('should create a room error with correct properties', () => {
      const error = createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found')
      
      expect(error.code).toBe(RoomErrorCode.ROOM_NOT_FOUND)
      expect(error.message).toBe('Room not found')
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create a room error with details', () => {
      const details = { roomCode: 'ABC123' }
      const error = createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found', details)
      expect(error.details).toEqual(details)
    })
  })

  describe('canUserPerformAction', () => {
    let user: any
    let room: any

    beforeEach(() => {
      user = createUser('Test User')
      room = createRoom({ userName: 'Host' }, 'host-123')
    })

    it('should allow host to perform host actions', () => {
      user.isHost = true
      expect(canUserPerformAction(user, room, 'TRANSFER_HOST')).toBe(true)
      expect(canUserPerformAction(user, room, 'KICK_USER')).toBe(true)
      expect(canUserPerformAction(user, room, 'UPDATE_ROOM_SETTINGS')).toBe(true)
    })

    it('should not allow non-host to perform host actions', () => {
      expect(canUserPerformAction(user, room, 'TRANSFER_HOST')).toBe(false)
      expect(canUserPerformAction(user, room, 'KICK_USER')).toBe(false)
      expect(canUserPerformAction(user, room, 'UPDATE_ROOM_SETTINGS')).toBe(false)
    })

    it('should allow video control based on room settings', () => {
      room.settings.allowGuestControl = true
      expect(canUserPerformAction(user, room, 'CONTROL_VIDEO')).toBe(true)
      
      room.settings.allowGuestControl = false
      expect(canUserPerformAction(user, room, 'CONTROL_VIDEO')).toBe(false)
    })

    it('should allow chat based on room settings', () => {
      room.settings.chatEnabled = true
      expect(canUserPerformAction(user, room, 'SEND_MESSAGE')).toBe(true)
      
      room.settings.chatEnabled = false
      expect(canUserPerformAction(user, room, 'SEND_MESSAGE')).toBe(false)
    })
  })

  describe('utility functions', () => {
    let room: any
    let users: any[]

    beforeEach(() => {
      room = createRoom({ userName: 'Host' }, 'host-123')
      users = [
        createUser('Host', true),
        createUser('User1'),
        createUser('User2')
      ]
      users[0].id = 'host-123'
      room.members = users
    })

    describe('isRoomFull', () => {
      it('should return false for room with available space', () => {
        expect(isRoomFull(room)).toBe(false)
      })

      it('should return true for full room', () => {
        room.members = Array.from({ length: room.maxMembers }, (_, i) => 
          createUser(`User${i}`)
        )
        expect(isRoomFull(room)).toBe(true)
      })
    })

    describe('findUserInRoom', () => {
      it('should find user by ID', () => {
        const user = findUserInRoom(room, users[1].id)
        expect(user).toBe(users[1])
      })

      it('should return undefined for non-existent user', () => {
        const user = findUserInRoom(room, 'non-existent')
        expect(user).toBeUndefined()
      })
    })

    describe('findUserByName', () => {
      it('should find user by name (case insensitive)', () => {
        const user = findUserByName(room, 'user1')
        expect(user).toBe(users[1])
      })

      it('should return undefined for non-existent name', () => {
        const user = findUserByName(room, 'NonExistent')
        expect(user).toBeUndefined()
      })
    })

    describe('getRoomHost', () => {
      it('should return the host user', () => {
        const host = getRoomHost(room)
        expect(host).toBe(users[0])
        expect(host?.isHost).toBe(true)
      })

      it('should return undefined if no host', () => {
        room.members.forEach((user: any) => user.isHost = false)
        const host = getRoomHost(room)
        expect(host).toBeUndefined()
      })
    })
  })

  describe('formatRoomError', () => {
    it('should format known error codes', () => {
      const error = createRoomError(RoomErrorCode.ROOM_NOT_FOUND, 'Room not found')
      const formatted = formatRoomError(error)
      expect(formatted).toBe('Room not found. Please check the room code and try again.')
    })

    it('should return original message for unknown error codes', () => {
      const error = createRoomError('UNKNOWN_ERROR' as RoomErrorCode, 'Unknown error')
      const formatted = formatRoomError(error)
      expect(formatted).toBe('Unknown error')
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello')
    })

    it('should remove dangerous characters', () => {
      expect(sanitizeInput('hello<script>world')).toBe('helloscriptworld')
      expect(sanitizeInput('hello>world')).toBe('helloworld')
    })
  })

  describe('normalizeRoomCode', () => {
    it('should convert to uppercase and remove spaces', () => {
      expect(normalizeRoomCode('  abc 123  ')).toBe('ABC123')
    })

    it('should handle already normalized codes', () => {
      expect(normalizeRoomCode('ABC123')).toBe('ABC123')
    })
  })
})
