"use client";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isFetching: boolean;
  initialContent?: string;
  isPending?: boolean;
}

export const ChatInput = ({
  input,
  setInput,
  handleSend,
  isFetching,
  initialContent,
}: ChatInputProps) => {
  return (
    <div className={`flex w-full ${initialContent!=="Lassistant"?"max-w-4xl":"max-w-[calc(100%-2rem)]"} mb-4 m-auto relative`}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        className="flex-1 h-12 p-4 pr-16 border border-gray-300 rounded-full focus:outline-none"
        placeholder="给AI发送消息...."
      />
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <Button
          onClick={handleSend}
          disabled={isFetching}
          className={cn(
            "h-10 w-10 p-2 rounded-full hover:bg-transparent bg-transparent shadow-none",
            isFetching && "opacity-50 cursor-not-allowed"
          )}
        >
          <Send color="#5438E4" size={60} />
        </Button>
      </div>
    </div>
  );
};
