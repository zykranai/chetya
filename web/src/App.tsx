import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ChatPage } from '@/pages/ChatPage';
import { ReadingPage } from '@/pages/ReadingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="reading" element={<ReadingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
