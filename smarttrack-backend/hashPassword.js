// hashPassword.js
import bcrypt from 'bcryptjs';

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('Usage: node hashPassword.js <password>');
  process.exit(1);
}

// Hash the password
const hash = bcrypt.hashSync(password, 10);

console.log(`Plain Password: ${password}`);
console.log(`Bcrypt Hash: ${hash}`);
