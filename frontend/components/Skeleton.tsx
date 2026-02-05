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

interface SkeletonDealCardProps {
  className?: string;
}

export const SkeletonDealCard: React.FC<SkeletonDealCardProps> = ({
  className = "",
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <Skeleton height="140px" borderRadius="0.5rem" />
      <div className="mt-3 space-y-2">
        <Skeleton height="0.75rem" width="90%" />
        <Skeleton height="0.75rem" width="70%" />
      </div>
      <div className="mt-3">
        <Skeleton height="1rem" width="45%" />
      </div>
      <div className="mt-4">
        <Skeleton height="2.25rem" borderRadius="0.5rem" />
      </div>
    </div>
  );
};

export const SkeletonDealCardHorizontal: React.FC<SkeletonDealCardProps> = ({
  className = "",
}) => {
  return (
    <div className={`flex gap-4 ${className}`}>
      <Skeleton height="120px" width="33%" borderRadius="0.5rem" />
      <div className="flex-1">
        <Skeleton height="0.8rem" width="80%" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <Skeleton height="0.65rem" width="70%" />
          <Skeleton height="0.65rem" width="70%" />
          <Skeleton height="1rem" width="85%" />
          <Skeleton height="1rem" width="85%" />
        </div>
        <div className="mt-4">
          <Skeleton height="2.25rem" borderRadius="0.5rem" />
        </div>
      </div>
    </div>
  );
};
