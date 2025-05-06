import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: '/var/www/html/frontend',
	},
	server: {
		hmr: {
			protocol: 'wss',
			host: 'localhost',
			port: 3000,
		},
		allowedHosts: true,
	}
});