import { memo } from "react";

const BackgroundSwirls = memo(function BackgroundSwirls() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-black/80">
      <div className="absolute top-[-160px] left-[-160px] w-[550px] h-[550px] rounded-full opacity-50 blur-3xl animate-swirlWithColor" />
      <div className="absolute bottom-[-160px] right-[-160px] w-[550px] h-[550px] rounded-full opacity-50 blur-3xl animate-swirlWithColor2" />
    </div>
  );
});

export default BackgroundSwirls;