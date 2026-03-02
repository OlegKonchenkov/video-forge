// agentforge-video/src/sceneRegistry.ts
import React from 'react';
import { ScenePainHook }       from './scenes/ScenePainHook';
import { SceneInboxChaos }     from './scenes/SceneInboxChaos';
import { SceneCostCounter }    from './scenes/SceneCostCounter';
import { SceneBrandReveal }    from './scenes/SceneBrandReveal';
import { SceneFeatureList }    from './scenes/SceneFeatureList';
import { SceneStatsGrid }      from './scenes/SceneStatsGrid';
import { SceneCTA }            from './scenes/SceneCTA';
import { SceneTestimonial }    from './scenes/SceneTestimonial';
import { SceneBeforeAfter }    from './scenes/SceneBeforeAfter';
import { SceneHowItWorks }     from './scenes/SceneHowItWorks';
import { SceneProductShowcase }from './scenes/SceneProductShowcase';
import { SceneOfferCountdown } from './scenes/SceneOfferCountdown';
import { SceneMapLocation }    from './scenes/SceneMapLocation';
import { SceneTeamIntro }      from './scenes/SceneTeamIntro';
import { SceneComparison }     from './scenes/SceneComparison';
import type { SharedSceneProps } from './types';

export const SCENE_REGISTRY: Record<string, React.FC<any & SharedSceneProps>> = {
  pain_hook:        ScenePainHook,
  inbox_chaos:      SceneInboxChaos,
  cost_counter:     SceneCostCounter,
  brand_reveal:     SceneBrandReveal,
  feature_list:     SceneFeatureList,
  stats_grid:       SceneStatsGrid,
  cta:              SceneCTA,
  testimonial:      SceneTestimonial,
  before_after:     SceneBeforeAfter,
  how_it_works:     SceneHowItWorks,
  product_showcase: SceneProductShowcase,
  offer_countdown:  SceneOfferCountdown,
  map_location:     SceneMapLocation,
  team_intro:       SceneTeamIntro,
  comparison:       SceneComparison,
};
