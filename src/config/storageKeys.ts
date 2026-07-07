// Albion Market Manager localStorage keys. runningdawn only ships the Albion
// section, so only the albion_* keys live here. The `forgegames_albion_*_v1`
// prefix is shared with forgehaven.io so a user's settings match across sites.
export const STORAGE_KEYS = {
  albionItemFavourites:    'forgegames_albion_item_favourites_v1',
  albionMMCollapsed:       'forgegames_albion_mm_collapsed_v1',
  albionPremium:           'forgegames_albion_premium_v1',
  albionFocus:             'forgegames_albion_focus_v1',
  albionDefaultCity:       'forgegames_albion_default_city_v1',
  albionMatSource:         'forgegames_albion_mat_source_v1',
  albionCraftStrategy:     'forgegames_albion_craft_strategy_v1',
  albionBvScope:           'forgegames_albion_bv_scope_v1',
} as const
