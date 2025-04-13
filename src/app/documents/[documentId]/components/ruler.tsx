/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";
import { Marker } from "./maker";
import { useMutation, useStorage } from "@liveblocks/react";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "@/lib/margin";

const markers = Array.from({ length: 83 }, (_, index) => index); //83个刻度
export const Ruler = () => {
  const leftMargin =
    useStorage((root: any) => {
      return root.leftMargin;
    }) ?? LEFT_MARGIN_DEFAULT;

  const setLeftMargin = useMutation(({ storage }, position: number) => {
    (storage as any).set("leftMargin", position);
  }, []);

  const rightMargin =
    useStorage((root: any) => {
      return root.rightMargin;
    }) ?? RIGHT_MARGIN_DEFAULT;

  const setRightMargin = useMutation(({ storage }, position: number) => {
    (storage as any).set("rightMargin", position);
  }, []);

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  // 鼠标按下事件（启动拖拽）
  const handleMouseDownLeft = () => {
    setIsDraggingLeft(true); // 设置左标记拖拽状态
  };
  const handleMouseDownRight = () => {
    setIsDraggingRight(true); // 设置右标记拖拽状态
  };

  // 鼠标移动事件（拖拽 实时计算）
  const handleMouseMove = (e: React.MouseEvent) => {
    // 定义常量
    const PAGE_WIDTH = 816; // 对应标准A4纸的像素宽度（21cm * 96dpi）
    const MINIMUM_SPACE = 50; // 左右边距之间必须保持的最小间隔
    // 仅在拖拽状态且标尺容器存在时执行
    if ((isDraggingLeft || isDraggingRight) && rulerRef.current) {
      // 获取标尺容器元素
      const container = rulerRef.current.querySelector("#ruler-container");
      if (container) {
        // 获取容器的位置信息
        const containerRect = container.getBoundingClientRect();
        // 计算鼠标在容器内的相对水平位置
        // e.clientX - containerRect.left = 鼠标相对于容器左边缘的位置
        const relativeX = e.clientX - containerRect.left;

        // 确保位置值在0到PAGE_WIDTH之间（防止越界）
        const rawPosition = Math.max(0, Math.min(relativeX, PAGE_WIDTH));

        // 左标记拖拽处理流程
        if (isDraggingLeft) {
          // 计算最大允许位置 = 总宽度 - 当前右边距 - 最小间隔
          // 示例：当右边距为200px时，左标记最多可移动到 816-200-50=566px
          const maxLeftPosition = PAGE_WIDTH - rightMargin - MINIMUM_SPACE;

          // 将实际鼠标位置与最大允许位置取较小值
          // 示例：若鼠标在600px位置，则取566px；若在500px位置，则保留500px
          const newLeftPosition = Math.min(rawPosition, maxLeftPosition);

          // 根据拖拽持续触发重新渲染
          setLeftMargin(newLeftPosition);
        }
        // 右标记拖拽处理流程
        else if (isDraggingRight) {
          // 计算最小允许位置 = 总宽度 - (当前左边距 + 最小间隔)
          // 示例：当左边距为300px时，右标记至少需要留在 816-(300+50)=466px 位置
          const minRightPosition = PAGE_WIDTH - (leftMargin + MINIMUM_SPACE);
          // 将鼠标位置转换为右边距值（从右边缘计算）
          // 示例：鼠标在700px时，右边距为816-700=116px
          const newRightPosition = Math.max(PAGE_WIDTH - rawPosition, 0);
          // 双重约束：既要≥0，也要≥最小允许位置
          // 示例：若计算得116px，但最小允许是466px，则最终取466px
          const constrainedRightPosition = Math.min(
            newRightPosition,
            minRightPosition
          );
          // 根据拖拽持续触发重新渲染
          setRightMargin(constrainedRightPosition);
        }
      }
    }
  };
  const handleMouseUp = () => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  };

  const handleLeftDoubleClick = () => {
    setLeftMargin(LEFT_MARGIN_DEFAULT);
  };
  const handleRightDoubleClick = () => {
    setRightMargin(RIGHT_MARGIN_DEFAULT);
  };

  return (
    <div className="ruler-container">
      <div
        ref={rulerRef}
        onMouseMove={handleMouseMove} // 鼠标移动事件（拖拽）
        onMouseUp={handleMouseUp} // 鼠标松开事件（停止拖拽）
        onMouseLeave={handleMouseUp} // 鼠标离开事件（停止拖拽）
        className="w-[816px] mx-auto h-6 border-b border-gray-300 flex items-end relative select-none print:hidden mb-1"
      >
        <div id="ruler-container" className="w-full h-full mx-auto relative">
          <Marker
            position={leftMargin}
            isLeft={true}
            isDragging={isDraggingLeft}
            onMouseDown={handleMouseDownLeft}
            onDoubleClick={handleLeftDoubleClick}
          />
          <Marker
            position={rightMargin}
            isLeft={false}
            isDragging={isDraggingRight}
            onMouseDown={handleMouseDownRight}
            onDoubleClick={handleRightDoubleClick}
          />
          <div className="absolute inset-x-0 bottom-0 h-full">
            <div className="relative h-full w-[816px]">
              {markers.map((marker) => {
                const position = (marker * 816) / 82;
                return (
                  <div
                    key={marker}
                    className="absolute bottom-0"
                    style={{ left: `${position}px` }}
                  >
                    {/* 主刻度（每1cm）：显示最高刻度线和数字 */}
                    {marker % 10 === 0 && (
                      <>
                        <div className="absolute bottom-0 w-[1px] h-2 bg-neutral-500" />
                        <span className="absolute bottom-2 text-[8px] text-neutral-500 transform -translate-x-1/2">
                          {marker / 10 + 1}
                        </span>
                      </>
                    )}
                    
                    {/* 中等刻度（每0.5cm）：显示中等高度刻度线 */}
                    {marker % 5 === 0 && marker % 10 !== 0 && (
                      <div className="absolute bottom-0 w-[1px] h-1.5 bg-neutral-500" />
                    )}
                    
                    {/* 小刻度（每0.1cm）：显示最矮刻度线 */}
                    {marker % 5 !== 0 && (
                      <div className="absolute bottom-0 w-[1px] h-1 bg-neutral-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
