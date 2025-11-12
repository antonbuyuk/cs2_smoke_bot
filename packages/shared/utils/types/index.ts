import type {
  MapKey,
  GrenadeTypeKey,
  DifficultyKey,
  SideKey,
  LineKey,
  AdminActionKey
} from '../../config/constants';

export interface SuggestedSmoke {
  id: number;
  map_id: number;
  name: string;
  lineup_instructions: string;
  difficulty: string;
  side: string;
  line: string;
  grenade_type: string;
  user_id: number;
  username: string;
  suggested_at: string;
  image_url: string;
}

export interface KeyboardOption {
  emoji: string;
  name: string;
  callback: string;
}

export type MediaType = 'photo' | 'video';

export interface SmokeRecord {
  id: number;
  map_id: number | null;
  name: string;
  lineup_instructions: string;
  image_url: string | null;
  difficulty: DifficultyKey;
  side: SideKey | 'both';
  line: LineKey | 'mid' | 'plant_a' | 'plant_b' | 'all' | null;
  grenade_type: GrenadeTypeKey;
}

export type SmokeWithMap = SmokeRecord & {
  map_name: MapKey;
  map_display_name: string;
};

export interface SmokeMediaRecord {
  id: number;
  smoke_id: number;
  file_id: string;
  media_type: MediaType;
  caption: string | null;
  created_at: string;
}

export interface SuggestedSmokeMediaRecord {
  id: number;
  suggested_smoke_id: number;
  file_id: string;
  media_type: MediaType;
  caption: string | null;
  created_at: string;
}

export type SuggestedSmokeWithMap = SuggestedSmoke & {
  map_name: MapKey;
  map_display_name: string;
};

export type FilterValue<T extends string> = T;

export interface FilterParams {
  mapName: FilterValue<MapKey>;
  grenadeType: FilterValue<GrenadeTypeKey>;
  side: FilterValue<SideKey>;
  line: FilterValue<LineKey>;
  difficulty: FilterValue<DifficultyKey>;
}

export interface FilterState {
  chatId: number;
  smokes: SmokeWithMap[];
  filterParams: FilterParams;
}

export type SuggestionStep =
  | 'select_map'
  | 'select_side'
  | 'select_line'
  | 'select_grenade_type'
  | 'select_difficulty'
  | 'enter_name'
  | 'enter_instructions'
  | 'upload_media';

export interface SuggestState {
  chatId: number;
  userId: number;
  username: string;
  step: SuggestionStep;
  filterParams: FilterParams;
  name?: string;
  lineup_instructions?: string;
}

export interface SuggestedMediaFile {
  type: MediaType;
  fileId: string;
  caption?: string | null;
}

export interface NewSmokeInput {
  name: string;
  lineup_instructions: string;
  imageUrl?: string | null;
  difficulty: DifficultyKey;
  side: SideKey | 'both';
  line?: LineKey
    | 'mid'
    | 'plant_a'
    | 'plant_b'
    | 'all'
    | null;
  grenadeType: GrenadeTypeKey;
}

export interface SuggestedSmokeInput {
  name: string;
  lineup_instructions: string;
  difficulty: DifficultyKey;
  side: SideKey | 'both';
  line?: LineKey | 'mid' | 'plant_a' | 'plant_b' | 'all' | null;
  grenadeType: GrenadeTypeKey;
  imageUrl?: string | null;
}

export type AdminAction = AdminActionKey;

export type RealMapKey = Exclude<MapKey, 'all'>;

export interface MapRecord {
  id: number;
  name: RealMapKey;
  display_name: string;
}

// Reference table records
export interface SideRecord {
  id: number;
  name: SideKey;
  display_name: string;
}

export interface DifficultyRecord {
  id: number;
  name: DifficultyKey;
  display_name: string;
}

export interface LineRecord {
  id: number;
  name: LineKey;
  display_name: string;
}

export interface GrenadeTypeRecord {
  id: number;
  name: GrenadeTypeKey;
  display_name: string;
}

// Updated SmokeRecord with foreign keys (internal DB structure)
export interface SmokeRecordDB {
  id: number;
  name: string;
  display_name: string | null;
  map_id: number;
  difficulty_id: number;
  side_id: number;
  line_id: number | null;
  grenade_type_id: number;
  lineup_instructions: string;
  image_url: string | null;
  created_at: string;
}

// Public-facing SmokeRecord (with string keys for compatibility)
export interface SmokeRecord {
  id: number;
  map_id: number | null;
  name: string;
  lineup_instructions: string;
  image_url: string | null;
  difficulty: DifficultyKey;
  side: SideKey | 'both';
  line: LineKey | 'mid' | 'plant_a' | 'plant_b' | 'all' | null;
  grenade_type: GrenadeTypeKey;
}

export type AddSmokeStep = 'name' | 'instructions' | 'image' | null;

export interface AddSmokeState {
  chatId: number;
  maps: MapRecord[];
  selectedMap?: MapRecord;
  side?: SideKey | 'all';
  line?: LineKey | 'all';
  grenadeType?: GrenadeTypeKey | 'all';
  difficulty?: DifficultyKey | 'all';
  name?: string;
  lineup_instructions?: string;
  step: AddSmokeStep;
}

export type DeleteSmokeStep = 'select_map' | 'select_smoke' | 'confirm_delete';

export interface DeleteSmokeState {
  chatId: number;
  maps: MapRecord[];
  selectedMap?: MapRecord;
  selectedMapLabel?: string;
  smokes?: SmokeWithMap[];
  selectedSmoke?: SmokeWithMap;
  step: DeleteSmokeStep;
}

export interface MediaGroupState {
  chatId: number;
  mediaGroupId: string;
  files: SuggestedMediaFile[];
  expectedCount: number;
  receivedCount: number;
}