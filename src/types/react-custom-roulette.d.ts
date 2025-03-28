declare module 'react-custom-roulette' {
  export interface RouletteData {
    option: string;
    style?: {
      backgroundColor?: string;
      textColor?: string;
    };
  }

  export interface RouletteProps {
    mustStartSpinning: boolean;
    prizeNumber: number;
    data: RouletteData[];
    backgroundColors?: string[];
    textColors?: string[];
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: string;
    outerBorderColor?: string;
    outerBorderWidth?: number;
    innerRadius?: number;
    innerBorderColor?: string;
    innerBorderWidth?: number;
    radiusLineColor?: string;
    radiusLineWidth?: number;
    spinDuration?: number;
    startingOptionIndex?: number;
    perpendicularText?: boolean;
    textDistance?: number;
    onStopSpinning?: () => void;
  }

  export const Wheel: React.FC<RouletteProps>;
}
