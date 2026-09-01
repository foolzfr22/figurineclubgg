import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, MapPin, Check, X, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Address } from '@/types';

export default function AccountAddresses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({
    label: '', full_name: '', phone: '', address: '', state: '', city: '', pin_code: '', landmark: '', is_default: false,
  });

  const fetchAddresses = async () => {
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAddresses(); }, []);

  const resetForm = () => {
    setForm({ label: '', full_name: '', phone: '', address: '', state: '', city: '', pin_code: '', landmark: '', is_default: false });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await supabase.from('addresses').update(form).eq('id', editing.id);
      if (error) toast('Failed to update address', 'error');
      else toast('Address updated', 'success');
    } else {
      const { error } = await supabase.from('addresses').insert({ ...form, user_id: user!.id });
      if (error) toast('Failed to add address', 'error');
      else toast('Address added', 'success');
    }
    resetForm();
    fetchAddresses();
  };

  const handleEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      label: addr.label ?? '', full_name: addr.full_name, phone: addr.phone, address: addr.address,
      state: addr.state, city: addr.city, pin_code: addr.pin_code, landmark: addr.landmark ?? '', is_default: addr.is_default,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    toast('Address deleted', 'info');
    fetchAddresses();
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    toast('Default address updated', 'success');
    fetchAddresses();
  };

  if (loading) return <div className="card p-6"><div className="h-8 skeleton w-48 mb-4" />{[...Array(2)].map((_, i) => <div key={i} className="h-32 skeleton mb-3 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saved Addresses</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Address
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h2 className="font-bold mb-4">{editing ? 'Edit Address' : 'New Address'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Label (e.g. Home, Office)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field sm:col-span-2" />
            <input placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" />
            <input placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field sm:col-span-2" />
            <input placeholder="State" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" />
            <input placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
            <input placeholder="PIN Code" required value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} className="input-field" />
            <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="input-field" />
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="w-4 h-4 accent-primary-600" />
            <span className="text-sm">Set as default address</span>
          </label>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Save'} Address</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">No saved addresses yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="card p-5 relative">
              {addr.is_default && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 absolute top-4 right-4">Default</span>}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  {addr.label && <p className="text-xs text-slate-500 mb-0.5">{addr.label}</p>}
                  <p className="font-medium">{addr.full_name}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {addr.address}<br />
                {addr.city}, {addr.state} - {addr.pin_code}<br />
                Phone: {addr.phone}
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(addr)} className="btn-ghost text-xs inline-flex items-center gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(addr.id)} className="btn-ghost text-xs text-red-600 inline-flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} className="btn-ghost text-xs inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" /> Set Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
