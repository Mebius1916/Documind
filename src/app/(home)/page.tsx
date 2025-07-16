"use client";
import React, {  useState } from "react";
import Navbar from "./components/narbar";
import SearchInput from "./components/search-input";
import { TemplateGallery } from "./components/templates-gallery";
import DocumentsTable from "./components/documents-table";
import { useSearchParams } from "@/hooks/use-search-params";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import dynamic from "next/dynamic";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import Image from "next/image";
import { ClientOnly } from "@/components/client-only";
import { useTracking, usePageTracking } from "@/hooks/use-tracking";

const AiChat = dynamic(() => import("./components/aiChat"), {
  loading: () => <FullscreenLoader label="AI Assistant Loading..."/>, // 加载时显示的内容
  ssr: false, // 关闭服务器端渲染
});

const Page = () => {
  // 🎯 添加页面访问追踪
  usePageTracking('home');
  const { trackUser, trackSearch } = useTracking();
  
  const [dialog, setDialog] = useState(false);
  const [search] = useSearchParams("search");
  const { results, status, loadMore } = usePaginatedQuery(
    api.documents.get,
    { search },
    { initialNumItems: 5 }
  );
  
  const closeDialog = () => {
    // 🎯 追踪AI对话框关闭
    trackUser('click', 'ai_dialog_close');
    setDialog(false);
  };

  const aiDialog = () => {
    // 🎯 追踪AI对话框打开
    trackUser('click', 'ai_dialog_open', {
      source: 'home_page_fab'
    });
    setDialog(true);
  };

  // 🎯 追踪搜索行为
  React.useEffect(() => {
    if (search && search.trim()) {
      trackSearch(search, results?.length || 0, null, {
        source: 'home_search',
        hasResults: (results?.length || 0) > 0
      });
    }
  }, [search, results?.length, trackSearch]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 -z-10">
        <Image
          src="/bg.png"
          alt="Background"
          fill
          priority
          quality={75}
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="fixed top-0 left-0 right-0 z-10 h-16">
        <Navbar />
      </div>
      
      {/* 使用 ClientOnly 包装 AI 聊天对话框 */}
      <ClientOnly>
        {dialog && <AiChat closeDialog={closeDialog} />}
      </ClientOnly>
      
      <div className="mt-10">
        <SearchInput dialog={aiDialog} />
        <TemplateGallery />
        <DocumentsTable
          documents={results}
          loadMore={loadMore}
          status={status}
        />
      </div>
    </div>
  );
};

export default Page;
