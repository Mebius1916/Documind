import Link from "next/link";
import Image from "next/image";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between h-full w-full p-4">
      <div className="flex gap-3 items-center shrink-0 pr-6 ml-4">
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={150} height={150} />
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
