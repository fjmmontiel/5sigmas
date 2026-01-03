1. Make the repo public
GitHub Pages sites are public on the internet even if the repo is private, but with GitHub Free it’s easier to just make the repo public and then enable Pages.

Change visibility:

    Go to your repo on GitHub.

    Settings → scroll to “Danger Zone”.

    Click Change visibility → choose Public.
    GitHub Docs

    Your code is now visible, but still no site until we enable Pages.

2. Deploy with MkDocs to a gh-pages branch

MkDocs has a built-in deploy command that builds the site and pushes it to a gh-pages branch.

In the repo (with venv active):
        mkdocs build          # optional, to verify locally
        mkdocs gh-deploy --clean


This will:

Build the static site.

Create/update a gh-pages branch with the built files.

Push it to GitHub.

You run this only when you want to update the live site.

3. Enable GitHub Pages for that branch

Now hook GitHub Pages to that gh-pages branch:

Go to Settings → Pages.

Under “Source” / “Build and deployment”:

Choose Deploy from a branch or GitHub Actions depending on UI.

If branch option is available, pick gh-pages.

Save.

GitHub will deploy, and you should see something like:

“Your site is ready to be published at https://5sigmas.com/.” 

At this point your site is live.

If you still want to stay semi-stealthy, you can:

Not link it anywhere for a few days.

Soft-launch by sharing only with a few trusted people.

Later you can add a custom domain by adding a CNAME file or using the Pages domain settings.