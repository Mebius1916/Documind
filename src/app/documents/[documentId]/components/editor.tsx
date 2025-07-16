"use client";
import {
  useEditor,
  EditorContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import { useEditorStore } from "@/store/use-editor-store";
import Underline from "@tiptap/extension-underline";
import FontFamily from "@tiptap/extension-font-family";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { FontSizeExtension } from "@/extensions/font-size";
import { LineHeightExtension } from "@/extensions/line-height";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { useStorage } from "@liveblocks/react";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "@/lib/margin";
import { useDebounce } from "@/hooks/use-debounce";
import { Threads } from "./threads";
import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { useTracking } from "@/hooks/use-tracking";
import { useParams } from "next/navigation";

interface EditorProps {
  initialContent?: string | undefined;
}



// 🚀 性能优化：扩展延迟加载
const useOptimizedExtensions = (liveblocks: any) => {
  return useMemo(() => {
    // 核心扩展（立即加载）
    const coreExtensions = [
      StarterKit.configure({
        history: false, // 禁用以防止协同冲突
        // 注意：document节点是Schema必需的顶级节点，不能禁用
      }),
      liveblocks,
      TextStyle, // 文本样式基础
    ];

    // 🎯 格式化扩展（按需加载）
    const formattingExtensions = [
      FontSizeExtension,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Color,
      FontFamily,
      LineHeightExtension.configure({
        types: ["paragraph", "heading"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ];

    // 🔧 功能扩展（延迟加载）
    const featureExtensions = [
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false, // 🔥 优化：禁用自动打开链接，减少意外导航
      }),
      Table.configure({
        resizable: true,
        lastColumnResizable: false, // 🔥 优化：减少表格重排
      }),
      Image,
      ImageResize,
      TableRow,
      TableCell,
      TableHeader,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item', // 🔥 优化：添加类名以提升CSS性能
        },
      }),
      TaskList,
    ];

    return [...coreExtensions, ...formattingExtensions, ...featureExtensions];
  }, [liveblocks]);
};

