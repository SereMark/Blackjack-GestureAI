import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function HomePage() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 bg-transparent">
      <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight animate-fadeZoomIn">
        ♠️ GestureAI Blackjack ♠️
      </h1>
      <p className="text-lg sm:text-xl text-gray-100 max-w-lg leading-relaxed animate-fadeSlideUp mb-8">
        A sleek, gesture-powered blackjack experience that you can play with your webcam.
      </p>
      <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
        <Link
          to="/game"
          className="bg-purple-600 hover:bg-purple-700 transition px-8 py-3 rounded-md text-lg font-semibold shadow-lg"
        >
          Play Now
        </Link>
      </motion.div>
    </div>
  );
}

export default HomePage;