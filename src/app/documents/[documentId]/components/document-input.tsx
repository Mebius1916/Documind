"use client";
import { useMutation } from "convex/react";
import { useRef, useState, useTransition, useCallback, Suspense } from "react";
import { useDebounce } from "@/hooks/use-debounce";

import { toast } from "sonner";

import { useStatus } from "@liveblocks/react";
import { Cloud, CloudOff, LoaderIcon } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useTracking } from "@/hooks/use-tracking";

interface DocumentInputProps {
  title: string;
  id: Id<"documents">;
}

export const DocumentInput = ({ title, id }: DocumentInputProps) => {
  const status = useStatus();
  const [value, setValue] = useState(title);
  //低优先级
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // 🎯 添加埋点追踪
  const { trackDocument, trackUser } = useTracking();
  const editStartTime = useRef<number>();

  const inputRef = useRef<HTMLInputElement>(null);
  const mutate = useMutation(api.documents.updateById);

  const debouncedUpdate = useDebounce((newValue: string) => {
    if (newValue === title) return;
    
    // 🎯 追踪文档标题更新
    const editDuration = editStartTime.current ? Date.now() - editStartTime.current : 0;
    trackDocument('save', id, {
      action: 'update_title',
      oldTitle: title,
      newTitle: newValue,
      titleLength: newValue.length,
      editDuration,
      saveType: 'auto',
      timestamp: Date.now()
    });
    
    startTransition(() => {
      mutate({ id, title: newValue })
        .then(() => {
          toast.success("Document updated");
          // 🎯 追踪保存成功
          trackDocument('save', id, {
            action: 'title_saved_success',
            title: newValue,
            timestamp: Date.now()
          });
        })
        .catch(() => {
          toast.error("Something went wrong");
          // 🎯 追踪保存失败
          trackDocument('save', id, {
            action: 'title_save_failed',
            title: newValue,
            error: 'mutation_failed',
            timestamp: Date.now()
          });
        });
    });
  }, 300);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // 🎯 追踪编辑开始
    if (!editStartTime.current) {
      editStartTime.current = Date.now();
      trackDocument('edit', id, {
        action: 'start_title_edit',
        originalTitle: title,
        timestamp: editStartTime.current
      });
    }
    
    debouncedUpdate(newValue);
  }, [debouncedUpdate, title, id, trackDocument]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 🎯 追踪手动提交
    trackUser('action', 'manual_title_submit', {
      documentId: id,
      title: value,
      timestamp: Date.now()
    });
    
    startTransition(() => {
      mutate({ id, title: value })
        .then(() => {
          toast.success("Document updated");
          // 🎯 追踪手动提交成功
          trackDocument('save', id, {
            action: 'manual_title_submit_success',
            title: value,
            timestamp: Date.now()
          });
        })
        .catch(() => {
          toast.error("Something went wrong");
          // 🎯 追踪手动提交失败
          trackDocument('save', id, {
            action: 'manual_title_submit_failed',
            title: value,
            error: 'manual_mutation_failed',
            timestamp: Date.now()
          });
        });
    });
  };

  // 🎯 追踪编辑状态变化
  const handleFocus = useCallback(() => {
    setIsEditing(true);
    editStartTime.current = Date.now();
    
    trackDocument('edit', id, {
      action: 'focus_title_input',
      title: value,
      timestamp: Date.now()
    });
  }, [id, value, trackDocument]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    
    if (editStartTime.current) {
      const editDuration = Date.now() - editStartTime.current;
      trackDocument('edit', id, {
        action: 'blur_title_input',
        title: value,
        editDuration,
        timestamp: Date.now()
      });
      editStartTime.current = undefined;
    }
  }, [id, value, trackDocument]);

  const showLoader =
    isPending || status === "connecting" || status === "reconnecting";

  const showError = status === "disconnected";

  return (
    <div className="flex items-center gap-2">
      {/* 状态指示器 */}
      <div className="flex items-center">
        {showError && <CloudOff className="size-4 text-red-500" />}
        {showLoader && <LoaderIcon className="size-4 animate-spin text-blue-500" />}
        {!showError && !showLoader && <Cloud className="size-4 text-green-500" />}
      </div>

      {/* 文档标题输入框 */}
      <form onSubmit={handleSubmit} className="flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="无标题文档"
          className="text-lg font-semibold px-3 py-1 bg-transparent truncate max-w-[400px] text-gray-800 focus:outline-none focus:ring-0 border-none"
          disabled={isPending}
        />
      </form>
      
      {/* 编辑状态提示 */}
      {isEditing && (
        <span className="text-xs text-gray-500">
          正在编辑...
        </span>
      )}
    </div>
  );
};
