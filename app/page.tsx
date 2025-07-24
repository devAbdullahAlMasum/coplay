"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import RoomManager from "@/components/room-manager"
import EmbeddedVideoPlayer from "@/components/embedded-video-player"
import EmbeddedVideoManager from "@/components/embedded-video-manager"
import ChatPanel from "@/components/chat-panel"
import StatusIndicator from "@/components/status-indicator"
import UserSettings from "@/components/user-settings"
import { RoomMembers } from "@/components/room-members"
import { useRoom } from "@/contexts/room-context"
import { Users, Copy, Check, MessageCircle, X, Settings, LogOut, UserCheck } from "lucide-react"

// Embedded video interface
interface EmbeddedVideo {
  id: string
  title: string
  embedCode?: string
  url?: string // For direct video URLs like blob URLs
  thumbnail?: string
  duration?: string
  provider: 'screenpal' | 'youtube' | 'vimeo' | 'telegram' | 'custom'
}


export default function CoPlayApp() {
  const [currentPage, setCurrentPage] = useState<"home" | "room" | "watch">("home")
  const [currentVideo, setCurrentVideo] = useState<EmbeddedVideo | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  // Use the room context
  const { state, leaveRoom } = useRoom()

  // Derived state from room context
  const currentRoom = state.currentRoom
  const currentUser = state.currentUser
  const roomCode = currentRoom?.code || ""
  const isHost = currentUser?.isHost || false
  const userName = currentUser?.name || "You"
  const members = currentRoom?.members || []

  const chatUser = {
    id: currentUser?.id || "1",
    name: userName,
    avatar: "/placeholder.svg?height=40&width=40",
  }

  const mockFriend = {
    id: "2",
    name: "Alex",
    avatar: "/placeholder.svg?height=40&width=40",
  }

  const handleCreateRoom = (name: string) => {
    console.log('🎯 Page handleCreateRoom called with name:', name)
    console.log('🎯 Room created by Firebase, switching to room page')

    setCurrentPage("room")
    setStatusMessage("Room created! Share the code with your friends.")
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const handleJoinRoom = (code: string, name: string) => {
    console.log('🎯 Page handleJoinRoom called with:', { code, name })
    console.log('🎯 Room joined by Firebase, switching to room page')

    setCurrentPage("room")
    setStatusMessage(`Joined room ${code}`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const handleLeaveRoom = async () => {
    if (isHost && members.length > 1) {
      setStatusMessage("As host, you must transfer host privileges before leaving")
      setTimeout(() => setStatusMessage(null), 3000)
      setShowSettings(true)
      return
    }

    const result = await leaveRoom()
    if (result.success) {
      setCurrentPage("home")
      setCurrentVideo(null)
      setStatusMessage("Left the room")
      setTimeout(() => setStatusMessage(null), 2000)
    }
  }

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectVideo = (video: EmbeddedVideo) => {
    setCurrentVideo(video)
    setCurrentPage("watch")
    setStatusMessage(`Now watching: ${video.title}`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const handleVideoAction = (action: string, data?: any) => {
    console.log("Video action:", action, data)
    // Firebase video sync will be implemented here
  }

  const goToHomepage = () => {
    setCurrentPage("home")
    setCurrentVideo(null)
  }

  const goBackToRoom = () => {
    setCurrentVideo(null)
    setCurrentPage("room")
  }

  const handleSettingsUpdate = (settings: { userName: string }) => {
    setShowSettings(false)
    setStatusMessage("Settings updated")
    setTimeout(() => setStatusMessage(null), 2000)
  }

  const handleTransferHost = (newHostId: string) => {
    setStatusMessage("Host privileges transferred")
    setTimeout(() => setStatusMessage(null), 2000)
  }

  if (currentPage === "home") {
    return <RoomManager onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
  }

  return (
    <div className="min-h-screen bg-[#0E0E13] text-[#EDEDED]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#2A2A2E] bg-[#1A1A1F]">
        <div className="flex items-center space-x-6">
          <button
            onClick={goToHomepage}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#EDEDED]">CoPlay</h1>
          </button>

          <div className="flex items-center space-x-3 text-sm text-[#9A9A9A]">
            <div className="w-2 h-2 bg-[#3D7EFF] rounded-full animate-pulse" />
            <span>Room: {roomCode}</span>
            <button
              onClick={copyRoomCode}
              className="p-1 hover:bg-[rgba(61,126,255,0.1)] rounded transition-colors"
              title={copied ? "Copied!" : "Copy room code"}
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#3D7EFF]" />
              ) : (
                <Copy className="w-4 h-4 text-[#9A9A9A] hover:text-[#3D7EFF]" />
              )}
            </button>
            {isHost && <span className="px-2 py-1 bg-[#3D7EFF] text-white text-xs rounded-full font-medium">HOST</span>}
          </div>

          {currentPage === "watch" && (
            <button
              onClick={goBackToRoom}
              className="px-3 py-1 bg-[#2A2A2E] hover:bg-[rgba(61,126,255,0.1)] text-[#9A9A9A] hover:text-[#3D7EFF] rounded-lg transition-all duration-200 text-sm"
            >
              Back to Room
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isChatVisible
                ? "bg-[#3D7EFF] text-white"
                : "bg-[#2A2A2E] text-[#9A9A9A] hover:bg-[rgba(61,126,255,0.1)] hover:text-[#3D7EFF]"
            }`}
            title={isChatVisible ? "Hide chat" : "Show chat"}
          >
            {isChatVisible ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-[#2A2A2E] text-[#9A9A9A] hover:bg-[rgba(61,126,255,0.1)] hover:text-[#3D7EFF] rounded-lg transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Leave Room */}
          <button
            onClick={handleLeaveRoom}
            className="p-2 bg-[#2A2A2E] text-[#9A9A9A] hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all duration-200"
            title="Leave room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Status Indicator */}
      <AnimatePresence>{statusMessage && <StatusIndicator message={statusMessage} />}</AnimatePresence>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Video Section */}
        <main className="flex-1 p-6 flex flex-col">
          {currentPage === "watch" && currentVideo ? (
            <EmbeddedVideoPlayer video={currentVideo} user={chatUser} friend={mockFriend} />
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-bold text-[#EDEDED]">
                    Video Library
                  </h2>
                  <div className="text-sm text-[#9A9A9A] bg-[#1A1A1F] px-3 py-1 rounded-full border border-[#2A2A2E]">
                    Anyone can add and select videos
                  </div>
                </div>
                <p className="text-[#9A9A9A] text-lg">
                  Add videos (Telegram blob URLs, ScreenPal, YouTube, Vimeo) and start your synchronized viewing experience.
                  Everyone can control playback and it syncs in real-time!
                </p>
              </div>

              {/* Embedded Video Manager */}
              <EmbeddedVideoManager onVideoSelect={selectVideo} isHost={true} />
            </div>
          )}
        </main>

        {/* Chat Panel */}
        <AnimatePresence>
          {isChatVisible && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-l border-[#2A2A2E] bg-[#1A1A1F] overflow-hidden"
            >
              <div className="w-80 h-full">
                <ChatPanel user={chatUser} friend={mockFriend} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
