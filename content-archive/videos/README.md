# Videos Folder

## 🎥 How to Add Videos

### Simple Steps:

1. **Create a new file** in this folder
2. **Name format:** `YYYY-MM-DD-video-name.md`
   - Example: `2026-05-14-trailer.md`

3. **Copy this template** and add your video links:

```markdown
---
title: Video Title
date: 2026-05-14
platform: YouTube
type: Trailer/BTS/Performance
---

## Video Title
Description: Brief description of the video
Link: https://www.youtube.com/watch?v=VIDEO_ID
```

### Supported Platforms:

| Platform | URL Format | Example |
|----------|-----------|---------|
| **YouTube** | https://www.youtube.com/watch?v=VIDEO_ID | https://www.youtube.com/watch?v=dQw4w9WgXcQ |
| **Instagram** | https://www.instagram.com/p/POST_ID/ | https://www.instagram.com/p/ABC123XYZ/ |
| **Facebook** | https://www.facebook.com/VIDEO_URL | https://www.facebook.com/video.php?v=123 |

### File Naming:
- **Good:** `2026-05-14-tipu-sultan-trailer.md`
- **Good:** `2026-05-15-bts-video.md`
- **Bad:** `video.md`
- **Bad:** `my video.md`

### Template Fields:

| Field | Required | Example |
|-------|----------|---------|
| title | Yes | "Tipu Sultan Trailer" |
| date | Yes | 2026-05-14 |
| platform | Yes | YouTube, Instagram, Facebook |
| type | Optional | Trailer, BTS, Performance, Clip |

### Example Videos:

#### YouTube Video:
```markdown
---
title: Tipu Sultan - Official Trailer
date: 2026-05-14
platform: YouTube
type: Trailer
---

## Tipu Sultan - Official Trailer
Description: Watch the thrilling trailer of my latest drama series. Featuring intense action and compelling storytelling.
Link: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

#### Instagram Video:
```markdown
---
title: Behind the Scenes
date: 2026-05-14
platform: Instagram
type: BTS
---

## Behind the Scenes - On Set
Description: Fun moments from the drama shoot
Link: https://www.instagram.com/p/ABC123XYZ/
```

#### Facebook Video:
```markdown
---
title: Interview
date: 2026-05-14
platform: Facebook
type: Interview
---

## Exclusive Interview
Description: Talking about my latest project
Link: https://www.facebook.com/video.php?v=123456789
```

### Multiple Videos in One File:

You can add multiple videos in a single file:

```markdown
---
title: Latest Videos - May 2026
date: 2026-05-14
---

## Video 1 - Trailer
Description: Official trailer
Link: https://www.youtube.com/watch?v=ID1

## Video 2 - BTS
Description: Behind the scenes
Link: https://www.youtube.com/watch?v=ID2

## Video 3 - Interview
Description: Exclusive interview
Link: https://www.youtube.com/watch?v=ID3
```

### How to Get Video Links:

#### YouTube:
1. Go to your video
2. Copy the URL from address bar
3. It will be: `https://www.youtube.com/watch?v=VIDEO_ID`

#### Instagram:
1. Go to your post
2. Copy the URL from address bar
3. It will be: `https://www.instagram.com/p/POST_ID/`

#### Facebook:
1. Go to the video
2. Click "..." → "Copy video URL"
3. Or copy from address bar

### Push to GitHub:

```bash
# Add your new video file
git add videos/2026-05-14-trailer.md

# Commit with a message
git commit -m "Add video: Tipu Sultan Trailer"

# Push to GitHub
git push origin main
```

✅ **Your video will automatically embed and appear on the website!**

---

## 📋 Video Guidelines:

- **Public Videos:** Videos must be public/unlisted
- **Quality:** Use high-quality uploads
- **Duration:** Recommended under 10 minutes
- **Captions:** Always add descriptive captions
- **One file per video or series** - Group related videos together

---

## 🎯 Best Practices:

1. **Use Official Links:** Link to your official uploads
2. **Add Descriptions:** Describe what the video is about
3. **Use Dates:** Always include date in filename
4. **Consistent Naming:** Follow the format
5. **Organize by Type:** Group trailers, BTS, interviews separately

---

## 🚀 Workflow:

1. Upload video to YouTube/Instagram/Facebook
2. Make sure it's public
3. Copy the video URL
4. Create new `.md` file in this folder
5. Add video link with description
6. Push to GitHub
7. **Automatic!** Video embeds on website

---

## ⚠️ Important Notes:

- **One file per video or series** - Don't edit existing files
- **Date format** - Always use YYYY-MM-DD
- **File naming** - Use hyphens, not spaces
- **Markdown format** - Follow template exactly
- **Public Videos** - Videos must be public to embed

---

## 🔗 Video Types:

- **Trailer** - Movie/drama trailers
- **BTS** - Behind the scenes
- **Interview** - Interviews and talks
- **Performance** - Acting performances
- **Clip** - Short clips
- **Tutorial** - How-to videos
- **News** - News and announcements

---

**Status:** ✅ Ready to use
**Last Updated:** May 14, 2026
