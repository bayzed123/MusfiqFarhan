# Photo Gallery

Add your photos here using Google Drive links. Format:

```
Title: Photo Title
Caption: Your caption here
![Photo](https://drive.google.com/file/d/FILE_ID/view?usp=sharing)
```

## Example Photos

```
Title: Behind the Scenes - Drama Shoot
Caption: On set during the filming of latest drama series
![Drama Shoot](https://drive.google.com/uc?export=view&id=REPLACE_WITH_FILE_ID)
```

## How to Add Photos

1. Upload your photos to Google Drive
2. Right-click on the photo → Share → Change to "Anyone with the link"
3. Copy the file ID from the URL (the long string between `/d/` and `/view`)
4. Add to this file using the format above
5. Push to repository - photos will automatically appear in the gallery

## Instructions

- Replace `REPLACE_WITH_FILE_ID` with your actual Google Drive file ID
- Add multiple photos by repeating the format
- Captions are optional
- Photos will display in a responsive grid

---

**Note:** When you push this file to GitHub, the GitHub Actions workflow will process it and automatically display all photos in the Photo Gallery section of your website.
