
# Patrimoine App

Tableau de bord perso pour gérer ton patrimoine (Assurance-vie, Métaux, PEA, Livret, CTO, Crypto) avec projections et allocation.

## Lancer en local (privé)
```bash
npm install
npm run dev
```
Puis ouvre http://localhost:3000

## Déployer sur Vercel (protégé par mot de passe)
1. Déploie ce repo sur Vercel.
2. Dans *Project → Settings → Environment Variables*, ajoute :
   - `BASIC_USER` = ton login
   - `BASIC_PASS` = ton mot de passe
3. Redeploy. Tu auras une fenêtre d’auth (Basic Auth).

> Si tu ne mets pas `BASIC_USER`/`BASIC_PASS`, l'app reste publique (pas d'auth).
