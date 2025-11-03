import axios from 'axios';

// Replace these with actual user tokens and office IDs
const users = [
  { id: '47fa3cc9-0972-467c-8e3b-11f019bd759d', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ3ZmEzY2M5LTA5NzItNDY3Yy04ZTNiLTExZjAxOWJkNzU5ZCIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc2MTQxNjQ2MiwiZXhwIjoxNzYyMDIxMjYyfQ.dQpDPs3pc8BKQK8tI0IZrYTbQDErncPF6osGWQShdSE' },
  { id: 'a121cf76-b627-4a81-8384-1125cfb280d0', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImExMjFjZjc2LWI2MjctNGE4MS04Mzg0LTExMjVjZmIyODBkMCIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc2MTQxNjQ4NCwiZXhwIjoxNzYyMDIxMjg0fQ.DykSeA8Vk3s45dk6aQh8t6nkJ-Wy-kO8EKEpccXmUw8' },
  { id: '9340e771-3cd6-44f6-b4be-724e54fc254f', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkzNDBlNzcxLTNjZDYtNDRmNi1iNGJlLTcyNGU1NGZjMjU0ZiIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc2MTQxNjUwMSwiZXhwIjoxNzYyMDIxMzAxfQ.ABwg0hUdKwSACJZEkCBvz-qUDmAQKC4YyFv9mfDgWIw' },
];

const officeA = { id: '3c6b5969-15bb-467a-8585-54e6141a141e', latitude: 12.9715987, longitude: 77.594566 }; // Office A coords
const officeB = { id: '660fb7a5-ce1e-422f-a38c-67557e9ba27c', latitude: 12.7606299, longitude: 80.0011508 }; // Office B coords

async function batchTest() {
  console.log('=== STARTING BATCH CHECK-IN (Office A) ===\n');

  for (const user of users) {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/attendance/checkin',
        { user_id: user.id, office_id: officeA.id, latitude: officeA.latitude, longitude: officeA.longitude },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      console.log(`[CHECK-IN SUCCESS] ${user.id} | ${res.data.message}`);
    } catch (err) {
      console.log(`[CHECK-IN ERROR] ${user.id} | ${err.response?.data?.message || err.message}`);
    }
  }

  console.log('\n=== STARTING BATCH CHECK-OUT (Office B) ===\n');

  for (const user of users) {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/attendance/checkout',
        { user_id: user.id, office_id: officeB.id, latitude: officeB.latitude, longitude: officeB.longitude },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      console.log(`[CHECK-OUT SUCCESS] ${user.id} | ${res.data.message}`);
    } catch (err) {
      console.log(`[CHECK-OUT ERROR] ${user.id} | ${err.response?.data?.message || err.message}`);
    }
  }
}

batchTest();
