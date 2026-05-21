# Automated GitHub Pages CMS for Musfiq R. Farhan's Official Website

This repository implements an automated Content Management System (CMS) for Musfiq R. Farhan's official GitHub Pages website. The system is designed to streamline content updates by automatically processing Markdown (`.md`) and YAML (`.yml`/`.yaml`) files from designated content folders and injecting their data into the `index.html` file. This ensures that the website always displays the latest information without manual HTML editing.

## Content Folder Structure

The website's dynamic content is sourced from the following six folders in the repository root. Each folder corresponds to a specific section of the website:

1.  `recent-releases`: Contains information about Musfiq R. Farhan's latest released projects.
2.  `the-media-hub`: Houses data for a broader collection of media projects.
3.  `latest-coming-soon`: Details for upcoming projects, typically featuring the most prominent next release.
4.  `premiering-2026`: Content related to projects scheduled for premiere in 2026.
5.  `exclusive-bts-stills`: Markdown files referencing URLs for exclusive behind-the-scenes images.
6.  `newsroom`: Articles and press releases related to Musfiq R. Farhan's career and achievements.

## How to Add/Update Content

To update the website, simply add new Markdown (`.md`) or YAML (`.yml`, `.yaml`) files, or modify existing ones, within the relevant content folders. Each file should contain **YAML frontmatter** at the top, defining the structured data for that content item.

Upon a `push` to the `main` branch affecting any of these content folders or the `update_index.py` script, a GitHub Actions workflow will automatically trigger. This workflow executes the `update_index.py` script, which reads your content files, processes them, and updates the `index.html` file accordingly. The updated `index.html` is then committed and pushed back to the repository, making your changes live on GitHub Pages.

### Example Markdown File with YAML Frontmatter

Here's an example of a Markdown file you might use in the `recent-releases` or `the-media-hub` folder. The script expects specific keys for proper rendering.

**File:** `recent-releases/new-project-title.md`

```markdown
---
title: "New Project Title"
url: "https://youtu.be/YOUR_YOUTUBE_VIDEO_ID"
tag: "New Release"
cast: ["Musfiq R Farhan", "Another Actor"]
---
```

**Explanation of Fields:**

*   `title`: The title of the project (e.g., "New Project Title").
*   `url`: The YouTube URL of the video. The script automatically extracts the video ID.
*   `tag`: A short tag to categorize the release (e.g., "New Release", "Featured").
*   `cast`: (Optional) A list of cast members. This is used for sections like 'Latest Coming Soon'.

For `exclusive-bts-stills`:

**File:** `exclusive-bts-stills/bts-session-2.md`

```markdown
---
title: "Behind The Scenes - Session 2"
images:
  - url: "https://i.postimg.cc/YOUR_IMAGE_URL_1.jpg"
    alt: "BTS Image 1"
  - url: "https://i.postimg.cc/YOUR_IMAGE_URL_2.jpg"
    alt: "BTS Image 2"
---
```

For `newsroom`:

**File:** `newsroom/new-award-announcement.md`

```markdown
---
title: "Musfiq R. Farhan Wins Prestigious Award"
date: "2026-05-21"
summary: "Musfiq R. Farhan has been honored with the 'Best Actor' award at the annual film festival for his outstanding performance in 'Project X'."
url: "https://example.com/news/award-article"
---
```

## Safety Mechanisms: Ensuring Your Website Never Breaks

The `update_index.py` script is engineered with robust fail-safes and best practices to prevent the website from breaking or displaying blank content, even under unexpected conditions. This was a critical requirement given past issues, and the following mechanisms are in place:

1.  **Graceful YAML Frontmatter Parsing:**
    *   The `parse_frontmatter` function uses `PyYAML`'s `yaml.safe_load()` method, which is designed to safely parse YAML content, preventing arbitrary code execution and handling malformed YAML gracefully. If a file's frontmatter is invalid or missing, it defaults to an empty dictionary, ensuring the script doesn't crash and can continue processing other files.
    *   It also attempts to parse the entire file as YAML if no explicit frontmatter markers (`---`) are found, providing flexibility.

2.  **Robust Folder and File Handling:**
    *   The `process_folders` function explicitly checks if each content folder (`recent-releases`, `the-media-hub`, etc.) exists using `os.path.exists()`. If a folder is missing, it is simply skipped, preventing file system errors.
    *   It iterates through files, only processing those ending with `.md`, `.yml`, or `.yaml`. Other files are ignored, preventing unexpected data from being processed.
    *   If a content file is empty or contains no valid data after parsing, it is skipped, ensuring no empty or malformed data is injected into the HTML.

3.  **Safe JavaScript Data Injection (`json.dumps`):**
    *   For sections like "Recent Releases" and "The Media Hub," which rely on JavaScript objects (`videosData`) embedded directly in `index.html`, the script uses Python's `json.dumps()` function. This guarantees that the data is converted into a **syntactically correct JSON string**, which is then directly inserted into the JavaScript section of `index.html`. This prevents JavaScript errors that could arise from improperly formatted data.
    *   If no new video data is found for a category, the script ensures that the existing `videosData` structure remains intact, preventing the carousel from going blank.

4.  **Targeted HTML Updates with Injection Markers:**
    *   Instead of attempting to re-parse and rewrite the entire `index.html` using a full HTML parser like BeautifulSoup for all sections (which can sometimes alter original formatting or script tags), the script employs a more precise method for dynamic sections like "Exclusive BTS Stills" and "Newsroom."
    *   It uses **HTML comments as injection markers** (`<!-- BTS_STILLS_INJECTION_START -->`, `<!-- BTS_STILLS_INJECTION_END -->`, etc.). The script finds these markers using regular expressions and replaces *only the content between them* with the newly generated HTML. This approach ensures that:
        *   The surrounding HTML structure, CSS, and JavaScript outside these specific content blocks remain untouched.
        *   The risk of accidentally breaking the website's layout or functionality due to parser-induced changes is minimized.

5.  **Conditional Content Rendering:**
    *   The script only attempts to update a section if it finds valid data for that section from the content folders. If a folder is empty or its files contain no usable data, the corresponding section in `index.html` will retain its previous content or remain as it was, rather than being cleared or broken.

By combining these strategies, the automated CMS provides a highly resilient and safe method for updating your GitHub Pages website, ensuring a consistent and functional user interface at all times.

## GitHub Actions Workflow (`.github/workflows/update-website.yml`)

The automation is orchestrated by a GitHub Actions workflow. This workflow is triggered on every `push` to the `main` branch if changes are detected in any of the content folders or the `update_index.py` script itself. It performs the following steps:

1.  **Checkout repository:** Fetches the latest code.
2.  **Set up Python:** Configures the Python environment.
3.  **Install dependencies:** Installs `pyyaml` and `beautifulsoup4`.
4.  **Run content update script:** Executes `update_index.py` to generate the new `index.html`.
5.  **Commit and push changes:** If `index.html` has changed, the workflow automatically commits the updated file using the `github-actions[bot]` user and pushes it back to the `main` branch. This step is configured to prevent Git push/rejected errors by using the `GITHUB_TOKEN` with appropriate permissions.

This setup ensures a fully automated, continuous deployment pipeline for your website's content.
