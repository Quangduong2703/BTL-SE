const {
  ROOT_ADMIN_ID,
  isRootAdminUser,
  listAdminUsers,
  getAdminUserById,
  updateAdminUserRole,
  updateAdminUserStatus,
  countAdmins,
  resetAdminUserStudyData,
  deleteAdminUser,
} = require('../models/adminUserModel');
const {
  parsePaginationQuery,
  parseSearchQuery,
  buildPaginationMeta,
} = require('../utils/adminQuery');

const ALLOWED_ROLES = new Set(['user', 'admin']);
const ALLOWED_STATUSES = new Set(['active', 'banned']);

function parseRoleFilter(query = {}) {
  const role = typeof query.role === 'string' ? query.role.trim().toLowerCase() : '';
  return ALLOWED_ROLES.has(role) ? role : '';
}

function parseStatusFilter(query = {}) {
  const status = typeof query.status === 'string' ? query.status.trim().toLowerCase() : '';
  return ALLOWED_STATUSES.has(status) ? status : '';
}

async function fetchAdminUsers(query) {
  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const role = parseRoleFilter(query);
  const status = parseStatusFilter(query);
  const result = await listAdminUsers({ limit, offset, search, role, status });

  return {
    items: result.items,
    meta: buildPaginationMeta({
      page,
      limit,
      total: result.total,
    }),
    filters: {
      search,
      role: role || null,
      status: status || null,
    },
  };
}

async function fetchAdminUser(userId) {
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    throw Object.assign(new Error('Invalid user id'), { status: 400 });
  }

  const user = await getAdminUserById(parsedUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return user;
}

async function changeAdminUserRole(actorUserId, userId, nextRole) {
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    throw Object.assign(new Error('Invalid user id'), { status: 400 });
  }

  const normalizedRole = typeof nextRole === 'string' ? nextRole.trim().toLowerCase() : '';
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  }

  const user = await getAdminUserById(parsedUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (user.role === normalizedRole) {
    return user;
  }

  if (isRootAdminUser(user)) {
    throw Object.assign(new Error('Root admin account cannot change role.'), { status: 400 });
  }

  if (Number(actorUserId) === parsedUserId && normalizedRole !== 'admin') {
    throw Object.assign(new Error('You cannot remove your own admin role.'), { status: 400 });
  }

  if (user.role === 'admin' && normalizedRole !== 'admin') {
    const activeAdminCount = await countAdmins({ status: 'active' });
    if (activeAdminCount <= 1 && user.status === 'active') {
      throw Object.assign(new Error('At least one active admin account is required.'), { status: 400 });
    }
  }

  const updated = await updateAdminUserRole(parsedUserId, normalizedRole);
  if (!updated) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return getAdminUserById(parsedUserId);
}

async function changeAdminUserStatus(actorUserId, userId, nextStatus) {
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    throw Object.assign(new Error('Invalid user id'), { status: 400 });
  }

  const normalizedStatus = typeof nextStatus === 'string' ? nextStatus.trim().toLowerCase() : '';
  if (!ALLOWED_STATUSES.has(normalizedStatus)) {
    throw Object.assign(new Error('Invalid status'), { status: 400 });
  }

  const user = await getAdminUserById(parsedUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (user.status === normalizedStatus) {
    return user;
  }

  if (isRootAdminUser(user)) {
    throw Object.assign(new Error('Root admin account cannot be banned.'), { status: 400 });
  }

  if (Number(actorUserId) === parsedUserId && normalizedStatus !== 'active') {
    throw Object.assign(new Error('You cannot ban your own account.'), { status: 400 });
  }

  if (user.role === 'admin' && user.status === 'active' && normalizedStatus !== 'active') {
    const activeAdminCount = await countAdmins({ status: 'active' });
    if (activeAdminCount <= 1) {
      throw Object.assign(new Error('At least one active admin account is required.'), { status: 400 });
    }
  }

  const updated = await updateAdminUserStatus(parsedUserId, normalizedStatus);
  if (!updated) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return getAdminUserById(parsedUserId);
}

async function resetAdminUserStudy(actorUserId, userId) {
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    throw Object.assign(new Error('Invalid user id'), { status: 400 });
  }

  const user = await getAdminUserById(parsedUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const actorUser = await getAdminUserById(actorUserId);

  if (isRootAdminUser(user) && !isRootAdminUser(actorUser)) {
    throw Object.assign(new Error('Only root admin can reset root admin study data.'), { status: 403 });
  }

  await resetAdminUserStudyData(parsedUserId);
  return getAdminUserById(parsedUserId);
}

async function removeAdminUser(actorUserId, userId) {
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    throw Object.assign(new Error('Invalid user id'), { status: 400 });
  }

  const user = await getAdminUserById(parsedUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (isRootAdminUser(user)) {
    throw Object.assign(new Error('Root admin account cannot be deleted.'), { status: 400 });
  }

  if (Number(actorUserId) === parsedUserId) {
    throw Object.assign(new Error('You cannot delete your own account.'), { status: 400 });
  }

  if (user.role === 'admin' && user.status === 'active') {
    const activeAdminCount = await countAdmins({ status: 'active' });
    if (activeAdminCount <= 1) {
      throw Object.assign(new Error('At least one active admin account is required.'), { status: 400 });
    }
  }

  const deleted = await deleteAdminUser(parsedUserId);
  if (!deleted) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return {
    id: parsedUserId,
    email: user.email,
  };
}

module.exports = {
  fetchAdminUsers,
  fetchAdminUser,
  changeAdminUserRole,
  changeAdminUserStatus,
  resetAdminUserStudy,
  removeAdminUser,
};
