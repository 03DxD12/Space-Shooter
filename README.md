# AstroType: Typing Defender

AstroType is a browser-based typing defense game. Type the words on incoming asteroids to lock on, fire, and protect your ship. It includes Easy, Normal, and Hard modes, progressive difficulty, power-ups, local high scores, sound effects, responsive layouts, and pause/game-over flows.

The game is entirely static: HTML, CSS, and vanilla JavaScript only. It requires no backend, database, package installation, or build step.

## Play locally

Open `index.html` in a modern desktop browser. No local server is required. A physical keyboard is recommended.

## Controls

- Type a visible asteroid word. Every correct letter fires one plasma blast, and the final letter destroys the asteroid.
- Press `Backspace` to clear the current target.
- Press `Escape` to pause or resume.
- Use the Sound control in the top-right corner to enable or disable audio.

High scores are stored in the current browser with `localStorage`. They are local records, not a shared online leaderboard.

## Deploy to GitHub Pages

### 1. Create the repository

Open [GitHub's new repository page](https://github.com/new) and enter:

- **Repository name:** `astrotype`
- **Description:** `A browser-based space typing defense game.` (optional)

### 2. Configuration

Choose these settings before creating the repository:

| Setting | Choose | Why |
| --- | --- | --- |
| **Visibility** | **Public** | Anyone can view the game, and GitHub Pages works with public repositories on GitHub Free. |
| **Add README** | **Off** | This project already includes `README.md`. |
| **Add .gitignore** | **None** | The game has no installed dependencies or generated build files. |
| **Choose a license** | **None** | No license is added automatically. You can choose one later if you want others to reuse or modify the code. |

Leave **Add README**, **Add .gitignore**, and **Choose a license** unselected when uploading these existing files. Initializing the GitHub repository with extra files can create avoidable conflicts with the local project.

Select **Create repository** when the configuration is complete.

### 3. Upload the game

Upload or push every project file to the repository. Keep `index.html` and `README.md` in the repository root.

### 4. Enable GitHub Pages

1. Open the `astrotype` repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select the **main** branch and the **/ (root)** folder.
5. Select **Save**.
6. Wait for GitHub Pages to finish publishing.

The game will then be available at a URL similar to:

```text
https://USERNAME.github.io/astrotype/
```

The exact URL depends on the GitHub username and repository name. All project references use relative paths, so the game works correctly from a GitHub Pages repository subfolder.

## Project structure

```text
astrotype/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── game.js
│   ├── asteroid.js
│   ├── player.js
│   ├── words.js
│   └── effects.js
└── assets/
    ├── images/
    └── sounds/
```

The asset folders are intentionally empty because the visual effects are drawn with Canvas/CSS and audio is synthesized with the Web Audio API.
