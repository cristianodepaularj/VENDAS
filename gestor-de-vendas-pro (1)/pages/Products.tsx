import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Product, Profile } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Edit, Trash2, Plus, Download, Search } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: 0,
    category: '',
    unit: 'un',
    stock: 0
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      fetchProducts();
    };
    init();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const isAdmin = profile?.role === 'admin';

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text('Relatório de Estoque e Produtos', 14, 15);
    const tableData = products.map(p => [p.code, p.name, p.category, `R$ ${p.price.toFixed(2)}`, p.stock.toString()]);
    autoTable(doc, {
      head: [['Código', 'Nome', 'Categoria', 'Preço', 'Estoque']],
      body: tableData,
      startY: 20,
    });
    doc.save('estoque_produtos.pdf');
  };

  const handleExportXLS = () => {
    const ws = XLSX.utils.json_to_sheet(products.map(p => ({
      Código: p.code,
      Nome: p.name,
      Categoria: p.category,
      Preço: p.price,
      Estoque: p.stock
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await supabase.from('products').update(formData).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([formData]);
    }
    closeModal();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este produto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        code: product.code,
        price: product.price,
        category: product.category,
        unit: product.unit,
        stock: product.stock
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', code: '', price: 0, category: '', unit: 'un', stock: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.includes(search)
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Produtos e Estoque</h2>
        <div className="flex gap-2">
           <button onClick={handleExportPDF} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-2"><Download size={16}/> PDF</button>
           <button onClick={handleExportXLS} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center gap-2"><Download size={16}/> XLS</button>
           {isAdmin && (
             <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> Novo Produto</button>
           )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..." 
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
              <th className="p-4 font-semibold text-gray-600">Código</th>
              <th className="p-4 font-semibold text-gray-600">Nome</th>
              <th className="p-4 font-semibold text-gray-600">Categoria</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Preço</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Estoque</th>
              {isAdmin && <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={6} className="p-4 text-center">Carregando...</td></tr> : 
             filteredProducts.map(prod => (
              <tr key={prod.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-500 font-mono text-sm">{prod.code}</td>
                <td className="p-4 font-medium">{prod.name}</td>
                <td className="p-4 text-sm text-gray-600">{prod.category}</td>
                <td className="p-4 text-right">R$ {prod.price.toFixed(2)}</td>
                <td className={`p-4 text-center font-bold ${prod.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {prod.stock} {prod.unit}
                </td>
                {isAdmin && (
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openModal(prod)} className="text-blue-600 hover:text-blue-800"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(prod.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Código</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <input type="text" className="w-full mt-1 p-2 border rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                <input required type="number" step="0.01" className="w-full mt-1 p-2 border rounded" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unidade</label>
                <input type="text" className="w-full mt-1 p-2 border rounded" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              </div>
              <div className="md:col-span-2 bg-gray-50 p-3 rounded border">
                <label className="block text-sm font-medium text-gray-700">Estoque Atual</label>
                <input required type="number" step="any" className="w-full mt-1 p-2 border rounded bg-white" value={formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} />
                <p className="text-xs text-gray-500 mt-1">Ajuste manual de entrada/saída</p>
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
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