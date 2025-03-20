import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BackgroundSwirls from "./components/BackgroundSwirls";
import PageWrapper from "./components/PageWrapper";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes key={location.pathname} location={location}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <HomePage />
            </PageWrapper>
          }
        />
        <Route
          path="/game"
          element={
            <PageWrapper>
              <GamePage />
            </PageWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <>
      <BackgroundSwirls />
      <AnimatedRoutes />
    </>
  );
}

export default App;