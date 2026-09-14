# INSTRUCTIONS.md — poloperator-reffing

Prochaines instructions à suivre :

- Vérifier que le réseau Docker externe `local-proxy` existe (stack caddy-docker-proxy) : `docker network ls | grep local-proxy` ; sinon `docker network create local-proxy`.
- Lancer `docker compose up` depuis la racine, puis vérifier l'accès à http://poloperator-reffing.localhost et le bon fonctionnement du HMR Vite (ajuster `server.allowedHosts`/`hmr` dans `vite.config.ts` si nécessaire).
- Vérifier que la variable CI GitLab `DEPLOY_WEBHOOK_URL` est définie dans les réglages CI/CD avant le prochain déploiement.
- Construire le backend NestJS + Postgres — à ce jour spec draft uniquement (`docs/superpowers/specs/2026-09-01-nestjs-backend-design.md`).
