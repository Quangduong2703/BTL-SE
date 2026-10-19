require('dotenv').config();
const { getUserByEmail, createUserFromAuthIdentity } = require('../models/userModel');
const { getSupabaseIssuer, getSupabaseJwksUrl } = require('../supabase');

let joseModulePromise = null;
let jwksResolverPromise = null;

function getJoseModule() {
  if (!joseModulePromise) {
    joseModulePromise = import('jose');
  }
  return joseModulePromise;
}

async function getJwksResolver() {
  if (!jwksResolverPromise) {
    const { createRemoteJWKSet } = await getJoseModule();
    jwksResolverPromise = createRemoteJWKSet(new URL(getSupabaseJwksUrl()));
  }
  return jwksResolverPromise;
}

async function verifySupabaseToken(token) {
  const { jwtVerify } = await getJoseModule();
  const jwks = await getJwksResolver();

  const { payload } = await jwtVerify(token, jwks, {
    issuer: getSupabaseIssuer(),
    audience: 'authenticated',
  });

  return payload;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = await verifySupabaseToken(token);
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUserFromAuthIdentity({
        authUserId: decoded.sub || null,
        email,
        name: decoded.user_metadata?.name || decoded.user_metadata?.full_name || email,
      });
    }
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned.' });
    }

    req.userId = user.profileId || user.id;
    req.userLegacyId = user.id || null;
    req.userProfileId = user.profileId || null;
    req.userRole = user.role;
    req.userStatus = user.status;
    req.user = user;
    req.auth = {
      supabaseUserId: decoded.sub || null,
      email,
      claims: decoded,
      accessToken: token,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = {
  authMiddleware,
};
