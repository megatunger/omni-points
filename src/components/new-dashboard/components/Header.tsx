import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/solana/solana-provider";
import { Handshake, Store, WalletCards } from "lucide-react";
import { AnimatedBackground } from "@/app/components/motion-primitives/animated-background";
import Link from "next/link";

const TABS = [
  {
    label: "Home",
    icon: <Store className="h-5 w-5" />,
    href: "/",
  },
  {
    label: "Exchanges",
    icon: <Handshake className="h-5 w-5" />,
    href: "/exchanges",
  },
  {
    label: "Wallet",
    icon: <WalletCards className="h-5 w-5" />,
    href: "/wallet",
  },
];
const Header = () => {
  const { disconnect, connected } = useWallet();
  const currentTab = TABS.find((tab) =>
    typeof window !== "undefined"
      ? tab.href === window.location.pathname
      : false,
  );
  return (
    <div className="navbar bg-base-100 shadow-sm rounded-2xl">
      <div className="navbar-start">
        <a className="btn btn-ghost text-xl">OmniPoints</a>
      </div>
      <div className="">
        <div className="flex w-full space-x-2 rounded-xl  p-2">
          <AnimatedBackground
            defaultValue={currentTab?.label}
            className="rounded-lg bg-accent-content/60"
            transition={{
              type: "spring",
              bounce: 0.2,
              duration: 0.3,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.label}
                data-id={tab.label}
                type="button"
                className="flex h-9 items-center justify-center text-zinc-500 transition-colors duration-100 focus-visible:outline-2 data-[checked=true]:text-zinc-950"
              >
                <Link href={tab.href}>
                  <div className="flex flex-row items-center justify-between gap-2 p-3">
                    <div>{tab.icon}</div>
                    <div>{tab.label}</div>
                  </div>
                </Link>
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>
      <div className="navbar-end">
        {!connected ? (
          <WalletButton />
        ) : (
          <a className="btn" onClick={disconnect}>
            Disconnect
          </a>
        )}
      </div>
    </div>
  );
};

export default Header;
