import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

export default function Button({
  children,
  onClick = () => {
    alert("Button Clicked");
  },
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-12 w-48 items-center justify-between rounded-md border-2 border-white bg-black px-6 text-white hover:border-black hover:bg-white hover:text-black max-md:w-40 max-md:text-[12px]"
    >
      {children}
    </button>
  );
}
