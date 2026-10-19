const { ensureSupabaseEnabled, unwrapList, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');

async function createSupportTicket({ userId, type, title, content, sourcePage }) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const row = unwrapSingle(await admin
    .from('support_tickets')
    .insert({
      user_id: profileId,
      type,
      title,
      content,
      source_page: sourcePage || null,
    })
    .select('id')
    .single());

  return row.id;
}

async function listSupportTickets({ search, status, type, limit, offset }) {
  const admin = ensureSupabaseEnabled();
  let countQuery = admin
    .from('support_tickets')
    .select('*', { count: 'exact', head: true });

  let query = admin
    .from('support_tickets')
    .select('id, user_id, type, title, content, status, reviewer_id, source_page, created_at, updated_at, reviewed_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    const keyword = `%${search}%`;
    countQuery = countQuery.or(`title.ilike.${keyword},content.ilike.${keyword}`);
    query = query.or(`title.ilike.${keyword},content.ilike.${keyword}`);
  }
  if (status) {
    countQuery = countQuery.eq('status', status);
    query = query.eq('status', status);
  }
  if (type) {
    countQuery = countQuery.eq('type', type);
    query = query.eq('type', type);
  }

  const countResult = await countQuery;
  const rows = unwrapList(await query);

  const profileIds = [...new Set(rows.flatMap((row) => [row.user_id, row.reviewer_id].filter(Boolean)))];
  const profiles = profileIds.length
    ? unwrapList(await admin.from('profiles').select('id, email, name').in('id', profileIds))
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      status: row.status,
      sourcePage: row.source_page || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      userName: profileMap.get(row.user_id)?.name || null,
      userEmail: profileMap.get(row.user_id)?.email || null,
      reviewerName: profileMap.get(row.reviewer_id)?.name || null,
      reviewerEmail: profileMap.get(row.reviewer_id)?.email || null,
    })),
    total: Number(countResult.count || 0),
  };
}

async function getSupportTicketById(ticketId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('support_tickets')
    .select('id, user_id, type, title, content, status, reviewer_id, source_page, created_at, updated_at, reviewed_at')
    .eq('id', ticketId)
    .limit(1)
    .maybeSingle());

  if (!row) return null;

  const profileIds = [row.user_id, row.reviewer_id].filter(Boolean);
  const profiles = profileIds.length
    ? unwrapList(await admin.from('profiles').select('id, email, name').in('id', profileIds))
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    status: row.status,
    sourcePage: row.source_page || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    userName: profileMap.get(row.user_id)?.name || null,
    userEmail: profileMap.get(row.user_id)?.email || null,
    reviewerName: profileMap.get(row.reviewer_id)?.name || null,
    reviewerEmail: profileMap.get(row.reviewer_id)?.email || null,
  };
}

async function updateSupportTicketStatus({ ticketId, status, reviewerId }) {
  const admin = ensureSupabaseEnabled();
  const nextReviewerId = reviewerId ? await resolveProfileId(reviewerId) : null;
  const result = await admin
    .from('support_tickets')
    .update({
      status,
      reviewer_id: nextReviewerId,
      reviewed_at: status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select('id');

  return unwrapList(result).length > 0;
}

module.exports = {
  createSupportTicket,
  listSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
};
