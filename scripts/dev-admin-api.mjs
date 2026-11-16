import { createAdminRoleHandler } from '../api/admin-role.mjs';

export function createAdminMiddleware(env) {
  const handler = createAdminRoleHandler(env);
  return (req, res, next) => {
    if (new URL(req.url || '/', 'http://localhost').pathname !== '/api/admin-role') return next();
    res.status = (status) => {
      res.statusCode = status;
      return res;
    };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    void handler(req, res);
  };
}
