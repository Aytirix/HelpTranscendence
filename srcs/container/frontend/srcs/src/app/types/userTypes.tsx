export type RelationStatus = 'friend' | 'blocked' | 'pending' | '';

export type User = {
	id: number;
	username: string;
	email: string;
	avatar: string | null;
	lang: string;
	relation?: {
		status: RelationStatus;
		target: number;
		privmsg_id?: number;
	};
	online?: boolean;
};