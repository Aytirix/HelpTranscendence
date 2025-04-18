import { skGroup, Message, User, Group } from "@types";
import { WebSocketServer, WebSocket } from 'ws';

export interface State {
	groups: skGroup[];
	users_connected: WebSocket[];
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
	friends_connected: User[];
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
export interface req_getMessage {
	action: 'get_message';
	group_id: number;
	last_message_id: number;
}

// Reponse : Requete pour recuperer x messages qui n'ont pas encore été envoyés
export interface res_getMessage {
	action: 'get_message';
	group_id: number;
	messages: Message[];
}

// Reponse : Envoyer le message que x c'est connecté a tous ces amis
export interface send_friend_connected {
	action: 'friend_connected';
	user: User;
}

// Reponse : Envoyer le message que x c'est deconnecté a tous ces amis
export interface res_disconnect {
	action: 'user_disconnected';
	user_id: number;
}

export interface req_ping {
	action: 'ping';
}

export interface req_pong {
	action: 'pong';
}