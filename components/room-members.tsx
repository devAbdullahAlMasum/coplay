"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Crown, 
  MoreVertical, 
  UserX, 
  Shield, 
  Wifi, 
  WifiOff,
  Clock,
  ChevronDown,
  UserCheck
} from 'lucide-react'
import { User, Room } from '@/types/room'
import { useRoom } from '@/contexts/room-context'
import { ErrorDisplay } from '@/components/ui/error-display'

interface RoomMembersProps {
  room: Room
  currentUser: User
  className?: string
}

export function RoomMembers({ room, currentUser, className = '' }: RoomMembersProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null)
  
  const { transferHost, kickUser, state } = useRoom()

  const handleTransferHost = async (newHostId: string) => {
    const result = await transferHost(newHostId)
    if (result.success) {
      setShowMemberActions(null)
    }
  }

  const handleKickUser = async (userId: string) => {
    const result = await kickUser(userId)
    if (result.success) {
      setShowMemberActions(null)
    }
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const sortedMembers = [...room.members].sort((a, b) => {
    // Host first, then online users, then by join time
    if (a.isHost && !b.isHost) return -1
    if (!a.isHost && b.isHost) return 1
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return a.joinedAt.getTime() - b.joinedAt.getTime()
  })

  return (
    <div className={`bg-[#1A1A1F] rounded-xl border border-[#2A2A2E] ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A2E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-lg">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#EDEDED]">Room Members</h3>
              <p className="text-xs text-[#9A9A9A]">
                {room.members.filter(m => m.isOnline).length} of {room.members.length} online
              </p>
            </div>
          </div>
          <div className="text-xs text-[#9A9A9A] bg-[#0E0E13] px-2 py-1 rounded-full">
            {room.members.length}/{room.maxMembers}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="p-4 border-b border-[#2A2A2E]">
          <ErrorDisplay error={state.error} />
        </div>
      )}

      {/* Members List */}
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {sortedMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer
                  ${member.isOnline 
                    ? 'bg-[#0E0E13] border-[#2A2A2E] hover:border-[#3D7EFF]/30' 
                    : 'bg-[#0E0E13]/50 border-[#2A2A2E]/50'
                  }
                  ${expandedMember === member.id ? 'border-[#3D7EFF]/50' : ''}
                `}
                onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm
                      ${member.isHost 
                        ? 'bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] text-white' 
                        : 'bg-[#2A2A2E] text-[#EDEDED]'
                      }
                    `}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Online Status */}
                    <div className={`
                      absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1A1A1F] flex items-center justify-center
                      ${member.isOnline ? 'bg-green-500' : 'bg-gray-500'}
                    `}>
                      {member.isOnline ? (
                        <Wifi className="w-2 h-2 text-white" />
                      ) : (
                        <WifiOff className="w-2 h-2 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${member.isOnline ? 'text-[#EDEDED]' : 'text-[#9A9A9A]'}`}>
                        {member.name}
                      </span>
                      {member.isHost && (
                        <div className="flex items-center space-x-1 px-2 py-0.5 bg-[#3D7EFF] text-white text-xs rounded-full">
                          <Crown className="w-3 h-3" />
                          <span>Host</span>
                        </div>
                      )}
                      {member.id === currentUser.id && (
                        <span className="text-xs text-[#9A9A9A]">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-[#9A9A9A]">
                      <Clock className="w-3 h-3" />
                      <span>
                        {member.isOnline ? 'Online' : `Last seen ${formatLastSeen(member.lastSeen)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: expandedMember === member.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-[#9A9A9A]" />
                  </motion.div>
                  
                  {currentUser.isHost && member.id !== currentUser.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMemberActions(showMemberActions === member.id ? null : member.id)
                      }}
                      className="p-1 hover:bg-[rgba(61,126,255,0.1)] rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-[#9A9A9A]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Member Details */}
              <AnimatePresence>
                {expandedMember === member.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 p-3 bg-[#0E0E13] rounded-lg border border-[#2A2A2E] text-sm"
                  >
                    <div className="grid grid-cols-2 gap-4 text-[#9A9A9A]">
                      <div>
                        <span className="font-medium text-[#EDEDED]">Joined:</span>
                        <br />
                        {member.joinedAt.toLocaleDateString()} at {member.joinedAt.toLocaleTimeString()}
                      </div>
                      <div>
                        <span className="font-medium text-[#EDEDED]">Status:</span>
                        <br />
                        <div className="flex items-center space-x-1">
                          {member.isOnline ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span>Active now</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-gray-500 rounded-full" />
                              <span>Offline</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Member Actions Menu */}
              <AnimatePresence>
                {showMemberActions === member.id && currentUser.isHost && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-10 bg-[#1A1A1F] border border-[#2A2A2E] rounded-lg shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={() => handleTransferHost(member.id)}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-[#EDEDED] hover:bg-[rgba(61,126,255,0.1)] transition-colors"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Make Host</span>
                    </button>
                    <button
                      onClick={() => handleKickUser(member.id)}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Remove User</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {room.members.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-[#9A9A9A]"
          >
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No members in this room</p>
          </motion.div>
        )}
      </div>

      {/* Room Stats */}
      <div className="p-4 border-t border-[#2A2A2E] bg-[#0E0E13] rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-[#9A9A9A]">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <UserCheck className="w-3 h-3" />
              <span>{room.members.filter(m => m.isOnline).length} online</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Room: {room.code}</span>
            </div>
          </div>
          <div>
            Created {room.createdAt.toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
