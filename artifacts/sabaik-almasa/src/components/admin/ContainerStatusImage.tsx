import {
  getContainerStatusFallbackImage,
  getContainerStatusImage,
  getContainerStatusImageDimensions,
} from "@/lib/containerStatusVisuals";

export function ContainerStatusImage({
  status,
  code,
  className = "",
  numberClassName = "",
}: {
  status: unknown;
  code: string;
  className?: string;
  numberClassName?: string;
}) {
  const { width, height } = getContainerStatusImageDimensions(status);

  return (
    <span
      className={`relative inline-flex overflow-hidden ${className}`}
      style={{ containerType: "inline-size" }}
    >
      <picture>
        <source type="image/webp" srcSet={getContainerStatusImage(status)} />
        <img
          src={getContainerStatusFallbackImage(status)}
          alt={`حاوية ${code}`}
          className="h-full w-full object-contain"
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <span
        className={`pointer-events-none absolute left-[62%] top-[44%] flex h-[20%] w-[24%] items-center justify-center overflow-hidden whitespace-nowrap px-1 text-[clamp(9px,5cqw,14px)] font-black leading-none tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,.95),0_0_1px_rgba(0,0,0,.95)] [transform:rotate(-7deg)_skewX(-6deg)] [transform-origin:left_center] ${numberClassName}`}
        dir="ltr"
        aria-hidden="true"
      >
        {code}
      </span>
    </span>
  );
}
