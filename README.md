# Musfiq R. Farhan Official Portfolio

## Project Overview

This repository hosts the official, high-end portfolio website for **Musfiq R. Farhan**, a prominent Bangladeshi actor, radio jockey (RJ), and content creator. Designed as a cinematic, long-scrolling single-page application, the website combines a "Deep Midnight" aesthetic with premium Emerald Green and Gold highlights, offering an immersive experience for fans, industry professionals, and collaborators.

The portfolio showcases Musfiq R. Farhan's extensive filmography, awards, personal story, and provides a dynamic platform for fan engagement through a real-time, interactive fan wall. It is built with a mobile-first approach, ensuring optimal performance and responsiveness across all devices.

## Key Features

*   **Cinematic Hero Section**: A full-screen, immersive hero banner featuring a high-resolution portrait of Musfiq R. Farhan with a dynamic bottom-up dark gradient. Optimized for both desktop (center focus) and mobile (right-focus) to ensure the actor's face is always visible.
*   **Luxury Editorial Bio & Milestones**: A narrative biography highlighting his journey and achievements, complemented by interactive counters and award badges (e.g., BIFA Awards).
*   **Dedicated "About Me" Section**: A personal space with a placeholder for a professional photo, styled with premium glassmorphic elements.
*   **Netflix-Style Media Carousels**: Two dynamic, touch-swiping carousels for "Recent Releases" and "The Media Hub," featuring:
    *   **Object-based Data**: Videos are managed with a structured data array, displaying titles instead of raw YouTube links.
    *   **High-Quality Thumbnails**: Utilizes `hqdefault.jpg` for crisp, clear YouTube thumbnails.
    *   **Dynamic Tags**: Each video card includes professional tags like "New," "Trending," or "Award Winning."
    *   **Facade Method**: Videos load only on click, replacing the thumbnail with an auto-playing YouTube iframe for optimal performance.
    *   **Scroll Snapping**: Ensures smooth, app-like navigation on mobile devices.
*   **Live Fan Wall (Firebase Powered)**: A highly interactive, multi-row infinite marquee displaying fan messages in real-time.
    *   **Global Persistence**: Messages are stored and retrieved from Google Firebase Realtime Database, ensuring global synchronization.
    *   **Dynamic Scrolling**: 2-3 rows scroll in alternating directions at varied speeds for an engaging visual effect.
    *   **Glassmorphic Cards**: Premium design for individual fan messages with bold emerald names and white text.
*   **Brand Partnership Marquee**: An auto-scrolling marquee showcasing production house logos.
    *   **Interactive Logos**: Logos appear in grayscale by default and become colorful with an emerald glow on hover.
*   **Advanced SEO & Knowledge Graph Integration**: Comprehensive JSON-LD Person Schema for Musfiq R. Farhan, including official names, birthdate, awards, and social links. Discreetly includes developer metadata for Sayad Md Bayezid Hosan.
*   **Performance & Responsiveness**: Built with a mobile-first approach, ensuring fast loading times and seamless experience across all screen sizes.
*   **Modern UI/UX**: Combines "Cinematic Streaming UI," "Luxury Editorial/Magazine typography," and "Glassmorphic Minimalist" elements.

## Quick Start Guide

To set up and run this project locally, follow these steps:

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/bayzed123/MusfiqFarhan.git
    cd MusfiqFarhan
    ```

2.  **Open `index.html`**: Simply open the `index.html` file in your web browser. All assets (CSS, JavaScript) are embedded or linked locally.

3.  **Firebase Configuration (for Live Fan Wall)**:
    *   The Live Fan Wall uses Google Firebase Realtime Database for real-time message synchronization.
    *   **Important**: You need to replace the placeholder Firebase configuration in the `<script>` section of `index.html` with your own Firebase project details.
    *   **Steps to get your Firebase config**:
        1.  Go to the [Firebase Console](https://console.firebase.google.com/).
        2.  Create a new project or select an existing one.
        3.  Add a new web app to your project.
        4.  Copy the `firebaseConfig` object provided by Firebase.
        5.  Paste this object into the `firebaseConfig` constant in `index.html` (around line 1326).
        6.  **Enable Realtime Database**: In your Firebase project, navigate to "Realtime Database" and set the rules to allow read/write access for public use (e.g., `".read": "true", ".write": "true"`).

4.  **Customize Content**:
    *   **About Me Photo**: Replace `assets/about_photo.png` with your desired image.
    *   **Video Data**: Update the `videosData` object in the JavaScript section with your specific YouTube video titles, IDs, and tags.
    *   **Newsroom & BTS**: Modify content as needed.

## Technical Documentation

For an in-depth understanding of the project's architecture, implementation details, and advanced customization options, please refer to the [Wiki.md](Wiki.md).

## Technologies Used

*   **HTML5**: Semantic structure.
*   **CSS3**: Styling, animations, and responsiveness (with variables).
*   **Vanilla JavaScript**: Interactive elements, DOM manipulation, and Firebase integration.
*   **Google Firebase Realtime Database**: Backend for the Live Fan Wall.
*   **Font Awesome**: Icons.
*   **Google Fonts**: Playfair Display, Inter, Cinzel.

## License

This project is licensed under a custom commercial license. You are free to use, distribute, and modify this software for commercial purposes without alteration, provided that **all original developer credits remain intact and visible**. Any removal or obfuscation of the developer credit is strictly prohibited and constitutes a violation of copyright.

For more details, see the [LICENSE.md](LICENSE.md) file.

## Developer

**Sayad Md Bayezid Hosan**
*   [Portfolio](https://sayadbayezid.com)
*   [Connect with Bayezid](https://connectbayezid-8dcdz46v.manus.space)

## 💖 Support the Project

If you find this portfolio and blog system helpful, consider supporting its development. Your appreciation keeps the project alive and free for everyone!

<div align="left">
  <!-- PayPal Link -->
  <a href="https://www.paypal.me/connectwithbayezid" target="_blank" title="Support via PayPal: @connectwithbayezid">
    <img src="https://raw.githubusercontent.com/bayzed123/sayadbayezid-portfolio-/main/assets/images/paypal_logo.png" width="150" alt="Support via PayPal">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <!-- Payoneer Email Link -->
  <a href="mailto:cwb.agency@outlook.com" target="_blank" title="Support via Payoneer: cwb.agency@outlook.com">
    <img src="https://raw.githubusercontent.com/bayzed123/sayadbayezid-portfolio-/main/assets/images/payoneer_logo.png" width="150" alt="Support via Payoneer">
  </a>
  
  <!-- Visible Details for Easy Copying -->
  <br><br>
  <p>
    <b>PayPal:</b> <code>@connectwithbayezid</code> <br>
    <b>Payoneer:</b> <code>cwb.agency@outlook.com</code>
  </p>
</div>


---
<img src="https://commons.wikimedia.org/wiki/Special:FilePath/Sayad_Md_Bayezid_Hosan_Portrait.jpg" alt="Sayad Md Bayezid Hosan" width="100%">

*All Rights Reserve | Sayad Md bayezid Hosan.*
