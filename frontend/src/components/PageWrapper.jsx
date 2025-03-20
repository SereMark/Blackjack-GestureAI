import { motion } from "framer-motion";

function PageWrapper({ children }) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen w-full text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

export default PageWrapper;