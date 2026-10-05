const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const readStorage = (key, fallback) => {
  if (!canUseStorage()) return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const readArray = (key) => {
  const value = readStorage(key, []);
  return Array.isArray(value) ? value : [];
};

export const clearStorage = (key) => {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
