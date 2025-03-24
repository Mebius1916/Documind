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
import { useHydration } from "@/hooks/useHydration";

const AiChat = dynamic(() => import("./components/aiChat"), {
  loading: () => {
    const { fallbackValue } = useHydration({ 
      fallback: <FullscreenLoader label="AI Assistant Loading..."/> 
    });
    return fallbackValue as React.ReactElement;
  },
  ssr: false
});

const Page = () => {
  const [dialog, setDialog] = useState(false);
  const [search] = useSearchParams("search");
  const { results, status, loadMore } = usePaginatedQuery(
    api.documents.get,
    { search },
    { initialNumItems: 5 }
  );
  const closeDialog = () => {
    setDialog(false);
  };

  const aiDialog = () => {
    setDialog(true);
  };

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
      {dialog && <AiChat closeDialog={closeDialog} />}
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
