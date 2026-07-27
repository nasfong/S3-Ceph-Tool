// Placeholder so local dev doesn't 404 on /env.js.
//
// In a container, docker-entrypoint.sh overwrites this file at startup with the
// real runtime values. Left empty, lib/env.ts falls back to the build-time values
// from .env — which is exactly what local dev wants.
window.__ENV__ = {};
