"use client";
import { api } from "../../../../../convex/_generated/api";
import { Toolbar } from "./toolbar";
import { Navbar } from "./narbar";
import { Room } from "./room";
import {
  Preloaded,
  useMutation,
  usePreloadedQuery,
  useQuery,
} from "convex/react";
import { Ruler } from "./ruler";
import { useState } from "react";
import ChatDialog from "@/app/ai-assistant/page";
import Image from "next/image";
import { Ellipsis, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Editor = dynamic(() => import("./editor").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <Skeleton className="w-[816px] min-h-[1054px] mx-auto" />
});
interface DocumentProps {
  preloadedDocument: Preloaded<typeof api.documents.getById>;
  currentUser: {
    name: string | null | undefined;
    imageUrl?: string | null | undefined;
  };
}

export const Document = React.memo(
  ({ preloadedDocument, currentUser }: DocumentProps) => {
    const document = usePreloadedQuery(preloadedDocument);
    // console.log(document);
    const [dialog, setDialog] = useState(false);
    const [chat, setChat] = useState(false);
    const [newMessage, setNewMessage] = useState("");

    // 获取聊天消息
    const messages = useQuery(api.chat.getRoomMessages, {
      organizationId: document.organizationId || "", // 使用文档的organizationId作为房间ID
    });
    // console.log(messages);
    // 发送消息mutation
    const sendMessage = useMutation(api.chat.sendMessage);

    const handleSendMessage = async () => {
      if (!newMessage.trim()) return;
      await sendMessage({
        content: newMessage,
        organizationId: document.organizationId || "",
        name: currentUser.name || "",
        imageUrl: currentUser.imageUrl || "",
      });
      setNewMessage("");
    };

    return (
      <Room>
        <div className="min-h-screen bg-blue-50 ">
          <div className="flex flex-col fixed top-0 left-0 right-0 z-10 bg-blue-50">
            <Navbar data={document} />
            <Toolbar />
            <Ruler />
          </div>
          <div className="h-[100px]" />
          <div className="print:pt-0 flex">
            <Editor initialContent={document.initialContent} />
            <div className="fixed right-2 bottom-4">
              <button
                onClick={() => setDialog(true)}
                className="cursor-pointer bg-white shadow-lg h-32 mr-4 w-12 rounded-full flex flex-col items-center justify-center"
              >
                <Image
                  src="/logo3.png"
                  alt="Logo"
                  width={30}
                  height={30}
                  className="mb-1"
                />
                AI
                <br />
                助
                <br />手
              </button>
              <button
                onClick={() => setChat(true)}
                className="bg-white w-12 h-12 rounded-full mt-3 flex items-center justify-center"
              >
                <MessagesSquare size={20} color="#E4D1FF" />
              </button>
              <Link
                href="https://github.com/Mebius1916"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-white w-12 h-12 rounded-full mt-3 flex items-center justify-center">
                  <Ellipsis size={20} color="#E4D1FF" />
                </button>
              </Link>
            </div>
            {dialog && (
              <div
                className="fixed flex flex-col w-[406px] 
            h-[calc(100vh_-_100px_-_20px)] bg-gradient-to-br from-blue-50 
            via-slate-50 to-blue-50  right-0 top-[104px] mr-2 z-10
            shadow-lg rounded-md print:hidden border-2 border-blue-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="absolute right-2 top-2 cursor-pointer"
                  onClick={() => setDialog(false)}
                >
                  <path
                    d="M11.1153 4.16924L11.8303 4.88423C12.0559 5.10988 12.0559 5.47573 11.8303 5.70137L9.53141 7.99986L11.8303 10.2986C12.0559 10.5243 12.0559 10.8901 11.8303 11.1158L11.1153 11.8308C10.8897 12.0564 10.5238 12.0564 10.2982 11.8308L7.99878 9.53105L5.70174 11.8299C5.47609 12.0556 5.11025 12.0556 4.8846 11.8299L4.1696 11.1149C3.94395 10.8893 3.94395 10.5234 4.1696 10.2978L6.46615 7.99986L4.1696 5.70221C3.94395 5.47656 3.94395 5.11072 4.1696 4.88507L4.8846 4.17007C5.11025 3.94442 5.47609 3.94442 5.70174 4.17007L7.99878 6.46723L10.2982 4.16924C10.5238 3.94359 10.8897 3.94359 11.1153 4.16924Z"
                    fill="#333940"
                  ></path>
                </svg>
                <ChatDialog initialContent="Lassistant" />
              </div>
            )}
            {chat && (
              <div
                className="fixed flex flex-col w-[406px] h-[calc(100vh_-_100px_-_20px)] bg-gradient-to-br 
              from-blue-50 via-slate-50 to-blue-50 left-0 top-[104px] ml-2 z-10 shadow-lg rounded-md 
              print:hidden border-2 border-blue-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="absolute left-2 top-2 cursor-pointer"
                  onClick={() => setChat(false)}
                >
                  <path
                    d="M11.1153 4.16924L11.8303 4.88423C12.0559 5.10988 12.0559 5.47573 11.8303 5.70137L9.53141 7.99986L11.8303 10.2986C12.0559 10.5243 12.0559 10.8901 11.8303 11.1158L11.1153 11.8308C10.8897 12.0564 10.5238 12.0564 10.2982 11.8308L7.99878 9.53105L5.70174 11.8299C5.47609 12.0556 5.11025 12.0556 4.8846 11.8299L4.1696 11.1149C3.94395 10.8893 3.94395 10.5234 4.1696 10.2978L6.46615 7.99986L4.1696 5.70221C3.94395 5.47656 3.94395 5.11072 4.1696 4.88507L4.8846 4.17007C5.11025 3.94442 5.47609 3.94442 5.70174 4.17007L7.99878 6.46723L10.2982 4.16924C10.5238 3.94359 10.8897 3.94359 11.1153 4.16924Z"
                    fill="#333940"
                  ></path>
                </svg>
                <div className="flex-1 overflow-y-auto mb-2 space-y-2 mt-6 overflow-auto">
                  {messages?.map((message) => (
                    <div
                      key={message._id}
                      className="p-2 rounded-lg max-w-[95%]  mx-auto "
                    >
                      <div className="flex items-center">
                        <div className="flex items-center flex-col w-12">
                          <p className="text-[8px] text-gray-600 max-w-[66.5px] truncate px-1">
                            {message.name}
                          </p>
                          <Image
                            src={message.imageUrl || ""}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        </div>

                        <div className="flex-1 min-w-0 max-w-[82%] mx-auto rounded-lg overflow-auto bg-white mt-2">
                          <div className=" h-12 p-1 break-words whitespace-pre-wrap relative">
                            <p className="text-gray-800 text-sm px-1 ">
                              {message.content}
                            </p>
                            <span className="text-[12px] text-gray-400 right-1 bottom-1 absolute">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 消息输入框 */}
                <div className="flex justify-center items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="输入消息..."
                    className="flex-1 p-2 rounded-full border-none focus:outline-none focus:ring-0 mx-2 mb-2"
                  />
                  <button
                    onClick={handleSendMessage}
                    className=" bg-white rounded-full  w-10 h-10 flex items-center justify-center mr-2 mb-2"
                  >
                    <Send color="#5438E4" size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Room>
    );
  }
);

Document.displayName = 'Document';
