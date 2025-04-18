import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../api/ApiService';

interface AuthContextType {
	user: { isAuthenticated: boolean } | null;
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
	const [user, setUser] = useState<{ isAuthenticated: boolean } | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;

		const checkAuthentication = async () => {
			if (!isMounted) return;
			try {
				const res = await ApiService.get('/isAuth');
				if (isMounted) {
					setUser({ isAuthenticated: res.isAuthenticated });
					if (!res.isAuthenticated && window.location.pathname !== "/login") {
						navigate('/login');
					}
				}
			} catch (err) {
				console.error("Auth check failed:", err);
				if (isMounted) {
					setUser({ isAuthenticated: false });
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
				<div className="flex justify-center items-center h-screen">
					<p>Chargement...</p>
				</div>
			) : (
				children
			)}
		</IsAuthenticated.Provider>
	);
};

export { IsAuthenticated };
