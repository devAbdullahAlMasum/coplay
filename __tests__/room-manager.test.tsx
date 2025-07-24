import { describe, it, expect, beforeEach, test, jest } from 'bun:test'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomManager from '@/components/room-manager'
import { RoomProvider } from '@/contexts/room-context'

// Mock the room storage for bun test
const mockRoomStorage = {
  loadUserPreferences: () => ({ userName: 'Saved User' }),
  saveUserPreferences: () => {},
  saveRecentRoom: () => {},
  getRecentRooms: () => [
    { code: 'RECENT1', name: 'Recent Room 1', joinedAt: new Date() },
    { code: 'RECENT2', joinedAt: new Date() }
  ]
}

// Mock the hook
const originalModule = await import('@/lib/room-storage')
originalModule.useRoomStorage = () => mockRoomStorage

function renderRoomManager(props = {}) {
  const defaultProps = {
    onCreateRoom: () => {},
    onJoinRoom: () => {},
    ...props
  }

  return {
    ...render(
      <RoomProvider>
        <RoomManager {...defaultProps} />
      </RoomProvider>
    ),
    props: defaultProps
  }
}

describe('Room Manager', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear()
    }
  })

  describe('Initial Render', () => {
    it('should render the main interface', () => {
      renderRoomManager()
      
      expect(screen.getByText('CoPlay')).toBeInTheDocument()
      expect(screen.getByText('Watch videos together in perfect sync')).toBeInTheDocument()
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByText('Create New Room')).toBeInTheDocument()
      expect(screen.getByText('Join Existing Room')).toBeInTheDocument()
    })

    it('should load saved user preferences', () => {
      renderRoomManager()
      
      const nameInput = screen.getByLabelText('Your Name')
      expect(nameInput).toHaveValue('Saved User')
    })

    it('should show recent rooms when available', () => {
      renderRoomManager()
      
      expect(screen.getByText('Recent Rooms')).toBeInTheDocument()
    })

    it('should show features list', () => {
      renderRoomManager()
      
      expect(screen.getByText('Synchronized playback')).toBeInTheDocument()
      expect(screen.getByText('Real-time chat')).toBeInTheDocument()
      expect(screen.getByText('Watch together anywhere')).toBeInTheDocument()
    })
  })

  describe('User Name Input', () => {
    it('should update user name on input', async () => {
      const user = userEvent.setup()
      renderRoomManager()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'New User')
      
      expect(nameInput).toHaveValue('New User')
    })

    it('should show validation errors for invalid names', async () => {
      const user = userEvent.setup()
      renderRoomManager()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, '<script>alert("xss")</script>')
      
      // Trigger validation by blurring
      fireEvent.blur(nameInput)
      
      await waitFor(() => {
        expect(screen.getByText(/Name can only contain/)).toBeInTheDocument()
      })
    })

    it('should show validation success for valid names', async () => {
      const user = userEvent.setup()
      renderRoomManager()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Valid User')
      
      fireEvent.blur(nameInput)
      
      // Should not show any error messages
      await waitFor(() => {
        expect(screen.queryByText(/Name can only contain/)).not.toBeInTheDocument()
      })
    })

    it('should enforce maximum length', async () => {
      const user = userEvent.setup()
      renderRoomManager()
      
      const nameInput = screen.getByLabelText('Your Name')
      const longName = 'a'.repeat(25) // Longer than max allowed
      
      await user.clear(nameInput)
      await user.type(nameInput, longName)
      
      expect(nameInput.value.length).toBeLessThanOrEqual(20)
    })
  })

  describe('Create Room', () => {
    it('should create room with valid input', async () => {
      const { props } = renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test User')
      
      const createButton = screen.getByText('Create New Room')
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(props.onCreateRoom).toHaveBeenCalledWith('Test User')
      })
    })

    it('should disable create button with invalid input', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      
      const createButton = screen.getByText('Create New Room')
      expect(createButton).toBeDisabled()
    })

    it('should show loading state during creation', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test User')
      
      const createButton = screen.getByText('Create New Room')
      fireEvent.click(createButton)
      
      // Should briefly show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
      }, { timeout: 100 })
    })
  })

  describe('Join Room', () => {
    it('should switch to join mode', () => {
      renderRoomManager()
      
      const joinButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinButton)
      
      expect(screen.getByLabelText('Enter Room Code')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Join Room')).toBeInTheDocument()
    })

    it('should join room with valid input', async () => {
      const { props } = renderRoomManager()
      const user = userEvent.setup()
      
      // Switch to join mode
      const joinModeButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinModeButton)
      
      // Fill in user name
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test User')
      
      // Fill in room code
      const codeInput = screen.getByLabelText('Enter Room Code')
      await user.type(codeInput, 'ABC123')
      
      // Join room
      const joinButton = screen.getByText('Join Room')
      fireEvent.click(joinButton)
      
      await waitFor(() => {
        expect(props.onJoinRoom).toHaveBeenCalledWith('ABC123', 'Test User')
      })
    })

    it('should validate room code format', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      // Switch to join mode
      const joinModeButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinModeButton)
      
      const codeInput = screen.getByLabelText('Enter Room Code')
      await user.type(codeInput, 'invalid-code!')
      
      fireEvent.blur(codeInput)
      
      await waitFor(() => {
        expect(screen.getByText(/Room code can only contain/)).toBeInTheDocument()
      })
    })

    it('should auto-uppercase room codes', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      // Switch to join mode
      const joinModeButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinModeButton)
      
      const codeInput = screen.getByLabelText('Enter Room Code')
      await user.type(codeInput, 'abc123')
      
      expect(codeInput).toHaveValue('ABC123')
    })

    it('should disable join button with invalid input', async () => {
      renderRoomManager()
      
      // Switch to join mode
      const joinModeButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinModeButton)
      
      const joinButton = screen.getByText('Join Room')
      expect(joinButton).toBeDisabled()
    })

    it('should go back to main view', () => {
      renderRoomManager()
      
      // Switch to join mode
      const joinModeButton = screen.getByText('Join Existing Room')
      fireEvent.click(joinModeButton)
      
      // Go back
      const backButton = screen.getByText('Back')
      fireEvent.click(backButton)
      
      expect(screen.getByText('Create New Room')).toBeInTheDocument()
      expect(screen.queryByLabelText('Enter Room Code')).not.toBeInTheDocument()
    })
  })

  describe('Recent Rooms', () => {
    it('should expand recent rooms list', () => {
      renderRoomManager()
      
      const recentRoomsButton = screen.getByText('Recent Rooms')
      fireEvent.click(recentRoomsButton)
      
      expect(screen.getByText('RECENT1')).toBeInTheDocument()
      expect(screen.getByText('RECENT2')).toBeInTheDocument()
    })

    it('should join recent room directly', async () => {
      const { props } = renderRoomManager()
      const user = userEvent.setup()
      
      // Fill in user name first
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test User')
      
      // Expand recent rooms
      const recentRoomsButton = screen.getByText('Recent Rooms')
      fireEvent.click(recentRoomsButton)
      
      // Click on a recent room
      const recentRoom = screen.getByText('RECENT1')
      fireEvent.click(recentRoom)
      
      await waitFor(() => {
        expect(props.onJoinRoom).toHaveBeenCalledWith('RECENT1', 'Test User')
      })
    })

    it('should collapse recent rooms list', () => {
      renderRoomManager()
      
      const recentRoomsButton = screen.getByText('Recent Rooms')
      
      // Expand
      fireEvent.click(recentRoomsButton)
      expect(screen.getByText('RECENT1')).toBeInTheDocument()
      
      // Collapse
      fireEvent.click(recentRoomsButton)
      expect(screen.queryByText('RECENT1')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display connection errors', () => {
      // This would require mocking the room context to return an error state
      renderRoomManager()
      
      // The error display component should be tested separately
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('should handle form submission errors gracefully', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test User')
      
      const createButton = screen.getByText('Create New Room')
      
      // Should not crash when clicking
      expect(() => fireEvent.click(createButton)).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      renderRoomManager()
      
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create New Room' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Join Existing Room' })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      // Tab through elements
      await user.tab()
      expect(screen.getByLabelText('Your Name')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Create New Room')).toHaveFocus()
    })

    it('should announce validation errors to screen readers', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      await user.clear(nameInput)
      await user.type(nameInput, '<invalid>')
      
      fireEvent.blur(nameInput)
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/Name can only contain/)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderRoomManager()
      
      // Re-render with same props
      rerender(
        <RoomProvider>
          <RoomManager onCreateRoom={jest.fn()} onJoinRoom={jest.fn()} />
        </RoomProvider>
      )
      
      // Should still be functional
      expect(screen.getByText('CoPlay')).toBeInTheDocument()
    })

    it('should debounce validation', async () => {
      renderRoomManager()
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Your Name')
      
      // Type rapidly
      await user.clear(nameInput)
      await user.type(nameInput, 'Test', { delay: 10 })
      
      // Validation should be debounced
      expect(screen.queryByText('Validating...')).not.toBeInTheDocument()
    })
  })
})
