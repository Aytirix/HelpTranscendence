import { Link } from 'react-router-dom';
import './App.css'
import { useLanguage } from './contexts/LanguageContext';

function App() {
	const { t, setLanguage } = useLanguage();

	return (
		<>
			<nav>
				<Link to="/WebSocketTest">test WebSocket</Link>
			</nav>
			<div>
				<button onClick={() => setLanguage('fr')}>Français</button>
				<button onClick={() => setLanguage('en')}>English</button>
				<button onClick={() => setLanguage('jp')}>日本語</button>
			</div>
			<h1>{t('test')}</h1>
		</>
	)
}

export default App
