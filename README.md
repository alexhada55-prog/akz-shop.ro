# AKZ.ro — shop cu admin real (Netlify)

## Ce conține
- `public/index.html` — site-ul (același design ca în demo)
- `netlify/functions/login.mjs` — verifică parola de admin pe server
- `netlify/functions/products.mjs` — citește / salvează produsele (Netlify Blobs)
- `netlify.toml`, `package.json` — configurație

Parola NU se află în cod. Ea stă doar în setările Netlify.

## Pași de publicare (metoda recomandată: GitHub)
1. Creează un repository nou pe GitHub și încarcă tot conținutul acestui folder (păstrând structura).
2. În Netlify: **Add new site → Import an existing project** → alegi repository-ul → **Deploy**.
   (Netlify instalează singur dependența din `package.json`.)
3. În Netlify: **Site configuration → Environment variables** adaugă două variabile:
   - `ADMIN_PASSWORD` — parola de admin (lungă, ex. 16+ caractere)
   - `SESSION_SECRET` — un text aleator lung (40+ caractere), pe care nu îl ții minte și nu îl dai nimănui
4. **Deploys → Trigger deploy → Deploy site** (ca variabilele să fie folosite).
5. Deschide site-ul, jos apasă **Admin**, introdu parola și gestionează produsele.

Alternativă fără GitHub: Netlify CLI (`npm i -g netlify-cli`, apoi `netlify deploy --prod` în acest folder).
Nu garantez că „drag & drop” instalează dependențele funcțiilor; folosește GitHub sau CLI.

## Cum funcționează
- Vizitatorii văd produsele salvate pe server. Până la primul salvat din admin se afișează produsele demo.
- Adminul se autentifică, primește un token valid 8 ore; doar cu el se pot salva produse.
- Serverul acceptă doar câmpurile așteptate (nume, preț, categorie, etichetă, pictogramă, mărimi, poză) și refuză restul.

## Limite
- Pozele sunt micșorate automat (480 px) și salvate în lista de produse. Total maxim ~5 MB pe salvare (aprox. 80–100 produse cu poză).
  Dacă shop-ul crește mult, pozele se mută în stocare separată.
- Schimbarea parolei: modifici `ADMIN_PASSWORD` în Netlify și redeployezi.
- Comenzile rămân pe Email/WhatsApp; nu se stochează nimic despre clienți. Nu uita să pui în `index.html`
  emailul și numărul de WhatsApp reale (căută `ORDER_EMAIL` și `WHATSAPP_NUMBER`).
