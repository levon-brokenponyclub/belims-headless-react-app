import React from "react";
import { Link } from "react-router-dom";

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: string;
  tone?: "default" | "inverse";
  titleSize?: "responsive" | "h2";
  children?: React.ReactNode;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  id,
  eyebrow,
  title,
  tone = "default",
  titleSize = "responsive",
  children,
}) => {
  const inverse = tone === "inverse";
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p
          className={`text-eyebrow font-semibold ${inverse ? "text-white/70" : "text-primary"}`}
        >
          {eyebrow}
        </p>
        <h2
          id={id}
          className={`mt-1 font-heading ${titleSize === "h2" ? "text-h2" : "text-h2 md:text-display-md"} font-bold uppercase font-condensed after:mt-2.5 after:block after:h-1 after:w-12 after:bg-primary after:content-[''] ${inverse ? "text-white" : "text-text"}`}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
};

export const ViewAllLink: React.FC<{ to: string; children: React.ReactNode; inverse?: boolean }> = ({
  to,
  children,
  inverse = false,
}) => (
  <Link
    to={to}
    className={`inline-flex min-h-11 items-center text-base font-bold underline decoration-2 underline-offset-4 transition-colors ${
      inverse ? "text-white decoration-primary hover:text-white/80" : "text-text hover:text-primary"
    }`}
  >
    {children}
  </Link>
);
