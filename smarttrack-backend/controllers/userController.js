import supabase from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// -------------------- ADD USER --------------------
export const addUser = async (req, res) => {
  try {
    const { employee_id, name, email, phone_number, password, role } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ employee_id, name, email, phone_number, password_hash, role }])
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: 'User added', user: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- UPDATE USER --------------------
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If password is included, hash it
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: 'User updated', user: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- GET USERS --------------------
export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- LOGIN USER --------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(400).json({ message: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// -------------------- DELETE USER --------------------
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
