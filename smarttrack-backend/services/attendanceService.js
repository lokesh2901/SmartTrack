import supabase from '../supabaseClient.js';
import { isWithinRadius } from '../utils/geoUtils.js';

/**
 * Check in a user at an office within radius.
 * @param {string} user_id - UUID of the user
 * @param {number} latitude - current latitude
 * @param {number} longitude - current longitude
 * @returns {Object} attendance record
 */
export const checkInService = async (user_id, latitude, longitude) => {
  // Fetch all offices
  const { data: offices, error } = await supabase.from('offices').select('*');
  if (error) throw new Error(error.message);

  // Find office within radius
  const office = offices.find(o =>
    isWithinRadius(latitude, longitude, o.latitude, o.longitude, o.radius)
  );

  if (!office) throw new Error('You are not within any office radius');

  // Insert check-in record
  const { data, error: insertError } = await supabase
    .from('attendance')
    .insert([{
      user_id,
      checkin_office_id: office.id,
      checkin_latitude: latitude,
      checkin_longitude: longitude,
      checkin_time: new Date(),
      status: 'present'  // ✅ must match check constraint
    }])
    .select();

  if (insertError) throw new Error(insertError.message);

  return data[0];
};

/**
 * Check out a user at an office within radius.
 * @param {string} user_id - UUID of the user
 * @param {number} latitude - current latitude
 * @param {number} longitude - current longitude
 * @returns {Object} updated attendance record
 */
export const checkOutService = async (user_id, latitude, longitude) => {
  // Fetch all offices
  const { data: offices, error } = await supabase.from('offices').select('*');
  if (error) throw new Error(error.message);

  // Find office within radius
  const office = offices.find(o =>
    isWithinRadius(latitude, longitude, o.latitude, o.longitude, o.radius)
  );

  if (!office) throw new Error('You are not within any office radius');

  // Update checkout record for today
  const { data, error: updateError } = await supabase
    .from('attendance')
    .update({
      checkout_office_id: office.id,
      checkout_latitude: latitude,
      checkout_longitude: longitude,
      checkout_time: new Date(),
      status: 'present'  // ✅ keep consistent
    })
    .eq('user_id', user_id)
    .eq('checkin_office_id', office.id)
    .is('checkout_time', null)
    .select();

  if (updateError) throw new Error(updateError.message);
  if (!data.length) throw new Error('No active check-in found for today');

  return data[0];
};
