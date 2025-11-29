import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Client } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Edit, Trash2, Plus, Download, Search } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (!error && data) setClients(data);
    setLoading(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text('Relatório de Clientes', 14, 15);
    
    const tableData = clients.map(c => [c.name, c.phone, c.email, c.address]);
    
    autoTable(doc, {
      head: [['Nome', 'Telefone', 'Email', 'Endereço']],
      body: tableData,
      startY: 20,
    });
    
    doc.save('clientes.pdf');
  };

  const handleExportXLS = () => {
    const ws = XLSX.utils.json_to_sheet(clients.map(c => ({
      Nome: c.name,
      Telefone: c.phone,
      Email: c.email,
      Endereço: c.address
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "clientes.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await supabase.from('clients').update(formData).eq('id', editingClient.id);
    } else {
      await supabase.from('clients').insert([formData]);
    }
    closeModal();
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients();
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, phone: client.phone, email: client.email, address: client.address });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <div className="flex gap-2">
           <button onClick={handleExportPDF} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-2"><Download size={16}/> PDF</button>
           <button onClick={handleExportXLS} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center gap-2"><Download size={16}/> XLS</button>
           <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> Novo</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou telefone..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Nome</th>
              <th className="p-4 font-semibold text-gray-600">Telefone</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600 hidden md:table-cell">Endereço</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr> : 
             filteredClients.map(client => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{client.name}</td>
                <td className="p-4">{client.phone}</td>
                <td className="p-4">{client.email}</td>
                <td className="p-4 hidden md:table-cell truncate max-w-xs">{client.address}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openModal(client)} className="text-blue-600 hover:text-blue-800"><Edit size={18}/></button>
                  <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
            {!loading && filteredClients.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="w-full mt-1 p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endereço</label>
                <textarea className="w-full mt-1 p-2 border rounded" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}