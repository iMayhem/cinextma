"use client";

import BackButton from "@/components/ui/button/BackButton";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/helpers";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { useWindowScroll } from "@mantine/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FiLogIn, FiClock, FiLogOut } from "react-icons/fi";
import FullscreenToggleButton from "../button/FullscreenToggleButton";
import SearchInput from "../input/SearchInput";
import ThemeSwitchDropdown from "../input/ThemeSwitchDropdown";
import BrandLogo from "../other/BrandLogo";

const TopNavbar = () => {
  const { user, openAuthModal, logout } = useAuth();
  const pathName = usePathname();
  const [{ y }] = useWindowScroll();
  const opacity = Math.min((y / 1000) * 5, 1);
  const hrefs = siteConfig.navItems.map((item) => item.href);
  const show = hrefs.includes(pathName);
  const tv = pathName.startsWith("/tv");
  const player = pathName.includes("/player");
  const auth = pathName.includes("/auth");

  if (auth || player) return null;

  return (
    <Navbar
      disableScrollHandler
      isBlurred={false}
      position="sticky"
      maxWidth="full"
      classNames={{ wrapper: "px-2 md:px-4" }}
      className={cn("inset-0 h-min bg-transparent", {
        "bg-background": show,
      })}
    >
      {!show && (
        <div
          className="border-background bg-background absolute inset-0 h-full w-full border-b"
          style={{ opacity: opacity }}
        />
      )}
      <NavbarBrand>
        {show ? <BrandLogo /> : <BackButton href={tv ? "/?content=tv" : "/"} />}
      </NavbarBrand>
      {show && !pathName.startsWith("/search") && (
        <NavbarContent className="hidden w-full max-w-lg gap-2 md:flex" justify="center">
          <NavbarItem className="w-full">
            <Link href="/search" className="w-full">
              <SearchInput
                className="pointer-events-none"
                placeholder="Search your favorite movies..."
              />
            </Link>
          </NavbarItem>
        </NavbarContent>
      )}
      <NavbarContent justify="end">
        <NavbarItem className="flex items-center gap-1.5">
          <ThemeSwitchDropdown />
          <FullscreenToggleButton />

          {user ? (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button className="flex items-center gap-2 rounded-full bg-zinc-900 hover:bg-zinc-800 py-1 px-2 transition-colors border border-zinc-800">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 uppercase select-none">
                    {user.username.charAt(0)}
                  </div>
                  <span className="text-xs font-medium max-w-[90px] truncate text-zinc-300">
                    {user.username}
                  </span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2" textValue="Signed in as">
                  <p className="text-xs text-zinc-400">Signed in as</p>
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                </DropdownItem>
                <DropdownItem
                  key="history"
                  as={Link}
                  href="/history"
                  startContent={<FiClock className="text-primary" />}
                >
                  Watch History
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  className="text-danger"
                  startContent={<FiLogOut />}
                  onPress={() => logout()}
                >
                  Sign Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<FiLogIn />}
              onPress={() => openAuthModal("login")}
              className="font-medium text-xs h-8"
            >
              Login
            </Button>
          )}
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
