import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ChatPage } from '@/pages/ChatPage';
import { ReadingPage } from '@/pages/ReadingPage';
import { useAuthStore } from '@/store/authStore';

function GuestTryRoute() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/chat" replace />;
  return <ChatPage guest />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/try" element={<GuestTryRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/reading" element={<ReadingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
