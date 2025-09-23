export interface BriefRoom {
  id: string;
  name: string;
  area: number | '' | string;
}

export interface UploadedPlanInfo {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface BriefFormData {
  contacts: {
    phone: string;
    email: string;
    address: string;
  };
  housingType: 'новостройка' | 'вторичное жильё' | '';
  finishing: 'готовый ремонт' | 'вайтбокс' | 'бетон' | '';
  totalArea: number | '' | string;
  rooms: BriefRoom[];
  purpose: string;
  family: string;
  guests: string;
  pets: string;
  requirements: string;
  replanning: string;
  manufacturers: string;
  readyMade: string;
  styles: string[];
  customStyle: string;
  colorScheme: string;
  wallFinish: string;
  floorFinish: string;
  doors: string;
  other: string;
  dontWant: string;
  plan?: UploadedPlanInfo | null;
}
