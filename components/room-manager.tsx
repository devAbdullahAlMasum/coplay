"use client"

import { useState, useEffect } from "react"
import { Users, Plus, LogIn, Zap, MessageCircle, Play, Clock, ChevronRight } from "lucide-react"
import { useRoom } from "@/contexts/room-context"
import { useFormValidation } from "@/hooks/use-form-validation"
import { useRoomStorage } from "@/lib/room-storage"
import { ErrorDisplay, ConnectionStatusIndicator, ValidationFeedback, LoadingSpinner } from "@/components/ui/error-display"
import { CreateRoomRequest, JoinRoomRequest } from "@/types/room"
import { normalizeRoomCode, sanitizeInput } from "@/lib/room-utils"

interface RoomManagerProps {
  onCreateRoom: (name: string) => void
  onJoinRoom: (code: string, name: string) => void
}

export default function RoomManager({ onCreateRoom, onJoinRoom }: RoomManagerProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [showRecentRooms, setShowRecentRooms] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const { state, createRoom, joinRoom, clearError } = useRoom()
  const roomStorage = useRoomStorage()
  const {
    initializeField,
    getFieldValue,
    getFieldErrors,
    isFieldValid,
    isFieldTouched,
    isFieldValidating,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    validateCreateRoomForm,
    validateJoinRoomForm,
    isFormValid,
    isSubmitting
  } = useFormValidation()

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize form fields
  useEffect(() => {
    if (!isClient) return

    initializeField('userName', '')
    initializeField('roomCode', '')
    initializeField('roomName', '')

    // Load saved user preferences
    const preferences = roomStorage.loadUserPreferences()
    if (preferences.userName) {
      handleFieldChange('userName', preferences.userName)
    }
  }, [isClient, initializeField, handleFieldChange, roomStorage])

  // Load recent rooms (only on client)
  const recentRooms = isClient ? roomStorage.getRecentRooms().slice(0, 5) : []

  const handleCreateRoom = async () => {
    // Prevent multiple calls
    if (isSubmitting || isCreating) {
      console.log('🎯 Already creating room, ignoring request')
      return
    }

    console.log('🎯 RoomManager handleCreateRoom called')
    setIsCreating(true)

    const userName = sanitizeInput(getFieldValue('userName'))
    console.log('🎯 Username from field:', userName)

    if (!userName.trim()) {
      console.log('🎯 Username is empty, aborting')
      return
    }

    const roomName = sanitizeInput(getFieldValue('roomName'))

    const request: CreateRoomRequest = {
      userName,
      roomName: roomName || undefined
    }

    console.log('🎯 Create room request:', request)

    try {
      const result = await createRoom(request)
      console.log('🎯 Room creation result:', result)

      if (result.success && result.data) {
        // Save user preferences
        roomStorage.saveUserPreferences({ userName })

        // Save recent room
        roomStorage.saveRecentRoom({
          code: result.data.code,
          name: result.data.name || `${userName}'s Room`,
          joinedAt: new Date()
        })

        console.log('🎯 Room created successfully, calling onCreateRoom with:', userName)
        onCreateRoom(userName)
      } else {
        console.error('🎯 Room creation failed:', result.error)
      }
    } catch (error) {
      console.error('🎯 Error in room creation:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (roomCode?: string) => {
    console.log('🎯 RoomManager handleJoinRoom called with roomCode:', roomCode)

    const userName = sanitizeInput(getFieldValue('userName'))
    const code = roomCode || normalizeRoomCode(getFieldValue('roomCode'))

    console.log('🎯 Join room data:', { userName, code })

    const request: JoinRoomRequest = {
      roomCode: code,
      userName
    }

    console.log('🎯 Join room request:', request)

    const validation = validateJoinRoomForm(request)
    if (!validation.isValid) {
      console.error('🎯 Join room validation failed:', validation.errors)
      return
    }

    console.log('🎯 Validation passed, calling joinRoom...')

    try {
      const result = await joinRoom(request)
      console.log('🎯 Join room result:', result)

      if (result.success && result.data) {
        // Save user preferences
        roomStorage.saveUserPreferences({ userName })

        // Save recent room
        roomStorage.saveRecentRoom({
          code: result.data.code,
          name: result.data.name || `Room ${code}`,
          joinedAt: new Date()
        })

        console.log('🎯 Room joined successfully, calling onJoinRoom')
        onJoinRoom(code, userName)
      } else {
        console.error('🎯 Join room failed:', result.error)
      }
    } catch (error) {
      console.error('🎯 Error in handleJoinRoom:', error)
    }
  }

  // Prevent hydration mismatch by showing loading state
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#0E0E13] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-bold text-[#EDEDED] mb-3">CoPlay</h1>
          <div className="animate-pulse">
            <div className="h-4 bg-[#2A2A2E] rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      text: "Synchronized playback",
      color: "#3D7EFF",
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      text: "Real-time chat",
      color: "#A259FF",
    },
    {
      icon: <Play className="w-5 h-5" />,
      text: "Watch together anywhere",
      color: "#3D7EFF",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0E0E13] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#EDEDED] mb-3">CoPlay</h1>
          <p className="text-[#9A9A9A] text-lg">Watch videos together in perfect sync</p>
        </div>

        {/* Connection Status */}
        {state.connectionStatus && (
          <div className="flex justify-center">
            <ConnectionStatusIndicator status={state.connectionStatus} />
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <ErrorDisplay
            error={state.error}
            onDismiss={clearError}
            onRetry={() => window.location.reload()}
          />
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="user-name" className="block text-sm font-semibold text-[#EDEDED] mb-3">
            Your Name
          </label>
          <input
            id="user-name"
            type="text"
            value={getFieldValue('userName')}
            onChange={(e) => handleFieldChange('userName', e.target.value)}
            onBlur={() => handleFieldBlur('userName')}
            placeholder="Enter your name"
            className={`w-full px-4 py-3 bg-[#1A1A1F] border rounded-xl text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
              isFieldTouched('userName') && !isFieldValid('userName')
                ? 'border-red-500/50 focus:ring-red-500/50'
                : 'border-[#2A2A2E] focus:ring-[#3D7EFF]'
            }`}
            maxLength={20}
            disabled={isSubmitting}
          />
          {isFieldValidating('userName') && (
            <div className="mt-2 flex items-center space-x-2 text-[#9A9A9A] text-sm">
              <LoadingSpinner size="sm" />
              <span>Validating...</span>
            </div>
          )}
          <ValidationFeedback
            isValid={isFieldValid('userName')}
            errors={getFieldErrors('userName')}
            className="mt-2"
          />
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && !isJoining && (
          <div>
            <button
              onClick={() => setShowRecentRooms(!showRecentRooms)}
              className="w-full flex items-center justify-between p-3 bg-[#1A1A1F] hover:bg-[rgba(61,126,255,0.1)] border border-[#2A2A2E] rounded-xl transition-all duration-200 text-[#EDEDED]"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Recent Rooms</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${showRecentRooms ? 'rotate-90' : ''}`} />
            </button>

            {showRecentRooms && (
              <div className="mt-2 space-y-2">
                {recentRooms.map((room, index) => (
                  <button
                    key={index}
                    onClick={() => handleJoinRoom(room.code)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between p-3 bg-[#0E0E13] hover:bg-[rgba(61,126,255,0.1)] border border-[#2A2A2E] rounded-lg transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="text-[#EDEDED] font-medium">{room.code}</div>
                      {room.name && <div className="text-[#9A9A9A] text-xs">{room.name}</div>}
                    </div>
                    <div className="text-[#9A9A9A] text-xs">
                      {room.joinedAt.toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Room Options */}
        <div className="space-y-4">
          {!isJoining ? (
            <>
              <button
                onClick={() => {
                  console.log('🎯 Create room button clicked!')
                  console.log('🎯 isSubmitting:', isSubmitting)
                  console.log('🎯 userName field value:', getFieldValue('userName'))
                  console.log('🎯 userName field valid:', isFieldValid('userName'))
                  handleCreateRoom()
                }}
                disabled={isSubmitting || !getFieldValue('userName').trim()}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] hover:from-[#2D6EEF] hover:to-[#9249EF] disabled:from-[#2A2A2E] disabled:to-[#2A2A2E] disabled:cursor-not-allowed rounded-xl transition-all duration-200 font-semibold text-white shadow-lg"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span>{isSubmitting ? 'Creating...' : 'Create New Room'}</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2A2A2E]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#0E0E13] text-[#9A9A9A]">or</span>
                </div>
              </div>

              <button
                onClick={() => setIsJoining(true)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-[#1A1A1F] hover:bg-[rgba(61,126,255,0.1)] border border-[#2A2A2E] rounded-xl transition-all duration-200 font-semibold text-[#EDEDED] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-5 h-5" />
                <span>Join Existing Room</span>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="room-code" className="block text-sm font-semibold text-[#EDEDED] mb-3">
                  Enter Room Code
                </label>
                <input
                  id="room-code"
                  type="text"
                  value={getFieldValue('roomCode')}
                  onChange={(e) => handleFieldChange('roomCode', e.target.value.toUpperCase())}
                  onBlur={() => handleFieldBlur('roomCode')}
                  placeholder="ABCD12"
                  className={`w-full px-4 py-4 bg-[#1A1A1F] border rounded-xl text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:ring-2 focus:border-transparent transition-all uppercase tracking-wider text-center text-lg font-mono ${
                    isFieldTouched('roomCode') && !isFieldValid('roomCode')
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-[#2A2A2E] focus:ring-[#3D7EFF]'
                  }`}
                  maxLength={6}
                  disabled={isSubmitting}
                />
                {isFieldValidating('roomCode') && (
                  <div className="mt-2 flex items-center space-x-2 text-[#9A9A9A] text-sm">
                    <LoadingSpinner size="sm" />
                    <span>Validating...</span>
                  </div>
                )}
                <ValidationFeedback
                  isValid={isFieldValid('roomCode')}
                  errors={getFieldErrors('roomCode')}
                  className="mt-2"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsJoining(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#1A1A1F] hover:bg-[rgba(61,126,255,0.1)] border border-[#2A2A2E] rounded-xl transition-all duration-200 font-semibold text-[#EDEDED] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={() => handleJoinRoom()}
                  disabled={isSubmitting || !isFormValid() || !getFieldValue('roomCode').trim() || !getFieldValue('userName').trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] hover:from-[#2D6EEF] hover:to-[#9249EF] disabled:from-[#2A2A2E] disabled:to-[#2A2A2E] disabled:cursor-not-allowed rounded-xl transition-all duration-200 font-semibold text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Joining...</span>
                    </div>
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3 text-[#9A9A9A]">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${feature.color}20`, color: feature.color }}>
                {feature.icon}
              </div>
              <span className="font-medium">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
