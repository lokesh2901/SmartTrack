import supabase from '../supabaseClient.js';
import bcrypt from 'bcryptjs';

export const addUserService = async ({ name, email, phone_number, role, employee_id, password }) => {
  const password_hash = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from('users').insert([{ name, email, phone_number, role, employee_id, password_hash }]);
  if (error) throw error;
  return data;
};

export const updateUserService = async (id, updates) => {
  if (updates.password) updates.password_hash = bcrypt.hashSync(updates.password, 10);
  delete updates.password;

  const { data, error } = await supabase.from('users').update(updates).eq('id', id);
  if (error) throw error;
  return data;
};

export const getUsersService = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
};
