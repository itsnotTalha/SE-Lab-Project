import ReactDOM from 'react-dom/client';

import App from './App';
import { ThemeProvider } from './src/context/ThemeContext';
import './src/styles/tokens.css';
import './src/styles/global.css';
import './src/styles/animations.css';
import './src/styles/components.css';
import './src/styles/landing.css';
import './src/styles/auth.css';
import './src/styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
	<ThemeProvider>
		<App />
	</ThemeProvider>
);
