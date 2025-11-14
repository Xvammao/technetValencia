import { Route, Routes, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { EquiposPage } from './pages/EquiposPage';
import { InstalacionesPage } from './pages/InstalacionesPage';
import { OperadoresPage } from './pages/OperadoresPage';
import { OrdenesPage } from './pages/OrdenesPage';
import { TecnicosPage } from './pages/TecnicosPage';
import { LoginPage } from './pages/LoginPage';
import { PrivateRoute } from './components/auth/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={(
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        )}
      />
      <Route
        path="/equipos"
        element={(
          <PrivateRoute>
            <EquiposPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/instalaciones"
        element={(
          <PrivateRoute>
            <InstalacionesPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/operadores"
        element={(
          <PrivateRoute>
            <OperadoresPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/ordenes"
        element={(
          <PrivateRoute>
            <OrdenesPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/tecnicos"
        element={(
          <PrivateRoute>
            <TecnicosPage />
          </PrivateRoute>
        )}
      />
    </Routes>
  );
}

export default App;
