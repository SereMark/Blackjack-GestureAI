import React from "react";

function App() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-800 text-white overflow-hidden">
      {/* Two swirling, color-shifting circles */}
      <div className="absolute top-[-160px] left-[-160px] w-[550px] h-[550px] rounded-full opacity-50 blur-3xl animate-swirlWithColor" />
      <div className="absolute bottom-[-160px] right-[-160px] w-[550px] h-[550px] rounded-full opacity-50 blur-3xl animate-swirlWithColor2" />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Headline: fadeZoomIn, slight delay for tagline */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight animate-fadeZoomIn">
          ♠️ GestureAI Blackjack ♠️
        </h1>

        {/* Tagline: fadeSlideUp with a short delay */}
        <p className="text-lg sm:text-xl text-gray-100 max-w-lg leading-relaxed animate-fadeSlideUp delay-[150ms]">
          Enhance your blackjack strategy with intuitive <br className="hidden md:block" />
          AI-driven gesture controls.
        </p>
      </div>
    </div>
  );
}

export default App;