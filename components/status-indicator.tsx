"use client"

import { motion } from "framer-motion"
import { CheckCircle, Info, AlertCircle } from "lucide-react"

interface StatusIndicatorProps {
  message: string
  type?: "success" | "info" | "warning"
}

export default function StatusIndicator({ message, type = "info" }: StatusIndicatorProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-[#3D7EFF]" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-[#A259FF]" />
      default:
        return <Info className="w-5 h-5 text-[#3D7EFF]" />
    }
  }

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="flex items-center space-x-3 px-6 py-3 bg-[#1A1A1F] border border-[#2A2A2E] rounded-xl shadow-lg backdrop-blur-sm">
        {getIcon()}
        <span className="text-[#EDEDED] font-medium">{message}</span>
      </div>
    </motion.div>
  )
}
