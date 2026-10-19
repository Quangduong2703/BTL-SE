const { seedUsersOnly } = require('./seed-supabase-production');

seedUsersOnly().catch((error) => {
  console.error('User seed failed:', error);
  process.exitCode = 1;
});
