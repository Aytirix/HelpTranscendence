import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	base: '/HelpTranscendence/',
	plugins: [react()],
	build: {
		outDir: './build',
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