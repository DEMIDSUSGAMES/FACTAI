
export enum Difficulty {
  AGE_3_6 = '3-6 лет',
  AGE_7_12 = '7-12 лет',
  AGE_13_17 = '13-17 лет',
  AGE_18_PLUS = '18+ лет'
}

export interface Fact {
  text: string;
  isLie: boolean;
}

export interface Player {
  id: number;
  name: string;
  score: number;
}

export type GameState = 'MENU' | 'SETUP' | 'PLAYING' | 'SCORING' | 'WINNER';
