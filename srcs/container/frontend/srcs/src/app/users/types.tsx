export interface User {
	id: number;
	email?: string;
	username: string;
	password?: string;
	lang?: string;
	google_token?: string;
	avatar?: string;
	privmsg_id?: number;
	online?: boolean;
	relation?: {
		status: 'friend' | 'blocked' | 'pending' | '';
		target: number;
		privmsg_id?: number;
	} | null;
}

export interface Message {
	id: number;
	sender_id: number;
	message: string;
	sent_at: Date;
}

export interface Group {
	id: number;
	name: string;
	members: User[];
	owners_id: number[];
	onlines_id: number[];
	messages: Map<number, Message>;
	private: 0 | 1;
}

export interface Friends {
	id: number;
	user_one_id: number;
	user_two_id: number;
	target: number;
	group_id: number;
	status: 'friend' | 'blocked' | 'pending' | '';
}

export interface request {
	action: string;
}

export interface reponse {
	action: string;
	result: 'ok' | 'error';
	notification?: [string];
}

// Reponse : Intialisation de la connexion
// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
// Envoi de la liste des amis connectés à l'utilisateur
export interface send_init_connected extends reponse {
	action: 'init_connected';
	user: User;
	groups: Record<number, Group>;
	friends: User[];
}

//  l'api attend cette reponse pour un nouveau message
export interface req_newMessage {
	action: 'new_message';
	group_id: number;
	message: string;
}

// Envoyer le message a toutes les personnes de la conversation
export interface res_newMessage extends reponse {
	action: 'new_message';
	group_id: number;
	message: Message;
}

export interface req_addUserGroup {
	action: 'add_user_group' | 'remove_user_group';
	group_id: number;
	user_id: number;
}

export interface req_deleteGroup {
	action: 'leave_group';
	group_id: number;
}

export interface req_leaveGroup {
	action: 'leave_group';
	group_id: number;
}

export interface res_addUserGroup {
	action: 'add_user_group' | 'remove_user_group';
	group_id: number;
	users_id: number;
}

//  l'api attend cette reponse pour un nouveau message
export interface req_createGroup {
	action: 'create_group';
	group_name: string;
	users_id: number[];
}

// Envoyer le message a toutes les personnes de la conversation
export interface res_createGroup extends reponse {
	action: 'create_group';
	group: Group;
}

// Reponse : Requete pour recuperer x messages qui n'ont pas encore été envoyés
export interface req_loadMoreMessage {
	action: 'loadMoreMessage';
	group_id: number;
	firstMessageId: number;
}

// Reponse : Requete pour recuperer x messages qui n'ont pas encore été envoyés
export interface res_loadMoreMessage extends reponse {
	action: 'loadMoreMessage';
	group_id?: number;
	messages?: Map<number, Message>;
}

// Reponse : Envoyer le message que x c'est connecté a tous ces amis
export interface send_friend_connected {
	action: 'friend_connected';
	user_id: number;
}

// Reponse : Envoyer le message que x c'est deconnecté a tous ces amis
export interface res_disconnect {
	action: 'friend_disconnected';
	user_id: number;
}

// Request pour accepter une demande d'ami
export interface req_accept_friend {
	action: 'accept_friend';
	user_id: number;
}

// Reponse : Envoyer le message que x a accepté la demande d'ami
export interface res_accept_friend extends reponse {
	action: 'accept_friend';
	user: User;
	group: Group;
}

// Request pour refuser une demande d'ami
export interface req_refuse_friend {
	action: 'refuse_friend';
	user_id: number;
}

// Reponse : Envoyer le message que x a refuser la demande d'ami
export interface res_refuse_friend extends reponse {
	action: 'refuse_friend';
	user_id: number;
	group_id: number;
}

export interface req_search_user {
	action: 'search_user';
	name: string;
}

export interface res_search_user {
	action: 'search_user';
	users: User[];
}

// Request pour faire une demande d'ami
export interface req_add_friend {
	action: 'add_friend';
	user_id: number;
}

// Reponse : Envoyer le message que x a envoye une demande d'ami
export interface res_add_friend extends reponse {
	action: 'add_friend';
	user: User;
}

export interface req_remove_friend {
	action: 'remove_friend';
	user_id: number;
}

export interface req_block_user {
	action: 'block_user';
	user_id: number;
}

export interface res_block_user extends reponse {
	action: 'block_user' | 'unblock_user';
	user_id: number;
}

export interface res_remove_friend extends reponse {
	action: 'remove_friend';
	user_id: number;
	group_id: number;
}

export interface req_ping {
	action: 'ping';
}

export interface res_pong {
	action: 'pong';
}