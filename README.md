# avishaidayanimmusic.com

Static site for AviShai Dayanim, built by Jekyll and hosted on GitHub Pages
at the custom domain in `CNAME`. Content is edited through Sveltia CMS.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The whole site — one page, anchor-linked nav. Liquid loops pull content from `_data/`. |
| `_data/reel.yml` | Demo reel tracks, grouped by genre |
| `_data/credits.yml` | Credits marquee cards |
| `_data/press.yml` | "Recent News" articles |
| `_data/bio.yml` | Bio section text and photo |
| `admin/` | Sveltia CMS (`config.yml` defines the editing forms) |
| `styles.css`, `scripts.js` | Hand-written, not generated |
| `thankyou.html` | Where the contact form lands after submitting |
| `bio.html`, `contact.html`, `listen.html`, `overlay.html` | Redirect stubs for the old multi-page site. Safe to delete once search results stop pointing at them. |

Everything under `Audio/` and `Images/` is referenced by the site — the
unused leftovers were removed. Adding a file the CMS doesn't reference is
harmless; deleting one it does reference will break a card or a track.

## Editing content

**Locally, no GitHub login, nothing published:**

```
bundle install          # first time only
bundle exec jekyll serve
```

Open <http://localhost:4000/admin/> and choose **Work with Local
Repository**, then pick this folder. Edits write straight to `_data/*.yml`
on disk; the site rebuilds as you save. Commit and push when you're happy.
Requires a Chromium-based browser (Chrome or Edge) — the local mode uses
the File System Access API, which Safari and Firefox don't support.

### Seeing a change before you push it

GitHub is what actually builds the site, but you can render the page
locally to check a content edit first — no Ruby required:

```
uv run --with python-liquid --with markdown --with pyyaml tools/preview.py
```

That writes `preview.html` (gitignored) beside the real images and audio,
so the intro overlay, the player and the credit-card previews all behave
as they will live. Open it directly in a browser.

**Live, from anywhere:** go to
<https://www.avishaidayanimmusic.com/admin/> and click **Sign In with
GitHub**. Saving commits straight to `main`, and GitHub Pages rebuilds
within a minute or two — no terminal, no local server, works on a phone.

That login runs through a small Cloudflare Worker, because GitHub's API
won't accept a login from a static page on its own:

| Piece | Where |
| --- | --- |
| Worker | `sveltia-cms-auth.dayanim-music.workers.dev` (Cloudflare account, deployed from `VVSHAI15/sveltia-cms-auth`) |
| OAuth app | GitHub → Settings → Developer settings → *AviShai Dayanim Music CMS* |
| Client ID / secret | Worker's runtime variables — `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Never in this repo. |
| Who may use it | Worker's `ALLOWED_DOMAINS` — the live domain plus `localhost` |

If login ever breaks, check those four things in that order. Rotating the
secret means generating a new one on the OAuth app and updating the
Worker variable; nothing in this repo changes.

## How a change reaches the site

Push to `main` → GitHub Pages rebuilds with Jekyll → live within a minute
or two. There is no build step to run yourself and no CI configuration.

## The intro overlay

The letterboxed splash on first load is not decoration alone: browsers
refuse to play audio until the visitor has clicked, tapped, or typed
something, and the credit-card previews depend on that. The **Enter**
click supplies it and primes each cue so Safari will play them later.
Remove the overlay and the previews go silent until the visitor happens
to click something else.
