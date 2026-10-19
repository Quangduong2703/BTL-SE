function getAdminMeta(req, res) {
  res.json({
    data: {
      area: 'manager',
      version: 1,
      modules: ['overview', 'users', 'courses', 'topics'],
      currentUser: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        status: req.user.status,
      },
    },
  });
}

module.exports = {
  getAdminMeta,
};
