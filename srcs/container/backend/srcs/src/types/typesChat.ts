import { Group, Message, User, Friends } from "@types";
import { WebSocketServer, WebSocket } from 'ws';

export interface State {
	user: Map<number, User>;
	onlineSockets: Map<number, WebSocket>;
	groups: Group[];
	friends: Friends[];
	friendsByUser: Map<number, number[]>;
}

export interface reponse {
	action: string;
}


// Reponse : Intialisation de la connexion
// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
// Envoi de la liste des amis connectés à l'utilisateur
export interface send_init_connected {
	action: 'init_connected';
	user: User;
	groups: Group[];
	friends: User[];
}

//  l'api attend cette reponse pour un nouveau message
export interface req_newMessage {
	action: string;
	group_id: number;
	message: string;
}

// Envoyer le message a toutes les personnes de la conversation
export interface res_newMessage {
	action: 'new_message';
	group_id: number;
	message: Message;
}

// Reponse : Requete pour recuperer x messages qui n'ont pas encore été envoyés
export interface req_loadMoreMessage {
	action: 'loadMoreMessage';
	group_id: number;
	firstMessageId: number;
}

// Reponse : Requete pour recuperer x messages qui n'ont pas encore été envoyés
export interface res_loadMoreMessage {
	action: 'loadMoreMessage';
	group_id: number;
	messages: Message[];
}

// Reponse : Envoyer le message que x c'est connecté a tous ces amis
export interface send_friend_connected {
	action: 'friend_connected';
	userId: number;
}

// Reponse : Envoyer le message que x c'est deconnecté a tous ces amis
export interface res_disconnect {
	action: 'friend_disconnected';
	user_id: number;
}

export interface req_ping {
	action: 'ping';
}

export interface res_pong {
	action: 'pong';
}