type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function toastGoster(message: string, type: ToastType = 'info', sureMs = 3000) {
  const id = generateId();
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, sureMs);
}

export function toastSubscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toastKaldir(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}
