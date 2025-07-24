"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Users } from "lucide-react"
import UserAvatar from "./user-avatar"
import { firebaseVideoSync } from "@/lib/firebase-video-sync"

interface Video {
  id: string
  title: string
  thumbnail: string
  duration: string
  url: string
}

interface VideoPlayerProps {
  video: Video
  onVideoAction: (action: string, data?: any) => void
  user: { id: string; name: string; avatar: string }
  friend: { id: string; name: string; avatar: string }
}

export default function VideoPlayer({ video, onVideoAction, user, friend }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Initialize Firebase video sync for Storj videos
  useEffect(() => {
    console.log('🎬 Setting up video sync for Storj video:', video.title)

    try {
      firebaseVideoSync.initialize()

      // Listen for sync events from other users
      const unsubscribe = firebaseVideoSync.onVideoStateChange((event) => {
        console.log('🎬 Received video sync event:', event)
        setIsSyncing(true)

        const videoElement = videoRef.current
        if (!videoElement) {
          setIsSyncing(false)
          return
        }

        // Apply sync event to video player
        switch (event.type) {
          case 'play':
            console.log('🎬 Syncing play at time:', event.currentTime)
            videoElement.currentTime = event.currentTime
            videoElement.play().catch(console.error)
            setIsPlaying(true)
            break
          case 'pause':
            console.log('🎬 Syncing pause at time:', event.currentTime)
            videoElement.currentTime = event.currentTime
            videoElement.pause()
            setIsPlaying(false)
            break
          case 'seek':
            console.log('🎬 Syncing seek to time:', event.currentTime)
            videoElement.currentTime = event.currentTime
            break
        }

        setTimeout(() => setIsSyncing(false), 500)
      })

      return () => {
        console.log('🎬 Cleaning up video sync')
        unsubscribe()
        firebaseVideoSync.cleanup()
      }
    } catch (error) {
      console.error('🎬 Error setting up video sync:', error)
    }
  }, [video.url, video.title])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handleWaiting = () => setIsBuffering(true)
    const handleCanPlay = () => setIsBuffering(false)
    const handleError = (e: Event) => {
      console.log("Video error handled:", e)
      setIsBuffering(false)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("error", handleError)
    video.addEventListener("abort", handleError)

    return () => {
      // Pause video before cleanup to prevent play interruption
      if (video && !video.paused) {
        video.pause()
      }
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("error", handleError)
      video.removeEventListener("abort", handleError)
    }
  }, [])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video || isSyncing) return

    try {
      console.log('🎬 Toggle play clicked, current state:', isPlaying)

      if (isPlaying) {
        video.pause()
        setIsPlaying(false)
        // Sync pause with Firebase
        await firebaseVideoSync.syncPause(video.currentTime)
        onVideoAction("pause", { time: video.currentTime })
      } else {
        // Check if video is still in the document before playing
        if (document.contains(video)) {
          await video.play()
          setIsPlaying(true)
          // Sync play with Firebase
          await firebaseVideoSync.syncPlay(video.currentTime)
          onVideoAction("play", { time: video.currentTime })
        }
      }
    } catch (error) {
      console.log("Video play/pause error handled:", error)
      setIsPlaying(false)
      setIsBuffering(false)
    }
  }

  const handleSeek = async (time: number) => {
    const video = videoRef.current
    if (!video || !document.contains(video) || isSyncing) return

    try {
      console.log('🎬 Seek to time:', time)
      video.currentTime = time
      setCurrentTime(time)
      // Sync seek with Firebase
      await firebaseVideoSync.syncSeek(time)
      onVideoAction("seek", { time })
    } catch (error) {
      console.log("Video seek error handled:", error)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  useEffect(() => {
    return () => {
      const video = videoRef.current
      if (video && !video.paused) {
        video.pause()
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Video Title & Info */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#EDEDED] mb-3">{video.title}</h2>
          <div className="flex items-center space-x-4 text-[#9A9A9A]">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Watching together</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserAvatar user={user} isActive={true} size="xs" />
              <UserAvatar user={friend} isActive={true} size="xs" />
              <span>2 viewers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#2A2A2E]"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Element */}
        <video ref={videoRef} className="w-full aspect-video object-cover" poster={video.thumbnail}>
          <source src={video.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Buffering Indicator */}
        <AnimatePresence>
          {isBuffering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-12 h-12 border-4 border-[#3D7EFF] border-t-transparent rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause Overlay */}
        <AnimatePresence>
          {!isPlaying && !isBuffering && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            >
              <div className="w-20 h-20 bg-gradient-to-r from-[#3D7EFF]/20 to-[#A259FF]/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Play className="w-8 h-8 ml-1 text-white" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6"
            >
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-full transition-all duration-200"
                    style={{ width: `${progressPercentage}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    className="p-3 hover:bg-[rgba(61,126,255,0.1)] rounded-full transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-4 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] hover:from-[#2D6EEF] hover:to-[#9249EF] rounded-full transition-all duration-200 shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>

                  <button
                    onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                    className="p-3 hover:bg-[rgba(61,126,255,0.1)] rounded-full transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleMute}
                      className="p-3 hover:bg-[rgba(61,126,255,0.1)] rounded-full transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-24 h-2 bg-white/20 rounded-full appearance-none slider"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-[#9A9A9A] font-medium">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <button className="p-3 hover:bg-[rgba(61,126,255,0.1)] rounded-full transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
