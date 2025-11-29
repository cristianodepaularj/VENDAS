import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Payment } from '../types';
import { CheckCircle, Clock, Calendar, DollarSign, Filter } from 'lucide-react';

export default function CashFlow() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterDate, setFilterDate] = useState('');
  
  // Payment Modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payMethod, setPayMethod] = useState('pix');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
        .from('payments')
        .select('*, sale:sales(client:clients(name))')
        .order('due_date', { ascending: true });
    
    if (!error && data) setPayments(data as any);
  };

  const markAsPaid = async () => {
      if (!selectedPayment) return;
      
      const { error } = await supabase.from('payments').update({
          status: 'paid',
          pay_date: new Date().toISOString(),
          payment_method: payMethod
      }).eq('id', selectedPayment.id);

      if (!error) {
          fetchPayments();
          setSelectedPayment(null);
      } else {
          alert('Erro ao processar pagamento');
      }
  };

  const filteredPayments = payments.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterDate && !p.due_date.startsWith(filterDate)) return false;
      return true;
  });

  const totalReceived = payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa & Contas</h2>
         <div className="flex gap-4">
             <div className="bg-green-100 p-3 rounded-lg flex items-center gap-3">
                 <div className="bg-green-500 text-white p-2 rounded-full"><DollarSign size={20}/></div>
                 <div>
                     <p className="text-xs text-green-700 font-bold uppercase">Recebido Total</p>
                     <p className="text-lg font-bold text-green-800">R$ {totalReceived.toFixed(2)}</p>
                 </div>
             </div>
             <div className="bg-yellow-100 p-3 rounded-lg flex items-center gap-3">
                 <div className="bg-yellow-500 text-white p-2 rounded-full"><Clock size={20}/></div>
                 <div>
                     <p className="text-xs text-yellow-700 font-bold uppercase">A Receber</p>
                     <p className="text-lg font-bold text-yellow-800">R$ {totalPending.toFixed(2)}</p>
                 </div>
             </div>
         </div>
       </div>

       {/* Filters */}
       <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500"/>
                <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="border rounded p-2 text-sm"
                >
                    <option value="all">Todos Status</option>
                    <option value="pending">A Pagar</option>
                    <option value="paid">Pagos</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500"/>
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="border rounded p-2 text-sm"
                />
                {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-red-500">Limpar</button>}
            </div>
       </div>

       {/* Payments List */}
       <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                  <tr>
                      <th className="p-4 text-sm font-semibold text-gray-600">Vencimento</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Cliente</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Parcela</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Valor</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Método</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-right">Ação</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {filteredPayments.map(pay => (
                      <tr key={pay.id} className="hover:bg-gray-50">
                          <td className="p-4 whitespace-nowrap">
                              {new Date(pay.due_date).toLocaleDateString()}
                              {new Date(pay.due_date) < new Date() && pay.status === 'pending' && (
                                  <span className="ml-2 text-xs text-red-500 font-bold">Atrasado</span>
                              )}
                          </td>
                          <td className="p-4 font-medium">{pay.sale?.client?.name || 'Cliente Removido'}</td>
                          <td className="p-4 text-gray-500 text-sm">{pay.installment_number}/{pay.total_installments}</td>
                          <td className="p-4 font-bold">R$ {pay.amount.toFixed(2)}</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${pay.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {pay.status === 'paid' ? 'PAGO' : 'A PAGAR'}
                              </span>
                          </td>
                          <td className="p-4 capitalize text-sm">{pay.payment_method || '-'}</td>
                          <td className="p-4 text-right">
                              {pay.status === 'pending' && (
                                  <button 
                                    onClick={() => setSelectedPayment(pay)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                  >
                                      Receber
                                  </button>
                              )}
                          </td>
                      </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                  )}
              </tbody>
          </table>
       </div>

       {/* Receive Modal */}
       {selectedPayment && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                   <h3 className="text-lg font-bold mb-4">Receber Parcela</h3>
                   <div className="mb-4 text-sm text-gray-600">
                       <p>Cliente: <strong>{selectedPayment.sale?.client?.name}</strong></p>
                       <p>Valor: <strong>R$ {selectedPayment.amount.toFixed(2)}</strong></p>
                       <p>Vencimento: {new Date(selectedPayment.due_date).toLocaleDateString()}</p>
                   </div>
                   <div className="mb-6">
                       <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                       <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full p-2 border rounded">
                           <option value="pix">Pix</option>
                           <option value="money">Dinheiro</option>
                           <option value="debit">Débito</option>
                           <option value="credit">Crédito</option>
                       </select>
                   </div>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setSelectedPayment(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                       <button onClick={markAsPaid} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Confirmar Recebimento</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}