"use client";
// 导入必要的组件和类型
import { TableCell, TableRow } from "@/components/ui/table";
import { Building2Icon, CircleUserIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { DocumentMenu } from "./document-menu";
import { Doc } from "../../../../convex/_generated/dataModel";
import { navigate } from "@/lib/events";

// 定义组件的 Props 接口
interface DocumentRowProps {
  document: Doc<"documents">;
}

// 定义 DocumentRow 组件
export const DocumentRow = ({ document }: DocumentRowProps) => {
  const onRowClick = (id: string) => {
    navigate(`/documents/${id}`, { newTab: true }); // 使用事件总线导航
  };
  
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(document._id)}
    >
      <TableCell className="w-[50px]">
        <FileText className="size-6 fill-[#9D55F9]" />
      </TableCell>
      <TableCell className="font-medium md:w-[45%]">{document.title}</TableCell>
      <TableCell className="text-muted-foreground hidden md:flex items-center gap-2">
        {document.organizationId ? (
          <Building2Icon className="size-4" />
        ) : (
          <CircleUserIcon className="size-4" />
        )}
        {document.organizationId ? "Organization" : "Personal"}
      </TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell">
        {format(new Date(document._creationTime), "yyyy-MM-dd")}
      </TableCell>
      <TableCell className="flex justify-end">
        <DocumentMenu
          documentId={document._id}
          title={document.title}
        />
      </TableCell>
    </TableRow>
  );
};
