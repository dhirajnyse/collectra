# Collectra GitHub Setup

## Recommended Repository

Create a new empty GitHub repository named:

`Collectra`

Recommended settings:

- Visibility: private while building, public later when ready
- README: do not initialize on GitHub if we are pushing this local project first
- `.gitignore`: none
- License: none for now

## First Push Commands

Run these from:

`C:\Users\dhiraj\Documents\Codex\Collectra`

```powershell
git init
git add .
git commit -m "Initial Collectra app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/Collectra.git
git push -u origin main
```

## Simple Testing Options

1. Open `index.html` locally for immediate testing.
2. Use GitHub Pages for a public static demo.
3. Later move to Vercel or Netlify when the app has routing, auth, and APIs.

## GitHub Pages

After pushing:

1. Open the GitHub repo.
2. Go to Settings.
3. Go to Pages.
4. Select branch `main`.
5. Select folder `/root`.
6. Save.

GitHub will publish the static app once Pages finishes building.

