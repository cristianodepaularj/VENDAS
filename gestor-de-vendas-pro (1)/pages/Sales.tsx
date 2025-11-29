import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Client, Product, CartItem } from '../types';
import jsPDF from 'jspdf';
import { Search, Plus, Trash, Check, X } from 'lucide-react';

export default function Sales() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Search States
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1); // 1: Type Selection, 2: Details
  const [saleType, setSaleType] = useState<'vista' | 'parcelado' | 'prazo'>('vista');
  
  // Payment Details
  const [vistaMethod, setVistaMethod] = useState('money');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(2);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: c } = await supabase.from('clients').select('*');
    const { data: p } = await supabase.from('products').select('*');
    if (c) setClients(c);
    if (p) setProducts(p);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (!selectedClient) {
      alert('Selecione um cliente primeiro.');
      return;
    }
    if (cart.length === 0) {
      alert('Carrinho vazio.');
      return;
    }
    setReceivedAmount(totalAmount);
    setPaymentStep(1);
    setIsPaymentModalOpen(true);
  };

  const finalizeSale = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) return;

    try {
        // 1. Create Sale Header
        const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
            client_id: selectedClient!.id,
            user_id: userId,
            total_amount: totalAmount,
            sale_type: saleType
        }]).select().single();

        if (saleError || !saleData) throw saleError;

        // 2. Insert Sale Items
        const saleItems = cart.map(item => ({
            sale_id: saleData.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        }));
        await supabase.from('sale_items').insert(saleItems);

        // 3. Update Inventory
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.id);
            }
        }

        // 4. Generate Payments
        const payments = [];
        const today = new Date();

        if (saleType === 'vista') {
            payments.push({
                sale_id: saleData.id,
                amount: totalAmount,
                due_date: today.toISOString(),
                pay_date: today.toISOString(),
                status: 'paid',
                payment_method: vistaMethod,
                installment_number: 1,
                total_installments: 1
            });
        } else if (saleType === 'prazo') {
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + 30);
            payments.push({
                sale_id: saleData.id,
                amount: totalAmount,
                due_date: dueDate.toISOString(),
                status: 'pending',
                installment_number: 1,
                total_installments: 1
            });
        } else if (saleType === 'parcelado') {
            const installmentValue = totalAmount / installments;
            for (let i = 1; i <= installments; i++) {
                const dueDate = new Date(today);
                dueDate.setDate(dueDate.getDate() + (i * 30));
                payments.push({
                    sale_id: saleData.id,
                    amount: installmentValue,
                    due_date: dueDate.toISOString(),
                    status: 'pending',
                    installment_number: i,
                    total_installments: installments
                });
            }
        }

        await supabase.from('payments').insert(payments);

        // Success
        alert('Venda realizada com sucesso!');
        generateReceipt(saleData.id, saleType === 'vista' ? totalAmount : 0);
        
        // Reset
        setCart([]);
        setSelectedClient(null);
        setIsPaymentModalOpen(false);
        fetchData(); // Refresh stock

    } catch (error) {
        console.error(error);
        alert('Erro ao processar venda.');
    }
  };

  const generateReceipt = (saleId: string, paidAmount: number) => {
     const doc = new jsPDF();
     doc.setFontSize(18);
     doc.text('Comprovante de Venda', 105, 20, { align: 'center' });
     
     doc.setFontSize(12);
     doc.text(`Cliente: ${selectedClient?.name}`, 20, 40);
     doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 48);
     doc.text(`Tipo: ${saleType.toUpperCase()}`, 20, 56);
     
     let y = 70;
     doc.text('Produtos:', 20, y);
     y += 10;
     cart.forEach(item => {
         doc.text(`${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`, 20, y);
         y += 8;
     });
     
     y += 5;
     doc.line(20, y, 190, y);
     y += 10;
     doc.setFontSize(14);
     doc.text(`TOTAL: R$ ${totalAmount.toFixed(2)}`, 20, y);
     
     if(saleType === 'vista' && vistaMethod === 'money') {
         y += 8;
         doc.setFontSize(10);
         doc.text(`Recebido: R$ ${receivedAmount.toFixed(2)}`, 20, y);
         doc.text(`Troco: R$ ${(receivedAmount - totalAmount).toFixed(2)}`, 100, y);
     }
     
     doc.save(`cupom_${saleId}.pdf`);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.includes(productSearch));

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
      {/* Left Panel: Products & Client Selection */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Client Selector */}
        <div className="bg-white p-4 rounded-lg shadow shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <div className="relative">
             <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={selectedClient ? selectedClient.name : clientSearch}
                onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClient(null);
                }}
             />
             {selectedClient && (
                <button onClick={() => { setSelectedClient(null); setClientSearch(''); }} className="absolute right-2 top-2 text-gray-500 hover:text-red-500">
                    <X size={20} />
                </button>
             )}
          </div>
          {/* Client Suggestions */}
          {!selectedClient && clientSearch.length > 0 && (
             <ul className="absolute z-10 bg-white border rounded mt-1 w-full max-w-md shadow-lg max-h-40 overflow-y-auto">
                {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                    <li key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); }} className="p-2 hover:bg-gray-100 cursor-pointer">
                        {c.name}
                    </li>
                ))}
             </ul>
          )}
        </div>

        {/* Product List */}
        <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar produto (nome ou código)..." 
                        className="w-full pl-10 p-2 border rounded bg-gray-50 focus:bg-white transition-colors"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => addToCart(product)} className="bg-gray-50 p-3 rounded border hover:border-blue-500 cursor-pointer transition-all active:scale-95">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-gray-800">{product.name}</p>
                                <p className="text-xs text-gray-500">Cod: {product.code}</p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">R$ {product.price.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Estoque: {product.stock} {product.unit}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-full lg:w-96 bg-white rounded-lg shadow flex flex-col h-full">
         <div className="p-4 border-b bg-gray-800 text-white rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-lg">Carrinho de Vendas</h3>
            <span className="bg-gray-700 px-2 py-1 rounded text-sm">{cart.length} itens</span>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">Carrinho vazio</div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)} / un</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                min="1" 
                                className="w-12 p-1 border rounded text-center text-sm"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                             />
                             <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700"><Trash size={18}/></button>
                        </div>
                    </div>
                ))
            )}
         </div>

         <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-900">R$ {totalAmount.toFixed(2)}</span>
            </div>
            <button 
                onClick={handleCheckout} 
                disabled={cart.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                <Check size={20} /> Finalizar Venda
            </button>
         </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
                <div className="bg-gray-800 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold">Finalizar Pagamento</h3>
                    <button onClick={() => setIsPaymentModalOpen(false)}><X/></button>
                </div>
                
                <div className="p-6">
                    {/* Step 1: Type */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['vista', 'parcelado', 'prazo'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setSaleType(t as any)}
                                    className={`py-2 px-4 rounded border font-medium capitalize ${saleType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t === 'vista' ? 'À Vista' : t === 'prazo' ? 'A Prazo (30d)' : 'Parcelado'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Specific Logic */}
                    {saleType === 'vista' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Método</label>
                                <select value={vistaMethod} onChange={e => setVistaMethod(e.target.value)} className="w-full mt-1 p-2 border rounded">
                                    <option value="money">Dinheiro</option>
                                    <option value="pix">Pix</option>
                                    <option value="debit">Débito</option>
                                    <option value="credit">Crédito</option>
                                </select>
                            </div>
                            {vistaMethod === 'money' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Valor Recebido</label>
                                    <input 
                                        type="number" 
                                        className="w-full mt-1 p-2 border rounded"
                                        value={receivedAmount}
                                        onChange={e => setReceivedAmount(parseFloat(e.target.value))}
                                    />
                                    <div className="mt-2 text-right">
                                        <span className="text-gray-500">Troco: </span>
                                        <span className="font-bold text-lg text-blue-600">R$ {(receivedAmount - totalAmount).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {saleType === 'parcelado' && (
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Número de Parcelas</label>
                                <select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="w-full mt-1 p-2 border rounded">
                                    {[2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                </select>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                                <p>Cada parcela: <strong>R$ {(totalAmount / installments).toFixed(2)}</strong></p>
                                <p>1º Vencimento: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}

                    {saleType === 'prazo' && (
                         <div className="bg-blue-50 p-3 rounded text-blue-800 text-sm">
                            Vencimento único em 30 dias: <strong>{new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</strong>
                         </div>
                    )}
                    
                    <div className="mt-8 pt-4 border-t flex justify-end gap-3">
                         <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                         <button 
                            onClick={finalizeSale}
                            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                         >
                            Confirmar Venda
                         </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}