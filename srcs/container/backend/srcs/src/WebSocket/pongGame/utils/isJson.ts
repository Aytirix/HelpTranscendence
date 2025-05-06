export function isJson(data: string) : boolean {
	try {
		JSON.parse(data);
		return (true);
	}
	catch {
		return false
	}
}