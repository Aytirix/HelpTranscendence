import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../api/ApiService';
import { useLanguage } from '../contexts/LanguageContext';
import { User } from '../app/types/userTypes';

interface AuthContextType {
	user: User | null;
	loading: boolean;
}

const IsAuthenticated = createContext<AuthContextType>({
	user: null,
	loading: true
});

export const useAuth = (): AuthContextType => {
	return useContext(IsAuthenticated);
};

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const { setLanguage } = useLanguage();
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;

		const checkAuthentication = async () => {
			if (!isMounted) return;
			try {
				const res = await ApiService.get('/isAuth');
				if (isMounted) {
					setLanguage(res.user.lang);
					setUser(res.user)
					if (res.isAuthenticated && (window.location.pathname == "/login" || window.location.pathname == "/register")) {
						navigate('/');
					} else if (!res.isAuthenticated && window.location.pathname !== "/login") {
						navigate('/login');
					}
				}
			} catch (err) {
				console.error("Auth check failed:", err);
				if (isMounted) {
					setUser(null);
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		checkAuthentication();

		return () => {
			isMounted = false;
		};
	}, [navigate]);

	return (
		<IsAuthenticated.Provider value={{ user, loading }}>
			{loading ? (
				<></>
			) : (
				children
			)}
		</IsAuthenticated.Provider>
	);
};