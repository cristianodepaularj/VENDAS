import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Sales from './pages/Sales';
import CashFlow from './pages/CashFlow';

function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<LayoutWrapper />}>
          <Route path="/vendas" element={<Sales />} />
          <Route path="/financeiro" element={<CashFlow />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/produtos" element={<Products />} />
        </Route>

        <Route path="/" element={<Navigate to="/vendas" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;