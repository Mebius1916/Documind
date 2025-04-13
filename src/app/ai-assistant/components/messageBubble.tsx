import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import Image from "next/image";
import React from "react";

export const AssistantMessage = React.memo(({
  content,
  initialContent,
}: {
  content: string;
  initialContent?: string;
}) => (
  <div
    className={`flex gap-4 relative ${initialContent !== "Lassistant" ? "ml-10" : "ml-0"}`}
  >
    {initialContent !== "Lassistant" && (
      <div className="flex items-center justify-center absolute w-12 h-12 -ml-10 bg-white rounded-full border-2 border-blue-200">
        <Image
          src="/deepseek-color.svg"
          alt="logo"
          width={32} // 原始图片宽度（像素）
          height={32} // 原始图片高度（像素）
          className="h-8 w-8"
          unoptimized // SVG 建议关闭优化
        />
      </div>
    )}
    <div className="px-4 py-4 w-full max-w-[calc(100%-1rem)] bg-white rounded-lg shadow-md mx-3 my-3">
      <ReactMarkdown
        components={{
          // 代码块处理（多行代码 vs 内联代码）
          code({
            inline,
            className,
            children,
            ...props
          }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
            props?: React.HTMLProps<HTMLElement>;
          }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              // 多行代码块：使用语法高亮组件
              <SyntaxHighlighter
                style={materialDark} // 使用material主题的暗色方案
                language={match[1]} // 解析代码语言（如js/python等）
                PreTag="div"
                customStyle={{
                  // 自定义容器样式
                  background: "#292D3E",
                  borderRadius: "0.5rem",
                  margin: "1rem 0",
                  padding: "1.25rem",
                }}
                codeTagProps={{
                  // 代码字体等
                  style: { fontFamily: "Fira Code, monospace" },
                }}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              // 内联代码块
              <code
                className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-100 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          p: (props: React.HTMLProps<HTMLParagraphElement>) => (
            <p className="mb-3 leading-relaxed text-gray-800" {...props} />
          ),
          ul: (props: React.HTMLProps<HTMLUListElement>) => (
            <ul className="list-disc pl-6 mb-3 space-y-1.5" {...props} />
          ),
          ol: (props: React.HTMLProps<HTMLOListElement> & React.OlHTMLAttributes<HTMLOListElement>) => (
            <ol className="list-decimal pl-6 mb-3 space-y-1.5" {...props} />
          ),
          blockquote: (props: React.HTMLProps<HTMLQuoteElement>) => (
            <blockquote
              className="border-l-4 border-blue-500 bg-blue-50 text-gray-700 px-4 my-2 rounded-r-lg"
              {...props}
            />
          ),
          a: (props: React.HTMLProps<HTMLAnchorElement>) => (
            <a className="text-blue-600 hover:underline" {...props} />
          ),
          h1: (props: React.HTMLProps<HTMLHeadingElement>) => (
            <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
          ),
          h2: (props: React.HTMLProps<HTMLHeadingElement>) => (
            <h2 className="text-xl font-semibold mt-4 mb-2" {...props} />
          ),
          table: (props: React.HTMLProps<HTMLTableElement>) => (
            <table className="w-full border-collapse my-4" {...props} />
          ),
          th: (props: React.HTMLProps<HTMLTableHeaderCellElement>) => (
            <th className="border-b-2 p-2 text-left bg-gray-50" {...props} />
          ),
          td: (props: React.HTMLProps<HTMLTableCellElement>) => (
            <td className="border-b p-2" {...props} />
          ),
        }}
        className="text-gray-800 leading-relaxed"
      >
        {content}
      </ReactMarkdown>
    </div>
  </div>
));

// 添加显示名称
AssistantMessage.displayName = 'AssistantMessage';

export const UserMessage = React.memo(({ content }: { content: string }) => (
  <div className="flex justify-end">
    <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-md max-w-[calc(100%-3rem)]">
      {content}
    </div>
  </div>
));

// 添加显示名称
UserMessage.displayName = 'UserMessage';
