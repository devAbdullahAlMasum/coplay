"use client"

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'
import {
  Room,
  User,
  RoomState,
  RoomAction,
  RoomActionType,
  RoomError,
  RoomErrorCode,
  ConnectionStatus,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomOperationResult,
  DEFAULT_ROOM_STATE
} from '@/types/room'
import {
  createRoom,
  createUser,
  createRoomError,
  validateCreateRoomRequest,
  validateJoinRoomRequest,
  findUserByName,
  isRoomFull,
  canUserPerformAction,
  normalizeRoomCode,
  sanitizeInput
} from '@/lib/room-utils'
import {
  generateUniqueRoomCode,
  validateSecureRoomCreation,
  validateSecureRoomJoin,
  generateClientFingerprint,
  updateUserSession,
  sanitizeUserInput
} from '@/lib/room-security'
import { firebaseRoomService } from '@/lib/firebase-room-service'

// Room Context
interface RoomContextType {
  state: RoomState
  createRoom: (request: CreateRoomRequest) => Promise<RoomOperationResult<Room>>
  joinRoom: (request: JoinRoomRequest) => Promise<RoomOperationResult<Room>>
  leaveRoom: () => Promise<RoomOperationResult>
  updateUser: (updates: Partial<User>) => Promise<RoomOperationResult>
  transferHost: (newHostId: string) => Promise<RoomOperationResult>
  kickUser: (userId: string) => Promise<RoomOperationResult>
  clearError: () => void
  reconnect: () => Promise<RoomOperationResult>
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

// Room Reducer
function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case RoomActionType.CREATE_ROOM:
      return {
        ...state,
        currentRoom: action.payload.room,
        currentUser: action.payload.user,
        connectionStatus: ConnectionStatus.CONNECTED,
        error: null,
        isLoading: false
      }

    case RoomActionType.JOIN_ROOM:
      return {
        ...state,
        currentRoom: action.payload.room,
        currentUser: action.payload.user,
        connectionStatus: ConnectionStatus.CONNECTED,
        error: null,
        isLoading: false
      }

    case RoomActionType.LEAVE_ROOM:
      return {
        ...DEFAULT_ROOM_STATE,
        connectionStatus: ConnectionStatus.DISCONNECTED
      }

    case RoomActionType.UPDATE_USER:
      if (!state.currentRoom || !state.currentUser) return state
      
      const updatedMembers = state.currentRoom.members.map(member =>
        member.id === action.payload.userId
          ? { ...member, ...action.payload.updates }
          : member
      )
      
      return {
        ...state,
        currentRoom: {
          ...state.currentRoom,
          members: updatedMembers,
          updatedAt: new Date()
        },
        currentUser: action.payload.userId === state.currentUser.id
          ? { ...state.currentUser, ...action.payload.updates }
          : state.currentUser
      }

    case RoomActionType.TRANSFER_HOST:
      if (!state.currentRoom || !state.currentUser) return state
      
      const membersWithNewHost = state.currentRoom.members.map(member => ({
        ...member,
        isHost: member.id === action.payload.newHostId
      }))
      
      return {
        ...state,
        currentRoom: {
          ...state.currentRoom,
          hostId: action.payload.newHostId,
          members: membersWithNewHost,
          updatedAt: new Date()
        },
        currentUser: {
          ...state.currentUser,
          isHost: state.currentUser.id === action.payload.newHostId
        }
      }

    case RoomActionType.USER_CONNECTED:
      if (!state.currentRoom) return state
      
      const existingUserIndex = state.currentRoom.members.findIndex(
        member => member.id === action.payload.user.id
      )
      
      let newMembers
      if (existingUserIndex >= 0) {
        // Update existing user
        newMembers = [...state.currentRoom.members]
        newMembers[existingUserIndex] = {
          ...newMembers[existingUserIndex],
          ...action.payload.user,
          isOnline: true,
          lastSeen: new Date()
        }
      } else {
        // Add new user
        newMembers = [...state.currentRoom.members, action.payload.user]
      }
      
      return {
        ...state,
        currentRoom: {
          ...state.currentRoom,
          members: newMembers,
          updatedAt: new Date()
        }
      }

