import { create } from 'zustand'

interface UiState {
  activeWheelIndex: number
  isCartDrawerOpen: boolean
  isAiDrawerOpen: boolean
  setActiveWheelIndex: (index: number) => void
  setCartDrawerOpen: (open: boolean) => void
  setAiDrawerOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeWheelIndex: 0,
  isCartDrawerOpen: false,
  isAiDrawerOpen: false,
  setActiveWheelIndex: (index) => set({ activeWheelIndex: index }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  setAiDrawerOpen: (open) => set({ isAiDrawerOpen: open })
}))

