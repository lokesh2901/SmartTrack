// testSupabase.js
import supabase from './supabaseClient.js';
import { isWithinRadius } from './utils/geoUtils.js';
import dotenv from 'dotenv';
dotenv.config();

const testUserId = '47fa3cc9-0972-467c-8e3b-11f019bd759d'; // Replace with your employee id
const testLatitude = 12.9716; // Replace with current latitude near office
const testLongitude = 77.5946; // Replace with current longitude near office

const runTest = async () => {
  try {
    console.log('--- Testing Check-In ---');

    // Fetch offices
    console.log('Fetching offices for check-in...');
    const { data: offices, error: officeError } = await supabase.from('offices').select('*');
    if (officeError) throw officeError;

    // Find office within radius
    const office = offices.find((o) =>
      isWithinRadius(testLatitude, testLongitude, o.latitude, o.longitude, o.radius)
    );
    if (!office) throw new Error('You are not within any office radius');

    console.log('Office found for check-in:', office.id);

    // Insert check-in
    const { data: checkinData, error: checkinError } = await supabase
      .from('attendance')
      .insert([{
        user_id: testUserId,
        checkin_office_id: office.id,
        checkin_latitude: testLatitude,
        checkin_longitude: testLongitude,
        checkin_time: new Date(),
        status: 'checked_in' // ✅ must match allowed values in your DB
      }])
      .select()
      .single();

    if (checkinError) throw checkinError;
    console.log('Check-in successful:', checkinData);

    console.log('--- Testing Check-Out ---');

    // Update checkout
    const { data: checkoutData, error: checkoutError } = await supabase
      .from('attendance')
      .update({
        checkout_office_id: office.id,
        checkout_latitude: testLatitude,
        checkout_longitude: testLongitude,
        checkout_time: new Date(),
        status: 'checked_out' // ✅ must match allowed values in your DB
      })
      .eq('user_id', testUserId)
      .eq('checkin_office_id', office.id)
      .is('checkout_time', null)
      .select()
      .single();

    if (checkoutError) throw checkoutError;
    console.log('Check-out successful:', checkoutData);

  } catch (err) {
    console.error('Supabase test error:', err);
  }
};

runTest();
