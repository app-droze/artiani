"use client";

import type { ReactNode } from "react";

type ChipProps = {
  active: boolean;
  onClick: () => void;
  baseClassName: string;
  activeClassName: string;
  inactiveClassName: string;
  children: ReactNode;
};

export const Chip = ({
  active,
  onClick,
  baseClassName,
  activeClassName,
  inactiveClassName,
  children,
}: ChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClassName} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </button>
  );
};
