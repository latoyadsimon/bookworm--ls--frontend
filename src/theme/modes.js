// The 9 BookWorm style modes (see app_outline/style_guide.md).
// Colors live in src/styles/themes/<key>.css; this list drives the picker and font loading.
// Each mode also carries its reading-status icons and a little microcopy (style_guide.md).

const font = (families) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`

export const DEFAULT_MODE = 'street-royalty'

export const MODES = [
  {
    key: 'street-royalty',
    name: 'Street Royalty',
    vibe: 'Graffiti wall meets princess power',
    preview: { bg: '#120F14', surface: '#1E1A22', accent: '#FF2E93', accent2: '#FFD23F', text: '#FFFFFF' },
    fonts: font(['Rubik+Spray+Paint', 'Bungee', 'Permanent+Marker', 'Inter:wght@400;500;600;700']),
    ready: true,
    statusIcons: ['✨','🎨','👑'],
    added: 'Crowned! Added to your library.',
    featured: "Queen's Pick",
  },
  {
    key: 'cozy-library',
    name: 'Cozy Library',
    vibe: 'Lamp-lit reading room',
    preview: { bg: '#1F1712', surface: '#2C2119', accent: '#C9A227', accent2: '#2F5D50', text: '#F3E9D7' },
    fonts: font(['Playfair+Display:wght@600;700', 'Lora:wght@400;600']),
    ready: true,
    statusIcons: ['🔖','📖','📚'],
    added: 'Shelved. Added to your library.',
    featured: 'Staff Pick',
  },
  {
    key: 'little-cafe',
    name: 'Little Cafe',
    vibe: 'Sweet corner cafe',
    preview: { bg: '#FBF5EE', surface: '#FFFFFF', accent: '#8B4A2B', accent2: '#E8B4B8', text: '#3B2A20' },
    fonts: font(['Pacifico', 'Fraunces:wght@600;700', 'Nunito:wght@400;600;700']),
    ready: true,
    statusIcons: ['🧁','☕','🍰'],
    added: 'Added to your reading menu!',
    featured: "Today's Special",
  },
  {
    key: 'neon-arcade',
    name: 'Neon Arcade',
    vibe: 'Futuristic tech arcade',
    preview: { bg: '#0A0A12', surface: '#141428', accent: '#00F0FF', accent2: '#FF00E5', text: '#E8F7FF' },
    fonts: font(['Press+Start+2P', 'Orbitron:wght@600;700', 'Inter:wght@400;500;600;700']),
    ready: true,
    statusIcons: ['🎯','🎮','🏆'],
    added: 'Item acquired! Added to your library.',
    featured: 'High Score',
  },
  {
    key: 'midnight-observatory',
    name: 'Midnight Observatory',
    vibe: 'Stargazing night reads',
    preview: { bg: '#0B1026', surface: '#141B3A', accent: '#F4C95D', accent2: '#9D8CFF', text: '#EEF1FF' },
    fonts: font(['Cormorant+Garamond:wght@600;700', 'Nunito+Sans:wght@400;600;700']),
    ready: true,
    statusIcons: ['🌑','🌓','🌕'],
    added: 'Added to your sky.',
    featured: 'Brightest Star',
  },
  {
    key: 'greenhouse-botanical',
    name: 'Greenhouse Botanical',
    vibe: 'Airy plant shop',
    preview: { bg: '#F4F1EA', surface: '#FFFFFF', accent: '#3F6B4F', accent2: '#C46A4A', text: '#26332A' },
    fonts: font(['DM+Serif+Display', 'Work+Sans:wght@400;500;600']),
    ready: true,
    statusIcons: ['🌱','🌿','🌸'],
    added: 'Planted in your library.',
    featured: 'Fresh Pick',
  },
  {
    key: 'retro-paperback',
    name: "Retro Paperback '70s",
    vibe: 'Groovy pulp spinner rack',
    preview: { bg: '#F5E6C8', surface: '#FFF4DC', accent: '#B5461A', accent2: '#E1A730', text: '#3D2314' },
    fonts: font(['Shrikhand', 'Karla:wght@400;600;700']),
    ready: true,
    statusIcons: ['🌼','📻','🌈'],
    added: 'Far out! Added to your library.',
    featured: 'Hot Pick',
  },
  {
    key: 'comic-panel-pop',
    name: 'Comic Panel Pop',
    vibe: 'Loud comic panels',
    preview: { bg: '#FFFDF5', surface: '#FFFFFF', accent: '#E4002B', accent2: '#FFD400', text: '#111111' },
    fonts: font(['Bangers', 'Comic+Neue:wght@400;700']),
    ready: true,
    statusIcons: ['💭','💬','💥'],
    added: 'KA-CHUNK! Added to your library!',
    featured: 'Hero of the Day',
  },
  {
    key: 'kid-korner',
    name: 'Kid Korner',
    vibe: 'Bright + friendly for young readers',
    preview: { bg: '#FFF9E6', surface: '#FFFFFF', accent: '#6C3CE1', accent2: '#FFB703', text: '#2B2D42' },
    fonts: font(['Fredoka:wght@500;600', 'Lexend:wght@400;500;600']),
    ready: true,
    statusIcons: ['⭐','🐛','🏅'],
    added: 'Yay! You saved this book!',
    featured: 'Star Pick',
  },
]

export const findMode = (key) => MODES.find((m) => m.key === key && m.ready)
export const modeOrDefault = (key) => findMode(key) ?? MODES[0]

const STATUS_ORDER = ['want_to_read', 'reading', 'finished']
/** The mode's icon for a reading status, e.g. 🌓 for "reading" in Midnight Observatory. */
export const statusIcon = (modeKey, status) => modeOrDefault(modeKey).statusIcons[STATUS_ORDER.indexOf(status)] ?? ''
