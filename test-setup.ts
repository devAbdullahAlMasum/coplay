import '@testing-library/jest-dom'

// Setup DOM environment for bun test
if (typeof window === 'undefined') {
  const { JSDOM } = require('jsdom')

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  })

  global.window = dom.window as any
  global.document = dom.window.document
  global.navigator = dom.window.navigator
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
}

// Create mock functions
const mockFn = () => {
  const fn = (...args: any[]) => fn
  fn.mockReturnValue = (value: any) => { fn._returnValue = value; return fn }
  fn.mockResolvedValue = (value: any) => { fn._resolvedValue = value; return fn }
  fn.mockImplementation = (impl: any) => { fn._implementation = impl; return fn }
  return fn
}

// Mock framer-motion to avoid animation issues in tests
global.jest = {
  fn: mockFn,
  mock: (moduleName: string, factory: any) => {
    // Simple mock implementation for bun test
  }
} as any

// Mock framer-motion
global.mockMotion = {
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    p: 'p',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    option: 'option',
    ul: 'ul',
    li: 'li',
    nav: 'nav',
    section: 'section',
    article: 'article',
    aside: 'aside',
    header: 'header',
    footer: 'footer',
    main: 'main',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}

// Mock window.crypto for security functions
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createMockStorage()
})

Object.defineProperty(window, 'sessionStorage', {
  value: createMockStorage()
})

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    language: 'en-US',
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined)
    }
  }
})

// Mock screen
global.screen = {
  width: 1920,
  height: 1080
}

Object.defineProperty(window, 'screen', {
  value: global.screen
})

// Mock canvas for fingerprinting
global.HTMLCanvasElement.prototype.getContext = () => ({
  fillText: () => {},
  toDataURL: () => 'mock-canvas-data'
})

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  name: 'Test User',
  isHost: false,
  isOnline: true,
  joinedAt: new Date(),
  lastSeen: new Date(),
  ...overrides
})

global.createMockRoom = (overrides = {}) => ({
  id: 'test-room-id',
  code: 'TEST123',
  hostId: 'test-host-id',
  members: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  maxMembers: 10,
  isPrivate: false,
  settings: {
    allowGuestControl: false,
    requireApproval: false,
    chatEnabled: true,
    maxChatLength: 500,
    autoPlay: true,
    syncTolerance: 1000
  },
  ...overrides
})

// Suppress console warnings in tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React does not recognize') ||
     args[0].includes('Warning: Failed prop type'))
  ) {
    return
  }
  originalWarn.apply(console, args)
}
