// agentforge-video/src/shared/emojiMap.ts
// Maps common English icon names (from GPT scriptgen) to emoji characters.
// If the input is already an emoji (non-ASCII), return it as-is.

const MAP: Record<string, string> = {
  // Actions
  upload: '📤', download: '📥', send: '📨', save: '💾', search: '🔍',
  edit: '✏️', delete: '🗑️', share: '🔗', print: '🖨️', copy: '📋',
  settings: '⚙️', config: '⚙️', configure: '⚙️', setup: '🔧',
  // Tech
  robot: '🤖', ai: '🤖', automation: '🤖', bot: '🤖',
  cloud: '☁️', server: '🖥️', database: '🗄️', code: '💻',
  api: '🔌', plugin: '🔌', integration: '🔌', connect: '🔌',
  lock: '🔒', security: '🔒', shield: '🛡️', key: '🔑',
  // Business
  chart: '📊', analytics: '📊', graph: '📈', growth: '📈', trending: '📈',
  money: '💰', dollar: '💵', euro: '💶', payment: '💳', wallet: '👛',
  team: '👥', people: '👥', users: '👥', group: '👥', community: '🌐',
  target: '🎯', goal: '🎯', focus: '🎯',
  trophy: '🏆', award: '🏆', winner: '🏆', star: '⭐',
  clock: '⏰', time: '⏱️', schedule: '📅', calendar: '📅',
  email: '📧', mail: '📧', message: '💬', chat: '💬', notification: '🔔',
  phone: '📞', call: '📞', contact: '📞',
  // Industry
  energy: '⚡', power: '⚡', electric: '⚡', lightning: '⚡', bolt: '⚡',
  solar: '☀️', sun: '☀️', light: '💡', bulb: '💡', idea: '💡',
  leaf: '🌿', eco: '🌱', green: '🌱', nature: '🌿', plant: '🌱', sustainability: '♻️', recycle: '♻️',
  fire: '🔥', hot: '🔥', flame: '🔥',
  water: '💧', drop: '💧',
  wind: '🌬️', air: '🌬️',
  earth: '🌍', globe: '🌍', world: '🌍', global: '🌍',
  building: '🏢', office: '🏢', factory: '🏭', home: '🏠', house: '🏠',
  car: '🚗', truck: '🚛', transport: '🚚', shipping: '📦', package: '📦', box: '📦',
  // Abstract
  check: '✅', done: '✅', success: '✅', verified: '✅', approved: '✅',
  warning: '⚠️', alert: '⚠️', danger: '❗',
  info: 'ℹ️', help: '❓', question: '❓',
  heart: '❤️', love: '❤️', health: '❤️',
  rocket: '🚀', launch: '🚀', fast: '🚀', speed: '🚀',
  tool: '🔧', wrench: '🔧', hammer: '🔨', build: '🔨', construct: '🔨',
  document: '📄', file: '📄', report: '📄', paper: '📄',
  photo: '📷', camera: '📷', image: '🖼️', picture: '🖼️', video: '🎬',
  music: '🎵', sound: '🔊', audio: '🎧',
  map: '🗺️', location: '📍', pin: '📍', gps: '📍',
  flag: '🚩', milestone: '🏁',
  gift: '🎁', bonus: '🎁', reward: '🎁',
  handshake: '🤝', deal: '🤝', partnership: '🤝', agreement: '🤝',
  // Fallback symbols
  process: '⚙️', step: '➡️', arrow: '➡️', next: '➡️', flow: '🔄', cycle: '🔄', refresh: '🔄', sync: '🔄',
};

export function resolveEmoji(icon: string): string {
  if (!icon) return '✦';
  // Already an emoji or non-ASCII character — return as-is
  if (/[^\x00-\x7F]/.test(icon)) return icon;
  // Lookup by lowercase trimmed
  const key = icon.toLowerCase().trim().replace(/[_\-\s]+/g, '');
  // Try exact match
  if (MAP[key]) return MAP[key];
  // Try partial match (first word that matches)
  for (const [k, v] of Object.entries(MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Fallback
  return '✦';
}
