const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = new Database('./data/youtube-downloader.db');

function addUser(username, password, firstName = '', lastName = '', isAdmin = 0) {
  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, is_admin, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    stmt.run(id, username, passwordHash, firstName, lastName, isAdmin, now, now);
    console.log(`\nUser "${username}" created successfully!`);
    console.log(`ID: ${id}`);
    console.log(`Password: ${password}`);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.error(`\nError: Username "${username}" already exists.`);
    } else {
      console.error('\nError:', err.message);
    }
  }
}

function listUsers() {
  console.log('\nCurrent users in database:');
  const users = db.prepare('SELECT id, username, first_name, last_name, is_admin FROM users').all();
  if (users.length === 0) {
    console.log('  No users found.');
  } else {
    console.table(users);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('=== Add User Script ===');
  console.log('');
  console.log('Usage: node scripts/add-user.cjs <username> <password> [firstName] [lastName] [isAdmin]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/add-user.cjs ivan mypassword123');
  console.log('  node scripts/add-user.cjs ivan mypassword123 Ivan Petrov');
  console.log('  node scripts/add-user.cjs admin2 adminpass Admin User 1');
  listUsers();
  db.close();
  process.exit(1);
}

const [username, password, firstName, lastName, isAdmin] = args;
addUser(username, password, firstName || '', lastName || '', isAdmin ? parseInt(isAdmin) : 0);
listUsers();

db.close();
