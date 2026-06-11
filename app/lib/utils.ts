export function genId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

export function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
