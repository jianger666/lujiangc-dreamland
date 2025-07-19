import { Message, StreamingMessage } from "@/types/ai-assistant";

export interface ItemData {
  messages: (Message | StreamingMessage | undefined)[];
  setSize: (index: number, size: number) => void;
  isRequesting: boolean;
  isGenerating: boolean;
}
