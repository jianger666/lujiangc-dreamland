declare module 'react-wheel-of-fortune' {
  export interface WheelOfFortuneProps {
    segments: { id: string; text: string; color?: string }[];
    segColors: string[];
    winningSegment: string;
    onFinished: (segmentId: string) => void;
    primaryColor?: string;
    contrastColor?: string;
    buttonText?: string;
    isOnlyOnce?: boolean;
    size?: number;
    upDuration?: number;
    downDuration?: number;
    fontFamily?: string;
    spinDuration?: number;
    disableInitialSpin?: boolean;
    startSpin?: boolean;
    onSpin?: () => void;
  }

  export const WheelOfFortune: React.FC<WheelOfFortuneProps>;
}
