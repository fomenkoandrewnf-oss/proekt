export type HousingType = 'новостройка' | 'вторичное жилье';
export type FinishType = 'готовый ремонт' | 'вайтбокс' | 'бетон';

export type RoomKind =
  | 'кухня-гостиная'
  | 'спальня'
  | 'детская'
  | 'кабинет'
  | 'санузел'
  | 'гардеробная'
  | 'кладовая'
  | 'прихожая'
  | 'лоджия/балкон'
  | 'ванная'
  | 'гостевой санузел';

export interface Room {
  id: string;
  kind: RoomKind;
  name?: string;
  area: number;
  wantRefs?: boolean;
  notes?: string;
}

export interface PlanInfo {
  fileId?: string;
  previewUrl?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  hasScale?: boolean;
  scaleNote?: string;
}

export type PriorityTag = 'уют' | 'комфорт' | 'практичность' | 'креатив' | 'роскошь';

export type StyleTag =
  | 'Mid Century'
  | 'Минимализм'
  | 'Лофт'
  | 'Арт-деко'
  | 'Современный'
  | 'Современная классика'
  | 'Джапанди';

export interface TZForm {
  contacts: { phone?: string; email?: string; address?: string };
  housingType: HousingType;
  finish: FinishType;
  totalArea?: number;
  plan?: PlanInfo | null;

  rooms: Room[];

  purpose: 'проживание' | 'аренда' | 'инвестиции';
  family?: string;
  guests?: string;
  pets?: string;
  allergies?: string;
  priorities?: PriorityTag[];

  requirements?: string;
  replanning?: { needed?: boolean; details?: string };
  preferredCountries?: string;
  readyVsCustom?: 'только готовые' | 'допускаем заказ';
  antiWants?: string;
  otherWishes?: string;
  budget?: '5–7 млн' | '7–10 млн' | '10+ млн';

  style: {
    tags: StyleTag[];
    extra?: string;
    colors?: string;
    walls?: string;
    floors?: string;
    doors?: string;
  };

  kitchen?: Record<string, unknown>;
  bathrooms?: Record<string, unknown>;
  storage?: string;
  lighting?: string;
  windows?: string;
  smartHome?: string;
}

export interface UploadedPlanRecord {
  id: string;
  filePath: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface RoomRefRequest {
  planFileId?: string;
  room: Pick<Room, 'kind' | 'area' | 'notes'> & { name?: string };
  style: Pick<TZForm['style'], 'tags' | 'extra' | 'colors'>;
  materials: { walls?: string; floors?: string; doors?: string };
  constraints: { housingType: HousingType; finish: FinishType; hasScale?: boolean; scaleNote?: string };
}
