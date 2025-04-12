module.exports = {
	apps: [
		{
			name: "api_transcendence",
			script: "./src/server.ts",
			interpreter: "ts-node",
			interpreter_args: "-r tsconfig-paths/register --project tsconfig.json",
			watch: ["src"],
			ignore_watch: ["node_modules"],
			watch_options: {
				usePolling: true,
			},
			autorestart: true,
			restart_delay: 500,
			log_file: "./logs/api_transcendence.log",
			out_file: "./logs/api_transcendence_out.log",
			error_file: "./logs/api_transcendence_error.log",
			merge_logs: true,
		},
	],
};