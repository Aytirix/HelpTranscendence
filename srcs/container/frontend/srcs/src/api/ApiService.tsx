class ApiService {
	private static url = 'https://localhost:7000';

	static async request(path: string, method: string, body?: JSON) {
		const headers = new Headers({
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		});

		const config: RequestInit = {
			method,
			headers,
			credentials: 'include'
		};

		if (body) {
			config.body = JSON.stringify(body);
		}

		try {
			const response = await fetch(`${this.url}${path}`, config);
			if (!response.ok) {
				let errorMessage = response.statusText;
				try {
					const json = await response.json();
					errorMessage = json && json.message ? json : errorMessage;
					return errorMessage;
				} catch (error) {
					console.error('Error parsing JSON:', error);
				}
			}
			return response.json();
		} catch (error) {
			console.error('Error during fetch:', error);
			throw new Error('Network error');
		}
	}

	static async get(endpoint: string, body?: JSON) {
		return this.request(endpoint, 'GET', body);
	}

	static async post(endpoint: string, body?: JSON) {
		return this.request(endpoint, 'POST', body);
	}

	static async put(endpoint: string, body?: JSON) {
		return this.request(endpoint, 'PUT', body);
	}

	static async delete(endpoint: string, body?: JSON) {
		return this.request(endpoint, 'DELETE', body);
	}
}

export default ApiService;