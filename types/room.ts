// Room System Types and Interfaces

export interface User {
  id: string
  name: string
  avatar?: string
  isHost: boolean
  isOnline: boolean
  joinedAt: Date
  lastSeen: Date
}

export interface Room {
  id: string
  code: string
  name?: string
  hostId: string
  members: User[]
  createdAt: Date
  updatedAt: Date
  maxMembers: number
  isPrivate: boolean
  settings: RoomSettings
}

export interface RoomSettings {
  allowGuestControl: boolean
  requireApproval: boolean
  chatEnabled: boolean
  maxChatLength: number
  autoPlay: boolean
  syncTolerance: number // milliseconds
}

export interface RoomState {
  currentRoom: Room | null
  currentUser: User | null
  connectionStatus: ConnectionStatus
  error: RoomError | null
  isLoading: boolean
}

export interface RoomError {
  code: RoomErrorCode
  message: string
  details?: any
  timestamp: Date
}

export enum RoomErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  INVALID_ROOM_CODE = 'INVALID_ROOM_CODE',
  INVALID_USER_NAME = 'INVALID_USER_NAME',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  HOST_REQUIRED = 'HOST_REQUIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

export interface RoomAction {
  type: RoomActionType
  payload?: any
  userId: string
  timestamp: Date
}

export enum RoomActionType {
  // Room Management
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  UPDATE_ROOM_SETTINGS = 'UPDATE_ROOM_SETTINGS',
  
  // User Management
  UPDATE_USER = 'UPDATE_USER',
  TRANSFER_HOST = 'TRANSFER_HOST',
  KICK_USER = 'KICK_USER',
  
  // Connection Management
  USER_CONNECTED = 'USER_CONNECTED',
  USER_DISCONNECTED = 'USER_DISCONNECTED',
  CONNECTION_STATUS_CHANGED = 'CONNECTION_STATUS_CHANGED',
  
  // Error Handling
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  CLEAR_ERROR = 'CLEAR_ERROR'
}

export interface CreateRoomRequest {
  userName: string
  roomName?: string
  settings?: Partial<RoomSettings>
}

export interface JoinRoomRequest {
  roomCode: string
  userName: string
}

export interface RoomValidationResult {
  isValid: boolean
  errors: string[]
}

// Utility types for room operations
export type RoomOperationResult<T = void> = {
  success: boolean
  data?: T
  error?: RoomError
}

export type RoomEventHandler = (action: RoomAction) => void

// Constants
export const ROOM_CONSTANTS = {
  MAX_ROOM_CODE_LENGTH: 8,
  MIN_ROOM_CODE_LENGTH: 4,
  MAX_USER_NAME_LENGTH: 20,
  MIN_USER_NAME_LENGTH: 1,
  MAX_ROOM_MEMBERS: 10,
  DEFAULT_SYNC_TOLERANCE: 1000, // 1 second
  ROOM_CODE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000 // 2 seconds
} as const

// Default room settings
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  allowGuestControl: false,
  requireApproval: false,
  chatEnabled: true,
  maxChatLength: 500,
  autoPlay: true,
  syncTolerance: ROOM_CONSTANTS.DEFAULT_SYNC_TOLERANCE
}

// Default room state
export const DEFAULT_ROOM_STATE: RoomState = {
  currentRoom: null,
  currentUser: null,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  error: null,
  isLoading: false
}
