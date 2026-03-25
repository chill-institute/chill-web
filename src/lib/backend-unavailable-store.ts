type Listener = () => void;

let currentError: unknown = null;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getBackendUnavailableError() {
  return currentError;
}

export function subscribeToBackendUnavailable(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportBackendUnavailable(error: unknown) {
  if (currentError === error) {
    return;
  }
  currentError = error;
  notify();
}

export function clearBackendUnavailable() {
  if (currentError === null) {
    return;
  }
  currentError = null;
  notify();
}
