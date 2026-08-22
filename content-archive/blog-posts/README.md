# Blog Posts Folder

## 📝 How to Add Blog Posts

### Simple Steps:

1. **Create a new file** in this folder
2. **Name format:** `YYYY-MM-DD-title.md`
   - Example: `2026-05-14-my-first-blog.md`

3. **Copy this template** and fill in your content:

```markdown
---
title: Your Blog Title Here
date: 2026-05-14
author: Musfiq R. Farhan
category: Entertainment
excerpt: A brief summary of your blog post (1-2 sentences)
featured_image: https://drive.google.com/uc?export=view&id=YOUR_FILE_ID
---

# Your Blog Title

## Introduction
Write your introduction here...

## Main Content
Your main content goes here. You can use multiple sections.

### Subsection
Add subsections as needed.

## Conclusion
Wrap up your thoughts here.

---

**Tags:** #Entertainment #Drama #BehindTheScenes
```

### File Naming:
- **Good:** `2026-05-14-behind-the-scenes.md`
- **Good:** `2026-05-15-my-journey.md`
- **Bad:** `blog.md`
- **Bad:** `my post.md`

### Template Fields:

| Field | Required | Example |
|-------|----------|---------|
| title | Yes | "My Latest Project" |
| date | Yes | 2026-05-14 |
| author | Yes | "Musfiq R. Farhan" |
| category | Yes | Entertainment, Drama, News |
| excerpt | Yes | Brief 1-2 sentence summary |
| featured_image | Optional | Google Drive link |

### Categories:
- Entertainment
- Drama
- Behind-the-Scenes
- Industry Insights
- Personal
- News

### Adding Images to Blog:

In your blog post, add images like this:

```markdown
![Image Description](https://drive.google.com/uc?export=view&id=YOUR_FILE_ID)
```

### Example Blog Post:

```markdown
---
title: Behind the Scenes of Tipu Sultan
date: 2026-05-14
author: Musfiq R. Farhan
category: Behind-the-Scenes
excerpt: An exclusive look at the making of my latest drama project
featured_image: https://drive.google.com/uc?export=view&id=1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX
---

# Behind the Scenes of Tipu Sultan

## The Journey Begins

When I first read the script for Tipu Sultan, I knew this was going to be special...

## Challenges and Triumphs

![On Set](https://drive.google.com/uc?export=view&id=1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX)

The production was intense but rewarding...

## Final Thoughts

This project has been a transformative experience...

---

**Tags:** #Drama #TipuSultan #BehindTheScenes
```

### Push to GitHub:

```bash
# Add your new blog post
git add blog-posts/2026-05-14-my-blog.md

# Commit with a message
git commit -m "Add new blog post: My Blog Title"

# Push to GitHub
git push origin main
```

✅ **Your blog post will automatically appear on the website!**

---

## ⚠️ Important Notes:

- **One file per post** - Don't edit existing files, create new ones
- **Date format** - Always use YYYY-MM-DD (2026-05-14)
- **File naming** - Use hyphens, not spaces
- **Markdown format** - Follow the template exactly
- **No special characters** - Keep filenames simple

---

## 🚀 Workflow:

1. Create new `.md` file
2. Fill in template
3. Add content
4. Save file
5. Push to GitHub
6. **Automatic!** Blog post appears on website

---

**Status:** ✅ Ready to use
**Last Updated:** May 14, 2026
