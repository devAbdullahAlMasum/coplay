import { 
  Room, 
  User, 
  RoomError, 
  RoomErrorCode, 
  RoomValidationResult, 
  CreateRoomRequest, 
  JoinRoomRequest,
  ROOM_CONSTANTS,
  DEFAULT_ROOM_SETTINGS
} from '@/types/room'

/**
 * Generates a unique room code
 */
export function generateRoomCode(): string {
  const chars = ROOM_CONSTANTS.ROOM_CODE_CHARS
  let result = ''
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Generates a unique user ID
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generates a unique room ID
 */
export function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validates a room code format
 */
export function validateRoomCode(code: string): RoomValidationResult {
  const errors: string[] = []
  
  if (!code) {
    errors.push('Room code is required')
  } else {
    if (code.length < ROOM_CONSTANTS.MIN_ROOM_CODE_LENGTH) {
      errors.push(`Room code must be at least ${ROOM_CONSTANTS.MIN_ROOM_CODE_LENGTH} characters`)
    }
    
    if (code.length > ROOM_CONSTANTS.MAX_ROOM_CODE_LENGTH) {
      errors.push(`Room code must be no more than ${ROOM_CONSTANTS.MAX_ROOM_CODE_LENGTH} characters`)
    }
    
    if (!/^[A-Z0-9]+$/.test(code)) {
      errors.push('Room code can only contain letters and numbers')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates a user name
 */
export function validateUserName(name: string): RoomValidationResult {
  const errors: string[] = []
  
  if (!name) {
    errors.push('Name is required')
  } else {
    const trimmedName = name.trim()
    
    if (trimmedName.length < ROOM_CONSTANTS.MIN_USER_NAME_LENGTH) {
      errors.push(`Name must be at least ${ROOM_CONSTANTS.MIN_USER_NAME_LENGTH} character`)
    }
    
    if (trimmedName.length > ROOM_CONSTANTS.MAX_USER_NAME_LENGTH) {
      errors.push(`Name must be no more than ${ROOM_CONSTANTS.MAX_USER_NAME_LENGTH} characters`)
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      errors.push('Name can only contain letters, numbers, spaces, hyphens, and underscores')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates create room request
 */
export function validateCreateRoomRequest(request: CreateRoomRequest): RoomValidationResult {
  const errors: string[] = []
  
  // Validate user name
  const userNameValidation = validateUserName(request.userName)
  if (!userNameValidation.isValid) {
    errors.push(...userNameValidation.errors)
  }
  
  // Validate room name if provided
  if (request.roomName) {
    const roomNameValidation = validateUserName(request.roomName) // Same rules as user name
    if (!roomNameValidation.isValid) {
      errors.push(...roomNameValidation.errors.map(error => error.replace('Name', 'Room name')))
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates join room request
 */
export function validateJoinRoomRequest(request: JoinRoomRequest): RoomValidationResult {
  const errors: string[] = []
  
  // Validate room code
  const roomCodeValidation = validateRoomCode(request.roomCode)
  if (!roomCodeValidation.isValid) {
    errors.push(...roomCodeValidation.errors)
  }
  
  // Validate user name
  const userNameValidation = validateUserName(request.userName)
  if (!userNameValidation.isValid) {
    errors.push(...userNameValidation.errors)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Creates a new room object
 */
export function createRoom(request: CreateRoomRequest, hostId: string): Room {
  const now = new Date()
  
  return {
    id: generateRoomId(),
    code: generateRoomCode(),
    name: request.roomName,
    hostId,
    members: [],
    createdAt: now,
    updatedAt: now,
    maxMembers: ROOM_CONSTANTS.MAX_ROOM_MEMBERS,
    isPrivate: false,
    settings: {
      ...DEFAULT_ROOM_SETTINGS,
      ...request.settings
    }
  }
}

/**
 * Creates a new user object
 */
export function createUser(name: string, isHost: boolean = false): User {
  const now = new Date()
  
  return {
    id: generateUserId(),
    name: name.trim(),
    isHost,
    isOnline: true,
    joinedAt: now,
    lastSeen: now
  }
}

/**
 * Creates a room error object
 */
export function createRoomError(code: RoomErrorCode, message: string, details?: any): RoomError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  }
}

/**
 * Checks if a user can perform a specific action in a room
 */
export function canUserPerformAction(user: User, room: Room, action: string): boolean {
  switch (action) {
    case 'TRANSFER_HOST':
    case 'KICK_USER':
    case 'UPDATE_ROOM_SETTINGS':
      return user.isHost
    
    case 'CONTROL_VIDEO':
      return user.isHost || room.settings.allowGuestControl
    
    case 'SEND_MESSAGE':
      return room.settings.chatEnabled
    
    default:
      return true
  }
}

/**
 * Checks if a room is full
 */
export function isRoomFull(room: Room): boolean {
  return room.members.length >= room.maxMembers
}

/**
 * Finds a user in a room by ID
 */
export function findUserInRoom(room: Room, userId: string): User | undefined {
  return room.members.find(member => member.id === userId)
}

/**
 * Finds a user in a room by name (case-insensitive)
 */
export function findUserByName(room: Room, name: string): User | undefined {
  return room.members.find(member => 
    member.name.toLowerCase() === name.toLowerCase()
  )
}

/**
 * Gets the current host of a room
 */
export function getRoomHost(room: Room): User | undefined {
  return room.members.find(member => member.isHost)
}

/**
 * Formats a room error for display
 */
export function formatRoomError(error: RoomError): string {
  switch (error.code) {
    case RoomErrorCode.ROOM_NOT_FOUND:
      return 'Room not found. Please check the room code and try again.'
    
    case RoomErrorCode.ROOM_FULL:
      return 'This room is full. Please try joining another room.'
    
    case RoomErrorCode.INVALID_ROOM_CODE:
      return 'Invalid room code format. Please enter a valid room code.'
    
    case RoomErrorCode.INVALID_USER_NAME:
      return 'Invalid name. Please enter a valid name.'
    
    case RoomErrorCode.USER_ALREADY_EXISTS:
      return 'A user with this name already exists in the room. Please choose a different name.'
    
    case RoomErrorCode.PERMISSION_DENIED:
      return 'You don\'t have permission to perform this action.'
    
    case RoomErrorCode.CONNECTION_FAILED:
      return 'Failed to connect to the room. Please check your internet connection and try again.'
    
    case RoomErrorCode.NETWORK_ERROR:
      return 'Network error occurred. Please try again.'
    
    default:
      return error.message || 'An unexpected error occurred.'
  }
}

/**
 * Sanitizes user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

/**
 * Normalizes room code (uppercase, no spaces)
 */
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, '')
}
