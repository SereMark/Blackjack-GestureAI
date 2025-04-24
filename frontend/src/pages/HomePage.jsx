import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-10 bg-transparent relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600/0 via-purple-600 to-purple-600/0"></div>
      
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="inline-block mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <div className="relative bg-gray-900/80 w-24 h-24 rounded-full flex items-center justify-center border-2 border-purple-500/30 shadow-lg backdrop-blur-sm">
            <span className="text-4xl">♠️</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 px-6 py-2">
          GestureAI Blackjack
        </h1>
        <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full mb-6"></div>
        <p className="text-lg sm:text-xl text-gray-300 max-w-lg leading-relaxed mb-8 mx-auto">
          A sleek, modern blackjack experience with AI-powered gesture controls.
        </p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-6 items-center"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/game"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all px-10 py-4 rounded-full text-lg font-semibold shadow-button flex items-center"
          >
            <span className="mr-3 text-xl bg-white/20 p-1.5 rounded-full flex items-center justify-center w-8 h-8">♠</span>
            <span className="tracking-wide">Play Now</span>
          </Link>
        </motion.div>

        <div className="mt-6 sm:mt-0 text-sm text-gray-300 flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span> 
          <span>Powered by cutting-edge AI</span>
        </div>
      </motion.div>
      
      <motion.div 
        className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl w-full"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="bg-black/30 backdrop-blur-sm p-7 rounded-xl border border-white/10 hover:border-purple-500/40 transition-all shadow-lg">
          <div className="bg-purple-600/20 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <span className="text-white text-2xl">👋</span>
          </div>
          <h3 className="text-lg font-semibold mb-3 text-white">Gesture Controls</h3>
          <p className="text-gray-300 text-sm leading-relaxed">Control the game with simple hand gestures via your webcam.</p>
        </div>
        
        <div className="bg-black/30 backdrop-blur-sm p-7 rounded-xl border border-white/10 hover:border-purple-500/40 transition-all shadow-lg">
          <div className="bg-purple-600/20 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <span className="text-white text-2xl">🎮</span>
          </div>
          <h3 className="text-lg font-semibold mb-3 text-white">Immersive Design</h3>
          <p className="text-gray-300 text-sm leading-relaxed">Enjoy a professional casino experience with realistic cards and animations.</p>
        </div>
        
        <div className="bg-black/30 backdrop-blur-sm p-7 rounded-xl border border-white/10 hover:border-purple-500/40 transition-all shadow-lg">
          <div className="bg-purple-600/20 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <span className="text-white text-2xl">🧠</span>
          </div>
          <h3 className="text-lg font-semibold mb-3 text-white">AI-Powered</h3>
          <p className="text-gray-300 text-sm leading-relaxed">Advanced recognition algorithms ensure accurate gameplay.</p>
        </div>
      </motion.div>
    </div>
  );
}

export default HomePage;