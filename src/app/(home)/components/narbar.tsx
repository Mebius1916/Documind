import Link from "next/link";
import Image from "next/image";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between h-full w-full p-4">
      <div className="flex gap-3 items-center shrink-0 pr-6 ml-4">
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={150} height={150} />
        </Link>
      </div>
      
      {/* 中间导航菜单 */}
      <div className="flex items-center gap-4">
        <Link href="/ai-assistant">
          <Button variant="ghost" className="text-sm">
            AI 助手
          </Button>
        </Link>
        <Link href="/admin">
          <Button variant="ghost" className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            数据分析
          </Button>
        </Link>
      </div>
      
      <div className="flex items-center gap-3 mr-4" >
        <OrganizationSwitcher
          afterCreateOrganizationUrl="/"
          afterLeaveOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
          afterSelectPersonalUrl="/"
        />
        <UserButton />
      </div>
    </nav>
  );
};

export default Navbar;