    case RoomActionType.USER_DISCONNECTED:
      if (!state.currentRoom) return state
      
      const membersAfterDisconnect = state.currentRoom.members.map(member =>
        member.id === action.payload.userId
          ? { ...member, isOnline: false, lastSeen: new Date() }
          : member
      )
      
      return {
        ...state,
        currentRoom: {
          ...state.currentRoom,
          members: membersAfterDisconnect,
          updatedAt: new Date()
        }
      }

    case RoomActionType.CONNECTION_STATUS_CHANGED:
      return {
        ...state,
        connectionStatus: action.payload.status
      }

    case RoomActionType.ERROR_OCCURRED:
      return {
        ...state,
        error: action.payload.error,
        isLoading: false
      }

    case RoomActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }

    default:
      return state
  }
}

// Room Provider Component
interface RoomProviderProps {
  children: React.ReactNode
}

export function RoomProvider({ children }: RoomProviderProps) {
  const [state, dispatch] = useReducer(roomReducer, DEFAULT_ROOM_STATE)
  const [clientFingerprint] = useState(() => generateClientFingerprint())
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  // Initialize Firebase connection status
  useEffect(() => {
    // Set initial connection status to connecting
    dispatch({
      type: RoomActionType.CONNECTION_STATUS_CHANGED,
      payload: { status: ConnectionStatus.CONNECTING },
      userId: 'system',
      timestamp: new Date()
    })

    // Check Firebase initialization
    const checkFirebaseConnection = async () => {
      try {
        // Test if Firebase is properly configured
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

        if (apiKey && projectId && databaseURL) {
          // Firebase is configured, set to connected
          dispatch({
            type: RoomActionType.CONNECTION_STATUS_CHANGED,
            payload: { status: ConnectionStatus.CONNECTED },
            userId: 'system',
            timestamp: new Date()
          })
        } else {
          // Firebase not configured
          dispatch({
            type: RoomActionType.CONNECTION_STATUS_CHANGED,
            payload: { status: ConnectionStatus.DISCONNECTED },
            userId: 'system',
            timestamp: new Date()
          })
        }
      } catch (error) {
        console.error('Firebase connection error:', error)
        dispatch({
          type: RoomActionType.CONNECTION_STATUS_CHANGED,
          payload: { status: ConnectionStatus.DISCONNECTED },
          userId: 'system',
          timestamp: new Date()
        })
      }
    }

    checkFirebaseConnection()
  }, [])

  // Set up Firebase room listener
  useEffect(() => {
    const unsubscribe = firebaseRoomService.onRoomUpdate((room) => {
      if (room) {
        const currentUserId = firebaseRoomService.getCurrentUserId()
        const currentUser = room.members.find(member => member.id === currentUserId)

        if (currentUser) {
          dispatch({
            type: RoomActionType.USER_CONNECTED,
            payload: { room, user: currentUser },
            userId: currentUserId || 'system',
            timestamp: new Date()
          })
        }
      }
    })

    return unsubscribe
  }, [])

  // Create Room
  const createRoom = useCallback(async (request: CreateRoomRequest): Promise<RoomOperationResult<Room>> => {
    // Prevent multiple simultaneous room creations
    if (isCreatingRoom) {
      console.log('🔥 Room creation already in progress, ignoring request')
      return { success: false, error: createRoomError(RoomErrorCode.VALIDATION_ERROR, 'Room creation already in progress') }
    }

    try {
      console.log('🔥 Creating room with request:', request)
      setIsCreatingRoom(true)

      dispatch({
        type: RoomActionType.CONNECTION_STATUS_CHANGED,
        payload: { status: ConnectionStatus.CONNECTING },
        userId: 'system',
        timestamp: new Date()
      })

      // Validate request
      const validation = validateCreateRoomRequest(request)
      if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors)
        const error = createRoomError(
          RoomErrorCode.VALIDATION_ERROR,
          validation.errors.join(', ')
        )
        dispatch({
          type: RoomActionType.ERROR_OCCURRED,
          payload: { error },
          userId: 'system',
          timestamp: new Date()
        })
        return { success: false, error }
      }

      // Security validation (temporarily disabled for development)
      // const securityValidation = validateSecureRoomCreation('temp_user_id', clientFingerprint)
      // if (!securityValidation.valid) {
      //   console.error('❌ Security validation failed:', securityValidation.error)
      //   dispatch({
      //     type: RoomActionType.ERROR_OCCURRED,
      //     payload: { error: securityValidation.error! },
      //     userId: 'system',
      //     timestamp: new Date()
      //   })
      //   return { success: false, error: securityValidation.error! }
      // }

      console.log('🔥 Calling Firebase room service...')

      // Use Firebase to create room
      const result = await firebaseRoomService.createRoom(request)
      console.log('🔥 Firebase result:', result)

      if (result.success && result.data) {
        const currentUserId = firebaseRoomService.getCurrentUserId()
        const currentUser = result.data.members.find(member => member.id === currentUserId)

        if (currentUser) {
          // Update user session
          updateUserSession(currentUser.id, result.data.id)

          // Dispatch success
          dispatch({
            type: RoomActionType.CREATE_ROOM,
            payload: { room: result.data, user: currentUser },
            userId: currentUser.id,
            timestamp: new Date()
          })

          console.log('🔥 Room created successfully:', result.data)
          return { success: true, data: result.data }
        }
      }

      // Handle Firebase error
      if (result.error) {
        dispatch({
          type: RoomActionType.ERROR_OCCURRED,
          payload: { error: result.error },
          userId: 'system',
          timestamp: new Date()
        })
        return { success: false, error: result.error }
      }

      return { success: false, error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Unknown error') }
    } catch (error) {
      const roomError = createRoomError(
        RoomErrorCode.CONNECTION_FAILED,
        'Failed to create room'
      )
      dispatch({
        type: RoomActionType.ERROR_OCCURRED,
        payload: { error: roomError },
        userId: 'system',
        timestamp: new Date()
      })
      return { success: false, error: roomError }
    } finally {
      setIsCreatingRoom(false)
    }
  }, [clientFingerprint, isCreatingRoom])

  // Join Room
  const joinRoom = useCallback(async (request: JoinRoomRequest): Promise<RoomOperationResult<Room>> => {
    try {
      console.log('🔥 Room context joinRoom called with:', request)

      dispatch({
        type: RoomActionType.CONNECTION_STATUS_CHANGED,
        payload: { status: ConnectionStatus.CONNECTING },
        userId: 'system',
        timestamp: new Date()
      })

      // Validate request
      const validation = validateJoinRoomRequest(request)
      if (!validation.isValid) {
        const error = createRoomError(
          RoomErrorCode.VALIDATION_ERROR,
          validation.errors.join(', ')
        )
        dispatch({
          type: RoomActionType.ERROR_OCCURRED,
          payload: { error },
          userId: 'system',
          timestamp: new Date()
        })
        return { success: false, error }
      }

      console.log('🔥 Calling Firebase room service for join...')

      // Use Firebase to join room
      const result = await firebaseRoomService.joinRoom(request)
      console.log('🔥 Firebase join result:', result)

      if (result.success && result.data) {
        const currentUserId = firebaseRoomService.getCurrentUserId()
        const currentUser = result.data.members.find(member => member.id === currentUserId)

        if (currentUser) {
          // Update user session
          updateUserSession(currentUser.id, result.data.id)

          // Dispatch success
          dispatch({
            type: RoomActionType.JOIN_ROOM,
            payload: { room: result.data, user: currentUser },
            userId: currentUser.id,
            timestamp: new Date()
          })

          console.log('🔥 Room joined successfully:', result.data)
          return { success: true, data: result.data }
        }
      }

      // Handle Firebase error
      if (result.error) {
        console.error('🔥 Firebase join error:', result.error)
        dispatch({
          type: RoomActionType.ERROR_OCCURRED,
          payload: { error: result.error },
          userId: 'system',
          timestamp: new Date()
        })
        return { success: false, error: result.error }
      }

      return { success: false, error: createRoomError(RoomErrorCode.CONNECTION_FAILED, 'Unknown error') }
    } catch (error) {
      const roomError = createRoomError(
        RoomErrorCode.CONNECTION_FAILED,
        'Failed to join room'
      )
      dispatch({
        type: RoomActionType.ERROR_OCCURRED,
        payload: { error: roomError },
        userId: 'system',
        timestamp: new Date()
      })
      return { success: false, error: roomError }
    }
  }, [clientFingerprint])

  // Leave Room
  const leaveRoom = useCallback(async (): Promise<RoomOperationResult> => {
    try {
      // Use Firebase to leave room
      const result = await firebaseRoomService.leaveRoom()

      if (result.success) {
        dispatch({
          type: RoomActionType.LEAVE_ROOM,
          payload: {},
          userId: state.currentUser?.id || 'system',
          timestamp: new Date()
        })
        return { success: true }
      }

      return { success: false, error: result.error }
    } catch (error) {
      const roomError = createRoomError(
        RoomErrorCode.CONNECTION_FAILED,
        'Failed to leave room'
      )
      return { success: false, error: roomError }
    }
  }, [state.currentUser])

  // Update User
  const updateUser = useCallback(async (updates: Partial<User>): Promise<RoomOperationResult> => {
    if (!state.currentUser) {
      const error = createRoomError(RoomErrorCode.PERMISSION_DENIED, 'No user found')
      return { success: false, error }
    }

    try {
      dispatch({
        type: RoomActionType.UPDATE_USER,
        payload: { userId: state.currentUser.id, updates },
        userId: state.currentUser.id,
        timestamp: new Date()
      })
      return { success: true }
    } catch (error) {
      const roomError = createRoomError(
        RoomErrorCode.CONNECTION_FAILED,
        'Failed to update user'
      )
      return { success: false, error: roomError }
    }
  }, [state.currentUser])

  // Transfer Host
  const transferHost = useCallback(async (newHostId: string): Promise<RoomOperationResult> => {
    if (!state.currentUser || !state.currentRoom) {
      const error = createRoomError(RoomErrorCode.PERMISSION_DENIED, 'No room or user found')
      return { success: false, error }
    }

    if (!canUserPerformAction(state.currentUser, state.currentRoom, 'TRANSFER_HOST')) {
      const error = createRoomError(RoomErrorCode.PERMISSION_DENIED, 'Only host can transfer host privileges')
      return { success: false, error }
    }

    try {
      dispatch({
        type: RoomActionType.TRANSFER_HOST,
        payload: { newHostId },
        userId: state.currentUser.id,
        timestamp: new Date()
      })
      return { success: true }
    } catch (error) {
      const roomError = createRoomError(
        RoomErrorCode.CONNECTION_FAILED,
        'Failed to transfer host'
      )
      return { success: false, error: roomError }
    }
  }, [state.currentUser, state.currentRoom])

  // Kick User (placeholder)
  const kickUser = useCallback(async (userId: string): Promise<RoomOperationResult> => {
    if (!state.currentUser || !state.currentRoom) {
      const error = createRoomError(RoomErrorCode.PERMISSION_DENIED, 'No room or user found')
      return { success: false, error }
    }

    if (!canUserPerformAction(state.currentUser, state.currentRoom, 'KICK_USER')) {
      const error = createRoomError(RoomErrorCode.PERMISSION_DENIED, 'Only host can kick users')
      return { success: false, error }
    }

    // Implementation would go here
    return { success: true }
  }, [state.currentUser, state.currentRoom])

  // Clear Error
  const clearError = useCallback(() => {
    dispatch({
      type: RoomActionType.CLEAR_ERROR,
      payload: {},
      userId: state.currentUser?.id || 'system',
      timestamp: new Date()
    })
  }, [state.currentUser])

  // Reconnect (placeholder)
  const reconnect = useCallback(async (): Promise<RoomOperationResult> => {
    // Implementation would go here
    return { success: true }
  }, [])

  const contextValue: RoomContextType = {
    state,
    createRoom,
    joinRoom,
    leaveRoom,
    updateUser,
    transferHost,
    kickUser,
    clearError,
    reconnect
  }

  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  )
}

// Hook to use room context
export function useRoom(): RoomContextType {
  const context = useContext(RoomContext)
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return context
}
