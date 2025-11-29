import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  LogOut, 
  Menu,
  X
} from 'lucide-react';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isAdmin = profile?.role === 'admin';

  const menuItems = [
    { name: 'Caixa / Financeiro', path: '/financeiro', icon: <DollarSign size={20} />, roles: ['admin', 'user'] },
    { name: 'Vendas', path: '/vendas', icon: <ShoppingCart size={20} />, roles: ['admin', 'user'] },
    { name: 'Estoque / Produtos', path: '/produtos', icon: <Package size={20} />, roles: ['admin', 'user'] },
    ...(isAdmin ? [{ name: 'Clientes', path: '/clientes', icon: <Users size={20} />, roles: ['admin'] }] : []),
  ];

  if (!profile) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white shadow-lg z-10">
        <div className="flex h-20 items-center justify-center border-b px-6">
          <h1 className="text-xl font-bold text-gray-800">GestorPro</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-4">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t p-4">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-gray-900">{profile.full_name || 'Usuário'}</p>
            <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white shadow z-20 flex justify-between items-center px-4 h-16">
        <h1 className="text-lg font-bold text-gray-800">GestorPro</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-end px-4 border-b">
              <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
            </div>
            <nav className="flex-1 py-4">
              <ul className="space-y-1 px-4">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                        location.pathname === item.path ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t p-4">
              <button onClick={handleLogout} className="flex w-full items-center gap-3 text-red-600 px-4">
                <LogOut size={20} /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}