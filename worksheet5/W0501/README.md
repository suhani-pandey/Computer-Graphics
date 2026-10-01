# Part 1 — Putting the solutions on a secret page on the DTU student homepage

This part is done on the DTU servers with your own DTU login, so there is no
code for it here — just the steps. Replace `sXXXXXX` with your student number
and `SECRET` with a folder name nobody can guess (and never link to it
anywhere public).

The gbar tutorials linked in the worksheet are the reference:
[student homepage](https://www4.gbar.dtu.dk/?page_id=168),
[file transfer](https://www4.gbar.dtu.dk/?page_id=203),
[SCP](https://www4.gbar.dtu.dk/?page_id=88).

## Steps

1. **Set up the homepage folder** (first time only). Log in to the gbar and
   follow the student homepage tutorial. If its script for linking your
   `public_html` folder fails, find the homepage path (of the form
   `/www/xx/x/public_html`, see the tutorial) and link it from your home
   directory:

   ```bash
   ssh sXXXXXX@login.gbar.dtu.dk
   ln -s /www/xx/x/public_html public_html
   ```

2. **Stop the top folder from being browsable** by putting an `index.html`
   in it (it can be empty), and make the secret folder:

   ```bash
   touch ~/public_html/index.html
   mkdir ~/public_html/SECRET
   exit
   ```

3. **Upload the worksheets** from the root of this repository on your own
   computer. Each worksheet folder keeps its JavaScript libraries (`MV.js`,
   and for worksheet 5 `OBJParser.js`) in the worksheet folder and each
   solution in its own subfolder, which is the layout the pages expect
   (`../MV.js`), so upload the folders as they are:

   ```bash
   scp -r worksheet4 worksheet5 sXXXXXX@login.gbar.dtu.dk:public_html/SECRET/
   ```

   This also uploads the model for Part 2 (`worksheet5/W0502/teapot.obj`).
   If the pages later fail to load files, make them readable by the web
   server:

   ```bash
   ssh sXXXXXX@login.gbar.dtu.dk "chmod -R a+rX ~/public_html/SECRET"
   ```

4. **Check it:** open a previous solution through your homepage address
   (see the student homepage tutorial for the exact address), for example
   `…/~sXXXXXX/SECRET/worksheet4/W0405/`. The part is complete when it loads
   and runs in the browser.

Loading the OBJ file in Parts 3 and 4 only works when the pages are served by
a web server like this (or locally with `python3 localserver.py <port>` from
the repository root) — not when `index.html` is opened directly as a file.

Note that this repository's GitHub Pages site is public and lists every
file, so it is not a "secret" page in the sense the worksheet asks for.
