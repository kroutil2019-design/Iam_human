import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [adminKey, setAdminKey] = useState<string | null>(() =>
    sessionStorage.getItem('adminKey')
  );

  const handleLogin = (key: string) => {
    sessionStorage.setItem('adminKey', key);
    setAdminKey(key);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey');
    setAdminKey(null);
  };

  if (!adminKey) return <Login onLogin={handleLogin} />;
  return <Dashboard adminKey={adminKey} onLogout={handleLogout} />;
}
