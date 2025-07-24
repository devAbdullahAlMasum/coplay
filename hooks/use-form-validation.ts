"use client"

import { useState, useCallback, useEffect } from 'react'
import { 
  validateRoomCode, 
  validateUserName, 
  validateCreateRoomRequest, 
  validateJoinRoomRequest,
  normalizeRoomCode,
  sanitizeInput
} from '@/lib/room-utils'
import { CreateRoomRequest, JoinRoomRequest, RoomValidationResult } from '@/types/room'

interface FormField {
  value: string
  errors: string[]
  isValid: boolean
  isTouched: boolean
  isValidating: boolean
}

interface UseFormValidationOptions {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
}

export function useFormValidation(options: UseFormValidationOptions = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options

  const [fields, setFields] = useState<Record<string, FormField>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize field
  const initializeField = useCallback((name: string, initialValue: string = '') => {
    setFields(prev => ({
      ...prev,
      [name]: {
        value: initialValue,
        errors: [],
        isValid: true,
        isTouched: false,
        isValidating: false
      }
    }))
  }, [])

  // Update field value
  const updateField = useCallback((name: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        isTouched: true
      }
    }))
  }, [])

  // Validate single field
  const validateField = useCallback((name: string, value: string): RoomValidationResult => {
    switch (name) {
      case 'roomCode':
        return validateRoomCode(normalizeRoomCode(value))
      
      case 'userName':
      case 'roomName':
        return validateUserName(sanitizeInput(value))
      
      default:
        return { isValid: true, errors: [] }
    }
  }, [])

  // Set field validation result
  const setFieldValidation = useCallback((name: string, validation: RoomValidationResult) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        errors: validation.errors,
        isValid: validation.isValid,
        isValidating: false
      }
    }))
  }, [])

  // Validate field with debouncing
  const validateFieldDebounced = useCallback((name: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        isValidating: true
      }
    }))

    const timeoutId = setTimeout(() => {
      const validation = validateField(name, value)
      setFieldValidation(name, validation)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [validateField, setFieldValidation, debounceMs])

  // Handle field change
  const handleFieldChange = useCallback((name: string, value: string) => {
    updateField(name, value)
    
    if (validateOnChange) {
      validateFieldDebounced(name, value)
    }
  }, [updateField, validateOnChange, validateFieldDebounced])

  // Handle field blur
  const handleFieldBlur = useCallback((name: string) => {
    const field = fields[name]
    if (!field) return

    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        isTouched: true
      }
    }))

    if (validateOnBlur) {
      const validation = validateField(name, field.value)
      setFieldValidation(name, validation)
    }
  }, [fields, validateOnBlur, validateField, setFieldValidation])

  // Validate all fields
  const validateAllFields = useCallback((): boolean => {
    let allValid = true
    const updatedFields = { ...fields }

    Object.keys(fields).forEach(name => {
      const field = fields[name]
      const validation = validateField(name, field.value)
      
      updatedFields[name] = {
        ...field,
        errors: validation.errors,
        isValid: validation.isValid,
        isTouched: true,
        isValidating: false
      }

      if (!validation.isValid) {
        allValid = false
      }
    })

    setFields(updatedFields)
    return allValid
  }, [fields, validateField])

  // Validate create room form
  const validateCreateRoomForm = useCallback((data: CreateRoomRequest): RoomValidationResult => {
    const validation = validateCreateRoomRequest(data)
    
    // Update individual field validations
    const userNameValidation = validateUserName(data.userName)
    setFieldValidation('userName', userNameValidation)
    
    if (data.roomName) {
      const roomNameValidation = validateUserName(data.roomName)
      setFieldValidation('roomName', roomNameValidation)
    }

    return validation
  }, [setFieldValidation])

  // Validate join room form
  const validateJoinRoomForm = useCallback((data: JoinRoomRequest): RoomValidationResult => {
    const validation = validateJoinRoomRequest(data)
    
    // Update individual field validations
    const roomCodeValidation = validateRoomCode(data.roomCode)
    const userNameValidation = validateUserName(data.userName)
    
    setFieldValidation('roomCode', roomCodeValidation)
    setFieldValidation('userName', userNameValidation)

    return validation
  }, [setFieldValidation])

  // Reset form
  const resetForm = useCallback(() => {
    setFields({})
    setIsSubmitting(false)
  }, [])

  // Reset field
  const resetField = useCallback((name: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        value: '',
        errors: [],
        isValid: true,
        isTouched: false,
        isValidating: false
      }
    }))
  }, [])

  // Get field value
  const getFieldValue = useCallback((name: string): string => {
    return fields[name]?.value || ''
  }, [fields])

  // Get field errors
  const getFieldErrors = useCallback((name: string): string[] => {
    return fields[name]?.errors || []
  }, [fields])

  // Check if field is valid
  const isFieldValid = useCallback((name: string): boolean => {
    return fields[name]?.isValid !== false
  }, [fields])

  // Check if field is touched
  const isFieldTouched = useCallback((name: string): boolean => {
    return fields[name]?.isTouched || false
  }, [fields])

  // Check if field is validating
  const isFieldValidating = useCallback((name: string): boolean => {
    return fields[name]?.isValidating || false
  }, [fields])

  // Check if form is valid
  const isFormValid = useCallback((): boolean => {
    return Object.values(fields).every(field => field.isValid)
  }, [fields])

  // Check if form has been touched
  const isFormTouched = useCallback((): boolean => {
    return Object.values(fields).some(field => field.isTouched)
  }, [fields])

  // Check if any field is validating
  const isFormValidating = useCallback((): boolean => {
    return Object.values(fields).some(field => field.isValidating)
  }, [fields])

  // Get all form errors
  const getFormErrors = useCallback((): string[] => {
    return Object.values(fields).flatMap(field => field.errors)
  }, [fields])

  // Submit handler wrapper
  const handleSubmit = useCallback(async (
    onSubmit: () => Promise<void> | void,
    validateBeforeSubmit: boolean = true
  ) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      if (validateBeforeSubmit && !validateAllFields()) {
        return
      }

      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, validateAllFields])

  return {
    // Field management
    initializeField,
    updateField,
    resetField,
    resetForm,
    
    // Field values and state
    getFieldValue,
    getFieldErrors,
    isFieldValid,
    isFieldTouched,
    isFieldValidating,
    
    // Form state
    isFormValid,
    isFormTouched,
    isFormValidating,
    isSubmitting,
    getFormErrors,
    
    // Event handlers
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    
    // Validation
    validateField,
    validateAllFields,
    validateCreateRoomForm,
    validateJoinRoomForm,
    
    // Raw fields data
    fields
  }
}
