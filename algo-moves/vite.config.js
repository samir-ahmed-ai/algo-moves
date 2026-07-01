import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: { port: 4321, strictPort: true },
    build: {
        // Split the big, rarely-changing vendor libs into their own long-cached
        // chunks so the entry is smaller and the 500kB warning is meaningful again.
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    xyflow: ['@xyflow/react'],
                },
            },
        },
    },
});
