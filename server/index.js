require('dotenv').config();
const app = require('./app');
const {
  ensureDefaultAdminUser,
  ensureDefaultDemoUser,
  DEFAULT_ADMIN_LOGIN_ALIAS,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_DEMO_LOGIN_ALIAS,
  DEFAULT_DEMO_EMAIL,
  DEFAULT_DEMO_PASSWORD,
} = require('./models/userModel');
const { ensureSupabaseAuthUser, hasSupabaseAdmin } = require('./supabase');

const port = process.env.PORT || 4000;

async function startServer() {
  try {
    if (hasSupabaseAdmin) {
      try {
        await ensureSupabaseAuthUser({
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          name: 'Admin',
        });
        await ensureSupabaseAuthUser({
          email: DEFAULT_DEMO_EMAIL,
          password: DEFAULT_DEMO_PASSWORD,
          name: 'User Test',
        });
      } catch (bootstrapError) {
        console.warn('Supabase bootstrap skipped, continuing server startup:', bootstrapError.message);
      }
    }
    try {
      await ensureDefaultAdminUser();
    } catch (adminBootstrapError) {
      console.warn('Default admin bootstrap skipped:', adminBootstrapError.message);
    }

    try {
      await ensureDefaultDemoUser();
    } catch (demoBootstrapError) {
      console.warn('Default demo bootstrap skipped:', demoBootstrapError.message);
    }
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Default admin ready: ${DEFAULT_ADMIN_LOGIN_ALIAS} / ${DEFAULT_ADMIN_PASSWORD}`);
      console.log(`Default demo user ready: ${DEFAULT_DEMO_LOGIN_ALIAS} / ${DEFAULT_DEMO_PASSWORD}`);
    });
  } catch (error) {
    console.error('Failed to bootstrap default accounts:', error);
    process.exit(1);
  }
}

startServer();
