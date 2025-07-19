import { Metadata } from "next";

export const metadata: Metadata = {
  title: "江耳助手",
  description: "与AI进行对话，获取智能回答和帮助，支持多种AI模型",
  keywords: ["AI助手", "聊天机器人", "智能对话", "AI模型"],
  openGraph: {
    title: "江耳助手",
    description: "与AI进行对话，获取智能回答和帮助，支持多种AI模型",
    type: "website",
  },
};

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full w-full flex-col overflow-hidden">
      {children}
    </section>
  );
}
