"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useSearchParams } from "@/hooks/use-search-params";
import { useHydration } from "@/hooks/use-hydration";

interface Props {
  dialog: () => void;
}

export const SearchInput = ({ dialog }: Props) => {
  const { isHydrated } = useHydration();
  const [search, setSearch] = useSearchParams("search");
  const [value, setValue] = useState(search || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue("");
    inputRef.current?.blur(); //移除输入框的焦点
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(value);
    inputRef.current?.blur();
  };

  const askAi = () => {
    setSearch(value);
    dialog();
  };

  // 在水合完成前显示简化版本
  if (!isHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center mt-6">
        <div className="relative max-w-[720px] w-[75%]">
          <div className="md:text-base px-6 w-full border-none bg-[#F0F4F8] h-[48px] rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <span className="flex items-center text-lg justify-center mt-15 text-[#9D55F9] text-opacity-80">
        ✨ Search <span className="mx-3 opacity-50 ">│</span> 💭 Ask AI
      </span>
      <div className="flex-1 flex items-center justify-center mt-6">
        <form className="relative max-w-[720px] w-[75%]" onSubmit={handleSubmit}>
          <Input
            value={value}
            onChange={handleChange}
            ref={inputRef}
            placeholder="Search | Ask AI"
            spellCheck="false"
            className="md:text-base px-6 w-full border-none 
          focus-visible:shadow-[0+1px+1px+0+rgba65,69,73.3),0_1px_3px_1px_rgba(65,69,73,.15)] 
          bg-[#F0F4F8] h-[48px] focus-visible:ring-0 focus:bg-white"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="[&_svg]:size-5 rounded-full mr-1"
              >
                <XIcon />
              </Button>
            )}
            <Button
              size="icon"
              type="button"
              onClick={askAi}
              className="size-6 hover:opacity-90 bg-gradient-to-r from-purple-300 to-pink-300 mr-1"
            >
              <span className="text-sm ">AI</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90"
            >
              <div className="flex items-center gap-1">
                <SearchIcon className="text-white size-5" />
                <span className="text-white">搜索</span>
              </div>
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default SearchInput;
