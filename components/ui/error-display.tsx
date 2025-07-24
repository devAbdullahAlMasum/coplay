"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { RoomError, RoomErrorCode, ConnectionStatus } from '@/types/room'
import { formatRoomError } from '@/lib/room-utils'

interface ErrorDisplayProps {
  error: RoomError | null
  connectionStatus?: ConnectionStatus
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorDisplay({ 
  error, 
  connectionStatus, 
  onRetry, 
  onDismiss, 
  className = '' 
}: ErrorDisplayProps) {
  if (!error && connectionStatus !== ConnectionStatus.ERROR) {
    return null
  }

  const getErrorIcon = () => {
    if (connectionStatus === ConnectionStatus.ERROR) {
      return <WifiOff className="w-5 h-5" />
    }
    
    switch (error?.code) {
      case RoomErrorCode.CONNECTION_FAILED:
      case RoomErrorCode.NETWORK_ERROR:
        return <WifiOff className="w-5 h-5" />
      default:
        return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getErrorMessage = () => {
    if (connectionStatus === ConnectionStatus.ERROR) {
      return 'Connection error occurred'
    }
    return error ? formatRoomError(error) : 'An unknown error occurred'
  }

  const getErrorSeverity = () => {
    if (connectionStatus === ConnectionStatus.ERROR) return 'error'
    
    switch (error?.code) {
      case RoomErrorCode.VALIDATION_ERROR:
      case RoomErrorCode.INVALID_ROOM_CODE:
      case RoomErrorCode.INVALID_USER_NAME:
        return 'warning'
      case RoomErrorCode.CONNECTION_FAILED:
      case RoomErrorCode.NETWORK_ERROR:
        return 'error'
      default:
        return 'info'
    }
  }

  const severity = getErrorSeverity()
  const canRetry = error?.code === RoomErrorCode.CONNECTION_FAILED || 
                   error?.code === RoomErrorCode.NETWORK_ERROR ||
                   connectionStatus === ConnectionStatus.ERROR

  const severityStyles = {
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          flex items-center justify-between p-4 rounded-lg border
          ${severityStyles[severity]}
          ${className}
        `}
      >
        <div className="flex items-center space-x-3">
          {getErrorIcon()}
          <div>
            <p className="font-medium">{getErrorMessage()}</p>
            {error?.details && (
              <p className="text-sm opacity-75 mt-1">
                {typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus
  className?: string
}

export function ConnectionStatusIndicator({ status, className = '' }: ConnectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        }
      case ConnectionStatus.CONNECTING:
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20'
        }
      case ConnectionStatus.RECONNECTING:
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Reconnecting...',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20'
        }
      case ConnectionStatus.ERROR:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Connection Error',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20'
        }
      case ConnectionStatus.DISCONNECTED:
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium
      ${config.color} ${config.bgColor}
      ${className}
    `}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}

interface FormErrorProps {
  errors: string[]
  className?: string
}

export function FormError({ errors, className = '' }: FormErrorProps) {
  if (errors.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`text-red-400 text-sm space-y-1 ${className}`}
    >
      {errors.map((error, index) => (
        <div key={index} className="flex items-center space-x-2">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
    </motion.div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <RefreshCw className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface ValidationFeedbackProps {
  isValid: boolean
  errors: string[]
  successMessage?: string
  className?: string
}

export function ValidationFeedback({ 
  isValid, 
  errors, 
  successMessage, 
  className = '' 
}: ValidationFeedbackProps) {
  if (isValid && !successMessage) return null

  return (
    <AnimatePresence>
      {!isValid && errors.length > 0 && (
        <FormError errors={errors} className={className} />
      )}
      {isValid && successMessage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`text-green-400 text-sm flex items-center space-x-2 ${className}`}
        >
          <div className="w-3 h-3 bg-green-400 rounded-full" />
          <span>{successMessage}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
