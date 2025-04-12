module.exports = {
	apps: [
		{
			name: "api_transcendence",
			script: "./dist/server.js",
			interpreter: "node",
			instances: "max",
			exec_mode: "cluster",
			autorestart: true,
			restart_delay: 500,
			max_memory_restart: "1G",
			watch: false,
		},
	],
};
