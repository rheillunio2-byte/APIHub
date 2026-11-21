import type { CSSProperties, ReactNode } from "react";

export interface StackProps {
  cards?: ReactNode[];
  layout?: "fan" | "cascade" | "deck" | "pile";
  visible?: number;
  spread?: number;
  depth?: number;
  radius?: number;
  frame?: number;
  frameColor?: string;
  shadow?: boolean;
  tilt?: number;
  threshold?: number;
  speed?: number;
  sendToBackOnClick?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  onChange?: (index: number) => void;
  className?: string;
  style?: CSSProperties;
}
export default function Stack(props: StackProps): JSX.Element;
