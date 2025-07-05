"use client";

import { useEditorStore } from "@/store/use-editor-store";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { EditorMenu } from "./menu";
import Image from "next/image";
import Link from "next/link";
import { Inbox } from "./inbox";
import { Avatars } from "./avatars";
import { useCallback } from "react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import React from "react";

interface NavbarProps {
  data: Doc<"documents">;
}

const DocumentInputAsync = dynamic(
  () => import('./document-input').then((mod) => mod.DocumentInput),
  {
    ssr: false,
    loading: () => <Skeleton className="h-7 w-36 rounded-md" />
  }
);

export const Navbar = React.memo(({ data }: NavbarProps) => {
  const router = useRouter();
  const { editor } = useEditorStore();
  const mutation = useMutation(api.documents.create);

  const onNewDocument = useCallback(() => {
    mutation({
      title: "Untitled document",
      initialContent: "",
    })
      .catch(() => {
        toast.error("Something went wrong");
      })
      .then((id) => {
        toast.success("Document created");
        router.push(`/documents/${id}`);
      });
  }, [mutation, router]);

  const insertTable = useCallback((rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols }).run();
  }, [editor]);

  Navbar.displayName = "Navbar";

  return (
    <div className="relative">
      <nav className="flex items-center justify-between shadow-lg w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100">
        <div className="flex gap-3 items-center shrink-0 ml-4">
          <Link href="/">
            <Image src="/logo2.png" alt="Logo" width={100} height={100} />
          </Link>
        </div>
        <div className="flex items-center gap-2 h-10 ml-2">
          <DocumentInputAsync title={data.title} id={data._id} />
        </div>
        <div className="ml-auto flex items-center gap-3 mr-4">
         <Avatars />
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              分析
            </Button>
          </Link>
          <Inbox />
          <OrganizationSwitcher
            afterCreateOrganizationUrl="/"
            afterLeaveOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            afterSelectPersonalUrl="/"
          />
          <UserButton />
        </div>
      </nav>
      <div className="absolute mt-2 hidden lg:block">
        <EditorMenu
          data={data}
          editor={editor}
          onNewDocument={onNewDocument}
          insertTable={insertTable}
        />
      </div>
    </div>
  );
});
