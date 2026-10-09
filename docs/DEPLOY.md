# Put it online

Everything built with Lucid UI is plain files: one `index.html`, your scripts and styles. Any web host can serve them, with no server code and no build step. Pick the way that suits you.

## The quickest: publish from Builder

In Builder, open **Share** and choose **Publish**. You get two links:

- **App link**, such as `build.lucidui.dev/a/k7Qm2xPa`, runs your app full screen for anyone. On a phone it can be added to the home screen.
- **Remix link** opens it in Builder as the visitor's own copy.

Nothing to set up, and it's free. Publish again after changes to share the latest version.

## Your own hosting (cPanel)

For hosts with cPanel, such as Bluehost, Namecheap, HostGator, SiteGround and most shared hosting.

1. In Builder, choose **Export → Download project (.zip)**. You get `index.html`, your files and a README.
2. Sign in to cPanel and open **File Manager**.
3. Go to the folder for your site: `public_html` for your main domain, or the folder cPanel made for a subdomain or addon domain.
4. Choose **Upload**, pick the zip, then go back, select the zip and choose **Extract**.
5. Open your domain. The app loads Lucid UI from the CDN, so there's nothing else to install.

To put it in a subfolder, such as `yoursite.com/timer/`, create the folder first and extract into it.

If the page is blank, check that `index.html` and `app.js` sit side by side in the folder your domain points to. Extracting into an extra folder is the usual cause.

## Netlify Drop

1. Download the project zip from Builder and unzip it.
2. Open `app.netlify.com/drop` and drag the folder onto the page.
3. Netlify gives you a live address in seconds. Sign in to keep it and add your own domain.

## GitHub, Vercel and Cloudflare Pages

Put the files in a GitHub repository, then import that repository on Vercel, Netlify or Cloudflare Pages. Choose **no framework** and leave the build command empty; the output folder is the repository root. Every push to GitHub then updates the site.

GitHub Pages works too: in the repository's **Settings → Pages**, publish from the main branch.

## WordPress

Use the Lucid UI plugin and the `[lucid]` shortcode. See [WordPress](WORDPRESS.md).

## Opening the file on your computer

Double-clicking `index.html` won't work: browsers block JavaScript modules on `file://` addresses. Serve the folder instead, for example with `npx serve .`, then open the address it prints.
