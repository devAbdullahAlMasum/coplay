"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Trash2, ExternalLink, Code, Youtube, Video } from 'lucide-react'

interface EmbeddedVideo {
  id: string
  title: string
  embedCode?: string
  url?: string // For direct video URLs like blob URLs
  thumbnail?: string
  duration?: string
  provider: 'screenpal' | 'youtube' | 'vimeo' | 'telegram' | 'custom'
}

interface EmbeddedVideoManagerProps {
  onVideoSelect: (video: EmbeddedVideo) => void
  isHost: boolean
}

export default function EmbeddedVideoManager({ onVideoSelect, isHost }: EmbeddedVideoManagerProps) {
  const [videos, setVideos] = useState<EmbeddedVideo[]>([
    // Example Telegram blob video
    {
      id: 'telegram-demo',
      title: 'Telegram Video',
      url: 'blob:https://web.telegram.org/cb866963-7c8e-4b97-a72b-87f3464afa71',
      provider: 'telegram',
      duration: 'Unknown'
    }
  ])
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [newVideo, setNewVideo] = useState({
    title: '',
    embedCode: '',
    url: '',
    provider: 'custom' as const
  })

  const detectProvider = (input: string): EmbeddedVideo['provider'] => {
    if (input.includes('blob:') && input.includes('telegram.org')) {
      return 'telegram'
    } else if (input.includes('screenpal.com') || input.includes('go.screenpal.com')) {
      return 'screenpal'
    } else if (input.includes('youtube.com') || input.includes('youtu.be')) {
      return 'youtube'
    } else if (input.includes('vimeo.com')) {
      return 'vimeo'
    }
    return 'custom'
  }

  const extractVideoId = (input: string, provider: EmbeddedVideo['provider']): string => {
    switch (provider) {
      case 'telegram':
        const telegramMatch = input.match(/blob:.*\/([^\/]+)$/);
        return telegramMatch ? telegramMatch[1] : `telegram_${Date.now()}`
      case 'screenpal':
        const screenpalMatch = input.match(/data-id="([^"]+)"|\/player\/([^?]+)/);
        return screenpalMatch ? (screenpalMatch[1] || screenpalMatch[2]) : `screenpal_${Date.now()}`
      case 'youtube':
        const youtubeMatch = input.match(/embed\/([^?]+)|watch\?v=([^&]+)/);
        return youtubeMatch ? (youtubeMatch[1] || youtubeMatch[2]) : `youtube_${Date.now()}`
      case 'vimeo':
        const vimeoMatch = input.match(/vimeo\.com\/(\d+)/);
        return vimeoMatch ? vimeoMatch[1] : `vimeo_${Date.now()}`
      default:
        return `custom_${Date.now()}`
    }
  }

  const handleAddVideo = () => {
    const input = newVideo.url.trim() || newVideo.embedCode.trim()

    if (!newVideo.title.trim() || !input) {
      alert('Please fill in both title and video URL/embed code')
      return
    }

    const provider = detectProvider(input)
    const videoId = extractVideoId(input, provider)

    const video: EmbeddedVideo = {
      id: videoId,
      title: newVideo.title,
      provider,
    }

    // Set either URL or embed code based on provider
    if (provider === 'telegram' || input.startsWith('blob:') || input.startsWith('http')) {
      video.url = input
    } else {
      video.embedCode = input
    }

    setVideos(prev => [...prev, video])
    setNewVideo({ title: '', embedCode: '', url: '', provider: 'custom' })
    setShowAddForm(false)
  }

  const handleDeleteVideo = (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      setVideos(prev => prev.filter(v => v.id !== videoId))
    }
  }

  const getProviderIcon = (provider: EmbeddedVideo['provider']) => {
    switch (provider) {
      case 'telegram':
        return <Video className="w-5 h-5 text-cyan-500" />
      case 'screenpal':
        return <Video className="w-5 h-5 text-green-500" />
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-500" />
      case 'vimeo':
        return <Video className="w-5 h-5 text-blue-500" />
      default:
        return <Code className="w-5 h-5 text-gray-500" />
    }
  }

  const getProviderColor = (provider: EmbeddedVideo['provider']) => {
    switch (provider) {
      case 'telegram':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'screenpal':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'youtube':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'vimeo':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Video Button (Anyone Can Add) */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-[#EDEDED]">Embedded Videos</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#3D7EFF] hover:bg-[#2D6EEF] text-white rounded-lg transition-colors duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Add Video</span>
        </button>
      </div>

      {/* Add Video Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#1A1A1F] rounded-xl border border-[#2A2A2E] p-6"
          >
            <h4 className="text-lg font-medium text-[#EDEDED] mb-4">Add Embedded Video</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9A9A9A] mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title..."
                  className="w-full px-4 py-2 bg-[#2A2A2E] border border-[#3A3A3E] rounded-lg text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:border-[#3D7EFF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9A9A9A] mb-2">
                  Video URL (for Telegram blob URLs, direct video links)
                </label>
                <input
                  type="text"
                  value={newVideo.url}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="blob:https://web.telegram.org/cb866963-7c8e-4b97-a72b-87f3464afa71"
                  className="w-full px-4 py-2 bg-[#2A2A2E] border border-[#3A3A3E] rounded-lg text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:border-[#3D7EFF] font-mono text-sm"
                />
              </div>

              <div className="text-center text-[#9A9A9A] text-sm">OR</div>

              <div>
                <label className="block text-sm font-medium text-[#9A9A9A] mb-2">
                  Embed Code (for ScreenPal, YouTube, Vimeo)
                </label>
                <textarea
                  value={newVideo.embedCode}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, embedCode: e.target.value }))}
                  placeholder="Paste your embed code here (ScreenPal, YouTube, Vimeo, etc.)..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#2A2A2E] border border-[#3A3A3E] rounded-lg text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:border-[#3D7EFF] font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-[#9A9A9A]">
                  Supported: Telegram blob URLs, ScreenPal, YouTube, Vimeo, and custom embeds
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-[#2A2A2E] hover:bg-[#3A3A3E] text-[#9A9A9A] rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddVideo}
                    className="px-4 py-2 bg-[#3D7EFF] hover:bg-[#2D6EEF] text-white rounded-lg transition-colors duration-200"
                  >
                    Add Video
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video List */}
      <div className="space-y-4">
        {videos.length === 0 && !showAddForm && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-[#2A2A2E] mx-auto mb-4" />
            <p className="text-[#9A9A9A] text-lg">
              Add your first embedded video to get started
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#1A1A1F] rounded-xl overflow-hidden border border-[#2A2A2E] hover:border-[#3D7EFF]/30 transition-all duration-200 group"
              >
                {/* Video Preview */}
                <div className="relative h-48 bg-gradient-to-br from-[#2A2A2E] to-[#1A1A1F] flex items-center justify-center">
                  {getProviderIcon(video.provider)}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => onVideoSelect(video)}
                      className="bg-[#3D7EFF] hover:bg-[#2D6EEF] text-white p-4 rounded-full transition-colors duration-200"
                    >
                      <Play className="w-8 h-8" />
                    </button>
                  </div>

                  {/* Delete Button (Anyone Can Delete) */}
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Provider Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${getProviderColor(video.provider)}`}>
                    {video.provider}
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h4 className="text-[#EDEDED] font-medium line-clamp-2 mb-2">
                    {video.title}
                  </h4>
                  <div className="flex items-center justify-between text-[#9A9A9A] text-sm">
                    <span className="capitalize">{video.provider}</span>
                    {video.duration && <span>{video.duration}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[#1A1A1F] rounded-xl border border-[#2A2A2E] p-6">
        <h4 className="text-lg font-medium text-[#EDEDED] mb-3">How to Add Videos</h4>
        <div className="space-y-2 text-[#9A9A9A] text-sm">
          <p><strong>Telegram:</strong> Copy the blob URL from Telegram web (blob:https://web.telegram.org/...)</p>
          <p><strong>ScreenPal:</strong> Copy the embed code from your ScreenPal video</p>
          <p><strong>YouTube:</strong> Go to Share → Embed and copy the iframe code</p>
          <p><strong>Vimeo:</strong> Click Share → Embed and copy the iframe code</p>
          <p><strong>Custom:</strong> Any iframe, embed code, or direct video URL will work</p>
        </div>
      </div>
    </div>
  )
}
