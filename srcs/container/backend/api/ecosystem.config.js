module.exports = {
	apps: [
		{
			name: "api_transcendence",
			script: "src/server.ts",
			interpreter: "ts-node",
			interpreter_args: "--project tsconfig.json",
			watch: ["src"],
			ignore_watch: ["node_modules"],
			watch_options: {
				usePolling: true,
			},
			autorestart: true,
			restart_delay: 500,
			env: {
				NODE_ENV: "development",
			},
		},
	],
};
