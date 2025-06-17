import { create } from 'zustand';

const STORAGE_KEY = 'entropy_stickies';

const getInitialStickies = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const useStickyStore = create((set, get) => ({
  stickies: getInitialStickies(),
  addSticky: (sticky) => set((state) => {
    const updated = [...state.stickies, sticky];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { stickies: updated };
  }),
  updateSticky: (id, updates) => set((state) => {
    const updated = state.stickies.map(sticky => sticky.id === id ? { ...sticky, ...updates } : sticky);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { stickies: updated };
  }),
  removeSticky: (id) => set((state) => {
    const updated = state.stickies.filter(sticky => sticky.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { stickies: updated };
  }),
}));

export { useStickyStore }; 