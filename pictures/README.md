# Pictures Folder

## 📸 How to Add Photos

### Simple Steps:

1. **Create a new file** in this folder
2. **Name format:** `YYYY-MM-DD-photo-name.md`
   - Example: `2026-05-14-event-photos.md`

3. **Copy this template** and add your photo links:

```markdown
---
title: Event Name or Photo Collection Title
date: 2026-05-14
album: Event Name
---

## Photo 1
Caption: Description of this photo
![Photo](https://drive.google.com/uc?export=view&id=FILE_ID_1)

## Photo 2
Caption: Description of this photo
![Photo](https://drive.google.com/uc?export=view&id=FILE_ID_2)

## Photo 3
Caption: Description of this photo
![Photo](https://drive.google.com/uc?export=view&id=FILE_ID_3)
```

### Getting Google Drive File ID:

**Step 1:** Upload photo to Google Drive
**Step 2:** Right-click → Share → "Anyone with the link"
**Step 3:** Copy the sharing link:
```
https://drive.google.com/file/d/1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX/view?usp=sharing
                                   ↑ Copy this part (FILE_ID)
```

### File Naming:
- **Good:** `2026-05-14-drama-shoot.md`
- **Good:** `2026-05-15-event-photos.md`
- **Bad:** `photos.md`
- **Bad:** `pic 1.md`

### Template Fields:

| Field | Required | Example |
|-------|----------|---------|
| title | Yes | "Drama Shoot Photos" |
| date | Yes | 2026-05-14 |
| album | Optional | "Event Name" |

### Example Photo Collection:

```markdown
---
title: Behind the Scenes - Tipu Sultan
date: 2026-05-14
album: Drama Production
---

## On Set - Main Scene
Caption: Intense moment during the climax scene
![Scene](https://drive.google.com/uc?export=view&id=1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX)

## With Cast Members
Caption: Great chemistry with the amazing cast
![Cast](https://drive.google.com/uc?export=view&id=2BCD3EFG4HIJ5KLM6NOP7QRS8TUV9WXY)

## Makeup and Costume
Caption: Detailed costume for the period drama
![Costume](https://drive.google.com/uc?export=view&id=3CDE4FGH5IJK6LMN7OPQ8RST9UVW0XYZ)

## Behind the Camera
Caption: Director discussing the scene
![Director](https://drive.google.com/uc?export=view&id=4DEF5GHI6JKL7MNO8PQR9STU0VWX1YZA)
```

### Multiple Photos in One File:

You can add multiple photos in a single file:

```markdown
---
title: Event Photos - May 2026
date: 2026-05-14
album: Events
---

## Photo 1
Caption: First photo
![Photo1](https://drive.google.com/uc?export=view&id=ID1)

## Photo 2
Caption: Second photo
![Photo2](https://drive.google.com/uc?export=view&id=ID2)

## Photo 3
Caption: Third photo
![Photo3](https://drive.google.com/uc?export=view&id=ID3)
```

### Push to GitHub:

```bash
# Add your new photo file
git add pictures/2026-05-14-event-photos.md

# Commit with a message
git commit -m "Add event photos - May 14"

# Push to GitHub
git push origin main
```

✅ **Your photos will automatically appear in the Photo Gallery!**

---

## 📋 Photo Guidelines:

- **Quality:** Use high-quality photos (at least 1200x800px)
- **Format:** JPG, PNG, or WebP
- **Size:** Compress before uploading to Google Drive
- **One file per event/collection** - Group related photos together
- **Captions:** Always add descriptive captions
- **Organization:** Use date-based naming

---

## 🎯 Best Practices:

1. **Organize by Event:** Group photos from same event in one file
2. **Add Captions:** Describe each photo
3. **Use Dates:** Always include date in filename
4. **High Quality:** Use best quality photos
5. **Consistent Naming:** Follow the format

---

## 🚀 Workflow:

1. Upload photos to Google Drive
2. Share with "Anyone with the link"
3. Create new `.md` file in this folder
4. Add photo links with captions
5. Push to GitHub
6. **Automatic!** Photos appear in gallery

---

## ⚠️ Important Notes:

- **One file per collection** - Don't edit existing files
- **Date format** - Always use YYYY-MM-DD
- **File naming** - Use hyphens, not spaces
- **Markdown format** - Follow template exactly
- **Google Drive sharing** - Must be "Anyone with the link"

---

**Status:** ✅ Ready to use
**Last Updated:** May 14, 2026
