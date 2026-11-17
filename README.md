# Razor Portfolio

A simple, editable static website built with HTML, CSS, and JavaScript.

## 1) Preview it on your computer

1. Extract the ZIP file.
2. Install [Visual Studio Code](https://code.visualstudio.com/).
3. In VS Code, choose **File → Open Folder** and select the `razor_portfolio` folder.
4. In the Extensions tab, install **Live Server** by Ritwick Dey.
5. Right-click `index.html` and choose **Open with Live Server**.
6. Your browser will open a local preview. Save edits in VS Code and Live Server will refresh the page.

You can also double-click `index.html` to open a basic preview, but Live Server is recommended.

## 2) Edit the website

- `index.html` — home page and featured projects
- `about.html` — about page
- `skills.html` — skills page
- `contact.html` — contact and social links
- `style.css` — colors, fonts, spacing, layout, and responsive design
- `script.js` — mobile navigation and music-player behavior

Search the files for `TODO` to find suggested places to customize. You can use VS Code's **Ctrl+Shift+F** to search the whole folder.

## 3) Share it with people (publish it online)

The website is currently a set of files on your computer. To get a public link, publish the folder using a static website host. One option is GitHub Pages:

1. Create or sign in to a GitHub account.
2. Create a **public** repository for the portfolio.
3. Upload the contents of this `razor_portfolio` folder to the repository's top level. Make sure `index.html` is at the top level, not inside another nested folder.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/(root)`, then save.
6. GitHub will provide a public website URL in the Pages section after publishing finishes. Share that URL with people.

When you edit the files in VS Code, upload/commit the updated files to the same repository. GitHub Pages will publish the changes. Never put passwords, private information, or secret API keys in a public repository.

## Music player notes

- Visitors choose a local audio file and press Play themselves; browsers generally block autoplay.
- A visitor's selected audio file stays in that visitor's browser/device. It is not uploaded and is not shared with other visitors.
- If you want every visitor to hear the same track, add an audio file you have permission to use to the website and configure it as the default track in `script.js` (see the TODO there). Visitors may still need to press Play.

## Developer TODOs

Search for `TODO` to add project screenshots, completed projects, your Instagram link, skills, and custom colors/sections.
