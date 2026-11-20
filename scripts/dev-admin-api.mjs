import { createAdminRoleHandler } from '../api/admin-role.mjs';
import { createMonitoringHandler } from '../api/admin-monitoring.mjs';

export function createAdminMiddleware(env) {
  const handlers = {
    '/api/admin-role': createAdminRoleHandler(env),
    '/api/admin-monitoring': createMonitoringHandler(env),
  };
  return (req, res, next) => {
    const handler = handlers[new URL(req.url || '/', 'http://localhost').pathname];
    if (!handler) return next();
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
