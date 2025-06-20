import react from '@vitejs/plugin-react-swc';
import tailwind from '@tailwindcss/vite';

export default {
  plugins: [react(), tailwind()]
};