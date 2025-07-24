"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Users, ExternalLink } from "lucide-react"
import UserAvatar from "./user-avatar"
import { useRoom } from "@/contexts/room-context"

interface EmbeddedVideo {
  id: string
  title: string
  embedCode?: string
  url?: string // For direct video URLs like blob URLs
  thumbnail?: string
  duration?: string
  provider: 'screenpal' | 'youtube' | 'vimeo' | 'telegram' | 'custom'
}

interface EmbeddedVideoPlayerProps {
  video: EmbeddedVideo
  user: { id: string; name: string; avatar: string }
  friend: { id: string; name: string; avatar: string }
}

export default function EmbeddedVideoPlayer({ video, user, friend }: EmbeddedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state } = useRoom()

  const currentRoom = state.currentRoom
  const currentUser = state.currentUser
  const isHost = currentUser?.isHost || false

  // Check if this is a direct video URL (like Telegram blob)
  const isDirectVideo = video.url && !video.embedCode

  // Video event handlers for direct video URLs
  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return

    const videoElement = videoRef.current

    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime)
    const handleDurationChange = () => setDuration(videoElement.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration)
      setCurrentTime(0)
    }

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isDirectVideo, video.url])

  // Firebase real-time sync for embedded videos
  useEffect(() => {
    if (!currentRoom) return

    console.log('🎬 Setting up embedded video sync for room:', currentRoom.code)

    // Import Firebase functions
    import('@/lib/firebase').then(({ database }) => {
      import('firebase/database').then(({ ref, onValue, set, push }) => {
        const videoSyncRef = ref(database, `rooms/${currentRoom.id}/videoSync`)
        
        // Listen for video sync events
        const unsubscribe = onValue(videoSyncRef, (snapshot) => {
          if (!snapshot.exists()) return
          
          const syncData = snapshot.val()
          const { action, timestamp, userId, currentTime: syncTime } = syncData
          
          console.log('🎬 Received sync event:', syncData)
          
          // Don't sync our own actions
          if (userId === currentUser?.id) return
          
          // Check if this is a recent event (within 5 seconds)
          const timeDiff = Date.now() - timestamp
          if (timeDiff > 5000) return
          
          setIsSyncing(true)
          
          // Apply sync action
          switch (action) {
            case 'play':
              setIsPlaying(true)
              setCurrentTime(syncTime)
              if (isDirectVideo && videoRef.current) {
                videoRef.current.currentTime = syncTime
                videoRef.current.play().catch(console.error)
              }
              setSyncMessage(`${getUserName(userId)} started the video`)
              break
            case 'pause':
              setIsPlaying(false)
              setCurrentTime(syncTime)
              if (isDirectVideo && videoRef.current) {
                videoRef.current.currentTime = syncTime
                videoRef.current.pause()
              }
              setSyncMessage(`${getUserName(userId)} paused the video`)
              break
            case 'seek':
              setCurrentTime(syncTime)
              if (isDirectVideo && videoRef.current) {
                videoRef.current.currentTime = syncTime
              }
              setSyncMessage(`${getUserName(userId)} jumped to ${formatTime(syncTime)}`)
              break
          }
          
          // Clear sync message after 3 seconds
          setTimeout(() => {
            setSyncMessage(null)
            setIsSyncing(false)
          }, 3000)
        })
        
        return () => unsubscribe()
      })
    })
  }, [currentRoom, currentUser])

  const getUserName = (userId: string): string => {
    if (userId === user.id) return user.name
    if (userId === friend.id) return friend.name
    return 'Someone'
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const syncAction = async (action: 'play' | 'pause' | 'seek', time: number = currentTime) => {
    if (!currentRoom || !currentUser) return

    try {
      const { database } = await import('@/lib/firebase')
      const { ref, set } = await import('firebase/database')
      
      const videoSyncRef = ref(database, `rooms/${currentRoom.id}/videoSync`)
      
      const syncData = {
        action,
        currentTime: time,
        timestamp: Date.now(),
        userId: currentUser.id,
        videoId: video.id
      }
      
      console.log('🎬 Syncing action:', syncData)
      await set(videoSyncRef, syncData)
    } catch (error) {
      console.error('Error syncing video action:', error)
    }
  }

  const handlePlayClick = async () => {
    if (isSyncing) return // Don't allow control during sync

    const newTime = isDirectVideo && videoRef.current ? videoRef.current.currentTime : currentTime

    if (isDirectVideo && videoRef.current) {
      await videoRef.current.play()
    }

    setIsPlaying(true)
    await syncAction('play', newTime)
  }

  const handlePauseClick = async () => {
    if (isSyncing) return // Don't allow control during sync

    const newTime = isDirectVideo && videoRef.current ? videoRef.current.currentTime : currentTime

    if (isDirectVideo && videoRef.current) {
      videoRef.current.pause()
    }

    setIsPlaying(false)
    await syncAction('pause', newTime)
  }

  const handleSeekClick = async (time: number) => {
    if (isSyncing) return // Don't allow control during sync

    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = time
    }

    setCurrentTime(time)
    await syncAction('seek', time)
  }

  const openInNewTab = () => {
    // Extract URL from embed code if possible
    const urlMatch = video.embedCode.match(/src="([^"]+)"/)
    if (urlMatch) {
      window.open(urlMatch[1], '_blank')
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Video Container */}
      <div 
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Content */}
        <div className="w-full aspect-video relative overflow-hidden">
          {isDirectVideo ? (
            // Direct video URL (like Telegram blob)
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-cover"
              style={{
                objectFit: 'cover',
                objectPosition: 'center'
              }}
              preload="metadata"
              playsInline
              controls={false}
            />
          ) : (
            // Embedded video (ScreenPal, YouTube, etc.)
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: video.embedCode || '' }}
            />
          )}
        </div>

        {/* Sync Status Overlay */}
        <AnimatePresence>
          {syncMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium z-20"
            >
              {syncMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            >
              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                <div className="flex items-center justify-between text-white">
                  {/* Left Controls */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={isPlaying ? handlePauseClick : handlePlayClick}
                      className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors duration-200"
                      disabled={isSyncing}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="font-medium">{video.title}</span>
                        {isDirectVideo && duration > 0 && (
                          <span className="text-white/70 ml-2">• {formatTime(currentTime)} / {formatTime(duration)}</span>
                        )}
                        {!isDirectVideo && video.duration && (
                          <span className="text-white/70 ml-2">• {video.duration}</span>
                        )}
                      </div>

                      {/* Progress bar for direct videos */}
                      {isDirectVideo && duration > 0 && (
                        <div className="flex-1 max-w-xs">
                          <div className="w-full bg-white/20 rounded-full h-1">
                            <div
                              className="bg-[#3D7EFF] h-1 rounded-full transition-all duration-200"
                              style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={openInNewTab}
                      className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors duration-200"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User Badge */}
              <div className="absolute top-4 right-4 bg-[#3D7EFF] text-white px-3 py-1 rounded-full text-sm font-medium">
                {currentUser?.name || 'User'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Info */}
      <div className="mt-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#EDEDED] mb-2">{video.title}</h2>
          <div className="flex items-center space-x-4 text-[#9A9A9A]">
            <span>Provider: {video.provider}</span>
            {video.duration && <span>Duration: {video.duration}</span>}
          </div>
        </div>

        {/* Viewers */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[#9A9A9A]">
            <Users className="w-5 h-5" />
            <span>Watching together</span>
          </div>
          <div className="flex -space-x-2">
            <UserAvatar user={user} size="sm" />
            <UserAvatar user={friend} size="sm" />
          </div>
        </div>
      </div>

      {/* Sync Instructions */}
      <div className="mt-4 p-4 bg-[#1A1A1F] rounded-xl border border-[#2A2A2E]">
        <p className="text-[#9A9A9A] text-sm">
          <span className="text-[#3D7EFF] font-medium">Everyone can control the video!</span>
          When anyone plays, pauses, or seeks, it will sync for all viewers in real-time.
        </p>
      </div>
    </div>
  )
}
