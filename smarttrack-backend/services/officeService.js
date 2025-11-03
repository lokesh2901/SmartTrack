import supabase from '../supabaseClient.js';

// ------------------------- ADD OFFICE -------------------------
export const addOfficeService = async (name, latitude, longitude, radius) => {
  try {
    const { data, error } = await supabase
      .from('offices')
      .insert([{ name, latitude, longitude, radius }])
      .select(); // ✅ ensures inserted record is returned

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Inserted office:', data);
    return data[0]; // return the inserted object
  } catch (err) {
    console.error('Error in addOfficeService:', err.message);
    throw err;
  }
};

// ------------------------- GET ALL OFFICES -------------------------
export const getOfficesService = async () => {
  try {
    const { data, error } = await supabase
      .from('offices')
      .select('*');

    if (error) {
      console.error('Supabase select error:', error);
      throw error;
    }

    console.log('Fetched offices:', data);
    return data;
  } catch (err) {
    console.error('Error in getOfficesService:', err.message);
    throw err;
  }
};

// ------------------------- UPDATE OFFICE -------------------------
export const updateOfficeService = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('offices')
      .update(updates)
      .eq('id', id)
      .select(); // ✅ ensures updated record is returned

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Updated office:', data);
    return data[0];
  } catch (err) {
    console.error('Error in updateOfficeService:', err.message);
    throw err;
  }
};

// ------------------------- DELETE OFFICE -------------------------
export const deleteOfficeService = async (id) => {
  try {
    const { data, error } = await supabase
      .from('offices')
      .delete()
      .eq('id', id)
      .select(); // ✅ ensures deleted record is returned

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    console.log('Deleted office:', data);
    return data[0];
  } catch (err) {
    console.error('Error in deleteOfficeService:', err.message);
    throw err;
  }
};
