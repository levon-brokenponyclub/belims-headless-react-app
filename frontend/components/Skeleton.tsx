import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  borderRadius = "0.25rem",
  className = "",
  circle = false,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: circle
      ? "50%"
      : typeof borderRadius === "number"
        ? `${borderRadius}px`
        : borderRadius,
  };

  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse ${className}`}
      style={style}
      aria-busy="true"
      aria-label="Loading..."
    />
  );
};

interface SkeletonLineProps {
  count?: number;
  width?: string;
  height?: string;
  gap?: string;
  className?: string;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  count = 3,
  width = "100%",
  height = "1rem",
  gap = "0.75rem",
  className = "",
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={width} height={height} className={className} />
      ))}
    </div>
  );
};

interface SkeletonImageProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const SkeletonImage: React.FC<SkeletonImageProps> = ({
  width = "100%",
  height = "400px",
  className = "",
}) => {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius="0.5rem"
      className={className}
    />
  );
};

interface SkeletonProductCardProps {
  className?: string;
}

export const SkeletonProductCard: React.FC<SkeletonProductCardProps> = ({
  className = "",
}) => {
  return (
    <div className={`p-4 ${className}`}>
      <SkeletonImage height="250px" />
      <div className="mt-4 space-y-3">
        <Skeleton height="1.25rem" />
        <Skeleton height="1rem" width="80%" />
        <Skeleton height="1.5rem" width="60%" />
        <Skeleton height="2.75rem" />
      </div>
    </div>
  );
};
