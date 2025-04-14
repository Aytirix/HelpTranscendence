module.exports = {
	apps: [
		{
			name: "api_transcendence",
			script: "./dist/server.js",
			interpreter: "node",
			node_args: "-r tsconfig-paths/register",
			instances: "max",
			exec_mode: "cluster",
			autorestart: true,
			restart_delay: 500,
			max_memory_restart: "1G",
			watch: false,
			log_file: "./logs/api_transcendence.log",
			out_file: "./logs/api_transcendence_out.log",
			error_file: "./logs/api_transcendence_error.log",
			merge_logs: true,
			env: {
				TS_NODE_PROJECT: "./tsconfig.json",
				TS_CONFIG_PATHS_BASEURL: "./dist"
			}
		},
	],
};
