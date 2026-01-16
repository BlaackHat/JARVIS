
export interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  timestamp: Date;
  isCode?: boolean;
  image?: string;
  links?: { title: string; uri: string }[];
}

export interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
}

export enum AppState {
  IDLE = 'IDLE',
  WAKING = 'WAKING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}
