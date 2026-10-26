// Animated background scene per style mode (all 9 modes). Each scene's motion lives in styles/themes/<mode>.scene.css.
import StreetRoyaltyScene from './StreetRoyaltyScene'
import NeonArcadeScene from './NeonArcadeScene'
import LittleCafeScene from './LittleCafeScene'
import CozyLibraryScene from './CozyLibraryScene'
import MidnightObservatoryScene from './MidnightObservatoryScene'
import GreenhouseBotanicalScene from './GreenhouseBotanicalScene'
import RetroPaperbackScene from './RetroPaperbackScene'
import ComicPanelPopScene from './ComicPanelPopScene'
import KidKornerScene from './KidKornerScene'

export const SCENES = {
  'street-royalty': StreetRoyaltyScene,
  'neon-arcade': NeonArcadeScene,
  'little-cafe': LittleCafeScene,
  'cozy-library': CozyLibraryScene,
  'midnight-observatory': MidnightObservatoryScene,
  'greenhouse-botanical': GreenhouseBotanicalScene,
  'retro-paperback': RetroPaperbackScene,
  'comic-panel-pop': ComicPanelPopScene,
  'kid-korner': KidKornerScene,
}