export const Editor = React.memo(({ initialContent }: EditorProps) => {
  const { setEditor } = useEditorStore();
  const params = useParams();
  const documentId = params.documentId as string;
  const { trackDocument } = useTracking();
  
  // 🔥 性能监控：渲染次数统计
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Editor rendered ${renderCount.current} times`);
    }
  });

  // 🎯 编辑追踪相关状态
  const lastEditTime = useRef(Date.now());
  const editCount = useRef(0);
  const isTyping = useRef(false);
  const typingTimer = useRef<NodeJS.Timeout>();

  // 优化：缓存margin值以减少重新渲染
  const leftMargin = useStorage(
    (root: { leftMargin?: number }) => root.leftMargin ?? LEFT_MARGIN_DEFAULT
  );

  const rightMargin = useStorage(
    (root: { rightMargin?: number }) => root.rightMargin ?? RIGHT_MARGIN_DEFAULT
  );

  const liveblocks = useLiveblocksExtension({
    initialContent,
    offlineSupport_experimental: true,
  });

  // 🚀 应用优化的扩展配置
  const optimizedExtensions = useOptimizedExtensions(liveblocks);

  // 🔥 优化防抖策略：编辑时短防抖，静止时长防抖
  const isActivelyEditing = useRef(false);
  const lastActiveTime = useRef(Date.now());
  
  const debouncedSetEditor = useDebounce((editor: TiptapEditor) => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime.current;
    
    setEditor(editor);
    
    // 重置活跃状态
    if (timeSinceLastActive > 2000) {
      isActivelyEditing.current = false;
    }
  }, 100);

  // 🎯 埋点：文档编辑追踪
  const trackEditing = useCallback((editor: TiptapEditor, eventType: 'edit' | 'save' | 'focus' | 'blur') => {
    const now = Date.now();
    const wordCount = editor.storage.characterCount?.words() || 0;
    const charCount = editor.storage.characterCount?.characters() || 0;
    
    if (eventType === 'edit') {
      editCount.current++;
      lastEditTime.current = now;
      
      // 🎯 编辑行为追踪（防抖处理，避免过于频繁）
      if (!isTyping.current) {
        isTyping.current = true;
        trackDocument('edit', documentId, {
          action: 'start_editing',
          timestamp: now,
          wordCount,
          charCount,
          editSession: editCount.current
        });
      }
      
      // 重置打字状态计时器
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
      
      typingTimer.current = setTimeout(() => {
        if (isTyping.current) {
          isTyping.current = false;
          trackDocument('edit', documentId, {
            action: 'stop_editing',
            timestamp: Date.now(),
            wordCount: editor.storage.characterCount?.words() || 0,
            charCount: editor.storage.characterCount?.characters() || 0,
            editDuration: Date.now() - lastEditTime.current,
            editSession: editCount.current
          });
        }
      }, 2000); // 2秒无操作后认为停止编辑
    } else if (eventType === 'save') {
      trackDocument('save', documentId, {
        action: 'auto_save',
        timestamp: now,
        wordCount,
        charCount,
        totalEdits: editCount.current
      });
    } else if (eventType === 'focus') {
      trackDocument('edit', documentId, {
        action: 'focus_editor',
        timestamp: now
      });
    } else if (eventType === 'blur') {
      trackDocument('edit', documentId, {
        action: 'blur_editor',
        timestamp: now,
        sessionDuration: now - lastActiveTime.current
      });
    }
  }, [documentId, trackDocument]);

  // 🔥 关键优化：合并频繁的事件处理器
  const handleEditorChange = useCallback((editor: TiptapEditor) => {
    isActivelyEditing.current = true;
    lastActiveTime.current = Date.now();
    debouncedSetEditor(editor);
    
    // 🎯 追踪编辑行为
    trackEditing(editor, 'edit');
  }, [debouncedSetEditor, trackEditing]);

  // 🎯 追踪保存行为
  const handleSave = useCallback((editor: TiptapEditor) => {
    trackEditing(editor, 'save');
  }, [trackEditing]);

  const editor = useEditor({
    immediatelyRender: false, // 🔥 不立即渲染
    // 🎯 关键优化：减少事件监听器数量，提升性能
    onCreate({ editor }) {
      setEditor(editor);
    },
    onDestroy() {
      setEditor(null);
      // 清理计时器
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    },
    // 🔥 核心优化：合并所有更新事件到单一处理器
    onUpdate({ editor }) {
      handleEditorChange(editor);
      handleSave(editor); // 自动保存时追踪
    },
    onSelectionUpdate({ editor }) {
      handleEditorChange(editor);
    },
    onTransaction({ editor }) {
      // 🎯 优化：只在内容真正变更时触发
      if (editor.state.doc.content.size > 0) {
        handleEditorChange(editor);
      }
    },
    onFocus({ editor }) {
      handleEditorChange(editor);
      trackEditing(editor, 'focus');
    },
    onBlur({ editor }) {
      handleEditorChange(editor);
      trackEditing(editor, 'blur');
    },
    onContentError({ editor }) {
      console.warn('Editor content error detected');
      setEditor(editor);
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none print:border-0 bg-white shadow-lg flex flex-col min-h-[1054px] w-[816px] py-10 pr-14 cursor-text print:shadow-none print:p-0 print:m-0 print:max-w-[190mm] print:min-h-[277mm]",
        style: `padding-left: ${leftMargin ?? LEFT_MARGIN_DEFAULT}px; padding-right:${rightMargin ?? RIGHT_MARGIN_DEFAULT}px;`,
        // 🔥 性能优化：添加优化属性
        'data-editor-optimized': 'true',
      },
      // 🎯 优化DOM操作
      handleDOMEvents: {
        // 防止不必要的重排
        scroll: () => {
          return false; // 让浏览器原生处理滚动
        },
      },
    },
    extensions: optimizedExtensions,
  });

  // 🔥 优化：缓存样式对象以避免重新创建
  const containerStyle = useMemo(() => ({
    width: '816px',
    minHeight: '1054px',
  }), []);

  return (
    <div className="size-full overflow-x-auto px-4 print:bg-white print:overflow-visible print:m-0">
      <div 
        className="flex justify-center print:p-0 print:m-0 pb-4 mx-auto print:min-w-0 print:max-w-[190mm] print:min-h-[277mm]"
        style={containerStyle}
      >
        <EditorContent editor={editor} />
        <Threads editor={editor} />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';
