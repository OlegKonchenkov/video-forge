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
import { SceneBigStat }        from './scenes/SceneBigStat';
import { SceneMissionStatement }from './scenes/SceneMissionStatement';
import { SceneSocialProof }     from './scenes/SceneSocialProof';
import { SceneTimeline }        from './scenes/SceneTimeline';
import { ScenePricingTable }   from './scenes/ScenePricingTable';
import { SceneCaseStudy }      from './scenes/SceneCaseStudy';
import { SceneFaq }            from './scenes/SceneFaq';
import { SceneFeatureSpotlight }from './scenes/SceneFeatureSpotlight';
import { SceneGuarantee }      from './scenes/SceneGuarantee';
import { SceneClosingRecap }   from './scenes/SceneClosingRecap';
import { SceneAnimatedChart }  from './scenes/SceneAnimatedChart';
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
  big_stat:         SceneBigStat,
  mission_statement:SceneMissionStatement,
  social_proof:     SceneSocialProof,
  timeline:         SceneTimeline,
  pricing_table:    ScenePricingTable,
  case_study:       SceneCaseStudy,
  faq:              SceneFaq,
  feature_spotlight:SceneFeatureSpotlight,
  guarantee:        SceneGuarantee,
  closing_recap:    SceneClosingRecap,
  animated_chart:   SceneAnimatedChart,
};
