export function AppLogo({
  variant = "app",
  className = "",
}: {
  variant?: "app" | "splash";
  className?: string;
}) {
  const isSplash = variant === "splash";

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-base-100 ${
        isSplash
          ? "h-32 w-32 sm:h-40 sm:w-40 rounded-[2rem] ring-2 ring-primary/25 shadow-2xl shadow-primary/20"
          : "h-20 w-20 sm:h-24 sm:w-24 rounded-3xl ring-1 ring-base-300 shadow-lg"
      } ${className}`}
    >
      <img
        src="/logo.png"
        alt="Bureau of Fire Protection Region II logo"
        loading={isSplash ? "eager" : "lazy"}
        className={`object-contain drop-shadow-md ${
          isSplash ? "h-full w-full p-4 animate-pulse" : "h-full w-full p-1.5"
        }`}
      />
    </div>
  );
}
