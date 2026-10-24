import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toast: Toast | null;
  show: (text: string, action?: Toast['action']) => void;
  hide: (id?: number) => void;
}

let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set, get) => ({
  toast: null,
  show: (text, action) => {
    const id = ++seq;
    set({ toast: { id, text, action } });
    clearTimeout(timer);
    timer = setTimeout(() => get().hide(id), action ? 5000 : 2600);
  },
  hide: (id) => {
    if (id === undefined || get().toast?.id === id) set({ toast: null });
  },
}));

export const toast = (text: string, action?: Toast['action']) => useToast.getState().show(text, action);
