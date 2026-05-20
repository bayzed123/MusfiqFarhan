import os
import re
import yaml
import json
from datetime import datetime

def extract_youtube_id(url):
    """
    Extract the 11-character YouTube ID from various URL formats.
    Supports:
    - https://youtu.be/VIDEO_ID
    - https://youtu.be/VIDEO_ID?si=...
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtube.com/watch?v=VIDEO_ID
    """
    if not url:
        return None
    
    # Pattern 1: youtu.be/VIDEO_ID (with or without query params)
    match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
    
    # Pattern 2: youtube.com/watch?v=VIDEO_ID
    match = re.search(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
    
    return None

def is_image_url(url):
    """
    Checks if a URL is likely an image based on common file extensions or image hosting domains.
    """
    if not url:
        return False
    image_extensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'
    ]
    if any(url.lower().endswith(ext) for ext in image_extensions):
        return True
    # Common image hosting domains (can be expanded)
    image_hosting_domains = [
        'postimg.cc', 'imgur.com', 'ibb.co', 'flickr.com', 'unsplash.com', 'i.ytimg.com'
    ]
    if any(domain in url.lower() for domain in image_hosting_domains):
        return True
    return False

def parse_markdown_file(filepath):
    """
    Parse a Markdown file, supporting YAML frontmatter, Markdown links, and HTML tags.
    Intelligently differentiates between video (YouTube ID) and image (full URL) links.
    Extracts title, URL/ID, type, and other metadata.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return {}
    
    data = {}
    raw_content_without_frontmatter = content

    # ===== FORMAT 1: YAML FRONTMATTER =====
    yaml_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if yaml_match:
        try:
            frontmatter = yaml.safe_load(yaml_match.group(1))
            if frontmatter and isinstance(frontmatter, dict):
                data.update(frontmatter)
                raw_content_without_frontmatter = content[yaml_match.end():].strip()
        except yaml.YAMLError as e:
            print(f"YAML parsing error in {filepath}: {e}")
    
    # Prioritize 'url' or 'id' from frontmatter if available
    link_url = data.get('url')
    if not link_url and data.get('id'): # If 'id' is present, assume it's a YouTube ID
        link_url = f"https://www.youtube.com/watch?v={data['id']}"

    # If no link found in frontmatter, try to extract from remaining content
    if not link_url:
        # ===== FORMAT 2: MARKDOWN LINK [Title](URL) =====
        markdown_link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', raw_content_without_frontmatter)
        if markdown_link_match:
            data['title'] = data.get('title', markdown_link_match.group(1).strip())
            link_url = markdown_link_match.group(2).strip()
        
        # ===== FORMAT 3: HTML ANCHOR TAG (<a href="URL">Title</a>) or IMAGE TAG (<img src="URL">) =====
        if not link_url:
            html_anchor_match = re.search(r'<a\s+href=["\\]([^"\\]+)["\\][^>]*>([^<]+)<\/a>', raw_content_without_frontmatter, re.IGNORECASE)
            if html_anchor_match:
                data['title'] = data.get('title', html_anchor_match.group(2).strip())
                link_url = html_anchor_match.group(1).strip()
            else:
                html_img_match = re.search(r'<img\s+src=["\\]([^"\\]+)["\\][^>]*>', raw_content_without_frontmatter, re.IGNORECASE)
                if html_img_match:
                    link_url = html_img_match.group(1).strip()
                    # Try to get title from alt attribute if available
                    alt_match = re.search(r'alt=["\\]([^"\\]+)["\\]', html_img_match.group(0), re.IGNORECASE)
                    if alt_match:
                        data['title'] = data.get('title', alt_match.group(1).strip())

    # Smart Media Parsing: Determine if it's a video or image
    if link_url:
        youtube_id = extract_youtube_id(link_url)
        if youtube_id:
            data['type'] = 'video'
            data['id'] = youtube_id
            data.pop('url', None) # Remove full URL if YouTube ID is found
        elif is_image_url(link_url):
            data['type'] = 'image'
            data['url'] = link_url
            data.pop('id', None) # Remove ID if it's an image
        else:
            data['type'] = 'link' # Generic link if not video or image
            data['url'] = link_url
    
    # If it's a newsroom article, ensure it has a description
    if 'newsroom' in filepath and 'title' in data and 'description' not in data:
        # Attempt to extract description from the remaining content
        first_paragraph_match = re.search(r'^(.*?)(?:\n\n|\Z)', raw_content_without_frontmatter, re.DOTALL)
        if first_paragraph_match:
            data['description'] = first_paragraph_match.group(1).strip()
        data['type'] = data.get('type', 'article') # Default to article type

    # Set default tag if not present
    data['tag'] = data.get('tag', 'New')
    
    return data

def collect_content_data(base_path):
    """
    Collect data from Markdown files across all specified content folders.
    """
    all_content = {
        "recent_releases": [],
        "the_media_hub": [],
        "latest_coming_soon": [],
        "premiering_2026": [],
        "exclusive_bts": [],
        "newsroom": []
    }

    content_dirs = {
        "recent_releases": "recent-releases",
        "the_media_hub": "the-media-hub",
        "latest_coming_soon": "latest-coming-soon",
        "premiering_2026": "premiering-2026",
        "exclusive_bts": "exclusive-bts-stills", # Note: folder name is different
        "newsroom": "newsroom"
    }

    for key, folder_name in content_dirs.items():
        folder_path = os.path.join(base_path, folder_name)
        if os.path.exists(folder_path):
            for filename in sorted(os.listdir(folder_path)):
                if filename.endswith('.md'):
                    filepath = os.path.join(folder_path, filename)
                    data = parse_markdown_file(filepath)
                    if data:
                        # Add filename as a unique identifier if not already present
                        data['filename'] = filename
                        all_content[key].append(data)
                        print(f"✓ Parsed {key}: {filename} -> {data.get('title', 'No Title')}")
                    else:
                        print(f"✗ Failed to parse {key}: {filename}")
        else:
            print(f"Warning: Content directory not found: {folder_path}")

    return all_content

def generate_js_data_objects(all_content):
    """
    Generate JavaScript objects for all collected content.
    """
    js_output = []

    # Videos Data (recent_releases, the_media_hub)
    js_output.append("        // ===== VIDEO DATA STRUCTURE =====")
    js_output.append("        const videosData = {")
    js_output.append("            recent: [")
    for video in all_content['recent_releases']:
        title_escaped = video.get('title', '').replace('"', '\"')
        js_output.append(f"                {{ title: \"{title_escaped}\", id: \"{video.get('id', '')}\", tag: \"{video.get('tag', 'New')}\" }},")
    js_output.append("            ],")
    js_output.append("            media: [")
    for video in all_content['the_media_hub']:
        title_escaped = video.get('title', '').replace('"', '\"')
        js_output.append(f"                {{ title: \"{title_escaped}\", id: \"{video.get('id', '')}\", tag: \"{video.get('tag', 'New')}\" }},")
    js_output.append("            ]")
    js_output.append("        };\n")

    # Coming Soon Data (latest_coming_soon, premiering_2026)
    js_output.append("        // ===== COMING SOON DATA STRUCTURE =====")
    js_output.append("        const comingSoonData = [")
    for item in all_content['latest_coming_soon'] + all_content['premiering_2026']:
        title_escaped = item.get('title', '').replace('"', '\"')
        description_escaped = item.get('description', '').replace('"', '\"')
        poster_url = item.get('poster_url', '')
        item_type = item.get('type', 'unknown')
        item_id_or_url = item.get('id', item.get('url', ''))
        
        js_output.append(f"            {{")
        js_output.append(f"                title: \"{title_escaped}\",")
        js_output.append(f"                description: \"{description_escaped}\",")
        js_output.append(f"                poster_url: \"{poster_url}\",")
        js_output.append(f"                type: \"{item_type}\",")
        js_output.append(f"                media_id_or_url: \"{item_id_or_url}\",")
        js_output.append(f"                tag: \"{item.get('tag', 'Coming Soon')}\" ")
        js_output.append(f"            }},")
    js_output.append("        ];\n")

    # Exclusive BTS Data
    js_output.append("        // ===== EXCLUSIVE BTS DATA STRUCTURE =====")
    js_output.append("        const exclusiveBtsData = [")
    for item in all_content['exclusive_bts']:
        title_escaped = item.get('title', '').replace('"', '\"')
        js_output.append(f"            {{ title: \"{title_escaped}\", url: \"{item.get('url', '')}\" }},")
    js_output.append("        ];\n")

    # Newsroom Data
    js_output.append("        // ===== NEWSROOM DATA STRUCTURE =====")
    js_output.append("        const newsroomData = [")
    # Sort newsroom articles by date, newest first
    sorted_news = sorted(all_content['newsroom'], key=lambda x: x.get('date', '0000-00-00'), reverse=True)
    for article in sorted_news:
        title_escaped = article.get('title', '').replace('"', '\"')
        description_escaped = article.get('description', '').replace('"', '\"')
        date_formatted = article.get('date', '')
        # Ensure date is in YYYY-MM-DD format for consistent sorting
        try:
            if date_formatted: # If date exists, try to parse and reformat
                date_obj = datetime.strptime(date_formatted, '%Y-%m-%d')
                date_formatted = date_obj.strftime('%Y-%m-%d')
        except ValueError:
            print(f"Warning: Invalid date format for news article '{title_escaped}': {date_formatted}. Expected YYYY-MM-DD.")
            date_formatted = '' # Clear invalid date

        js_output.append(f"            {{")
        js_output.append(f"                title: \"{title_escaped}\",")
        js_output.append(f"                date: \"{date_formatted}\",")
        js_output.append(f"                description: \"{description_escaped}\",")
        js_output.append(f"                link: \"{article.get('url', '')}\" ") # Use 'url' field for link
        js_output.append(f"            }},")
    js_output.append("        ];\n")

    return "\n".join(js_output)

def generate_js_rendering_logic():
    """
    Generate JavaScript rendering logic for new sections.
    """
    rendering_logic = []

    rendering_logic.append("        // ===== COMING SOON RENDERING FUNCTION =====")
    rendering_logic.append("        function renderComingSoon() {")
    rendering_logic.append("            const container = document.getElementById('latest-coming-soon-container');")
    rendering_logic.append("            if (!container || comingSoonData.length === 0) {\n                container.innerHTML = `<p style=\"text-align: center; color: var(--text-dim);\">No upcoming projects to display.</p>`;\n                return;\n            }")
    rendering_logic.append("            const item = comingSoonData[0]; // Display the first item for now")
    rendering_logic.append("            ")
    rendering_logic.append("            let mediaHtml = '';")
    rendering_logic.append("            let learnMoreLink = item.media_id_or_url || '#';")
    rendering_logic.append("            if (item.type === 'video') {")
    rendering_logic.append("                mediaHtml = `<div class=\"feature-poster\">` +
                             `<img src=\"https://i.ytimg.com/vi/${item.media_id_or_url}/hqdefault.jpg\" alt=\"${item.title}\">` +
                             `<div class=\"play-btn\" onclick=\"playVideo(this.parentNode, '${item.media_id_or_url}')\"><i class=\"fas fa-play\"></i></div>` +
                             `</div>`;")
    rendering_logic.append("            } else if (item.type === 'image') {")
    rendering_logic.append("                mediaHtml = `<div class=\"feature-poster\"><img src=\"${item.media_id_or_url}\" alt=\"${item.title}\"></div>`;")
    rendering_logic.append("            }")
    rendering_logic.append("            ")
    rendering_logic.append("            container.innerHTML = `
                <div class=\"feature-grid\">
                    ${mediaHtml}
                    <div class=\"feature-content\">
                        <span class=\"feature-tag\">${item.tag}</span>
                        <h2 class=\"luxury-font\">${item.title}</h2>
                        <p class=\"feature-desc\">${item.description}</p>
                        <a href=\"${learnMoreLink}\" target=\"_blank\" class=\"btn btn-primary\">Learn More</a>
                    </div>
                </div>
            `;")
    rendering_logic.append("        }\n")

    rendering_logic.append("        // ===== EXCLUSIVE BTS RENDERING FUNCTION =====")
    rendering_logic.append("        function renderExclusiveBts() {")
    rendering_logic.append("            const container = document.getElementById('bts-carousel');")
    rendering_logic.append("            if (!container || exclusiveBtsData.length === 0) {\n                container.innerHTML = `<p style=\"text-align: center; color: var(--text-dim);\">No BTS images to display.</p>`;\n                return;\n            }")
    rendering_logic.append("            container.innerHTML = exclusiveBtsData.map(item => `
                <div class=\"bts-item\"><img src=\"${item.url}\" alt=\"${item.title}\"></div>
            `).join('');")
    rendering_logic.append("        }\n")

    rendering_logic.append("        // ===== NEWSROOM RENDERING FUNCTION =====")
    rendering_logic.append("        function renderNewsroom() {")
    rendering_logic.append("            const container = document.getElementById('news-grid-container');")
    rendering_logic.append("            if (!container || newsroomData.length === 0) {\n                container.innerHTML = `<p style=\"text-align: center; color: var(--text-dim);\">No news articles to display.</p>`;\n                return;\n            }")
    rendering_logic.append("            container.innerHTML = newsroomData.map(article => `
                <div class=\"news-card\">
                    <span class=\"news-date\">${article.date}</span>
                    <h3 class=\"luxury-font\">${article.title}</h3>
                    <p style=\"color: var(--text-dim); font-size: 14px; margin-bottom: 20px;\">${article.description}</p>
                    ${article.link ? `<a href=\"${article.link}\" target=\"_blank\" style=\"color: var(--emerald); text-decoration: none; font-size: 12px; font-weight: 700;\">READ MORE <i class=\"fas fa-arrow-right\"></i></a>` : ''}
                </div>
            `).join('');")
    rendering_logic.append("        }\n")

    return "\n".join(rendering_logic)

def update_index_html(html_filepath, new_js_data, new_js_rendering_logic):
    """
    Update the index.html file with new JavaScript data objects and rendering logic.
    This function is designed to be robust against changes in index.html structure
    by using specific markers and regex patterns for insertion/replacement.
    """
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_filepath}: {e}")
        return False

    updated_html_content = html_content

    # 1. Update/Insert Data Objects
    # Find and replace the existing videosData block
    videos_data_pattern = re.compile(r'\s*// ===== VIDEO DATA STRUCTURE =====.*?^\s*};', re.DOTALL | re.MULTILINE)
    if videos_data_pattern.search(updated_html_content):
        # Replace only the videosData part from the generated new_js_data
        videos_data_only = new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[0].strip()
        updated_html_content = videos_data_pattern.sub(videos_data_only, updated_html_content)
    else:
        print("Warning: Existing videosData block not found. Attempting to insert before VIDEO RENDERING FUNCTION.")
        insert_point_for_videos_data = re.compile(r'(\s*// ===== VIDEO RENDERING FUNCTION =====)', re.DOTALL)
        match = insert_point_for_videos_data.search(updated_html_content)
        if match:
            videos_data_only = new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[0].strip()
            updated_html_content = updated_html_content[:match.start()] + videos_data_only + "\n\n" + updated_html_content[match.start():]
        else:
            print("Error: Could not find insertion point for videosData in index.html")
            return False

    # Insert new data objects (comingSoonData, exclusiveBtsData, newsroomData)
    # These should be inserted after videosData and before the rendering functions.
    # We'll look for the start of the rendering functions as the insertion point.
    insertion_point_for_new_data = re.compile(r'(\s*// ===== VIDEO RENDERING FUNCTION =====)', re.DOTALL)
    match = insertion_point_for_new_data.search(updated_html_content)
    if match:
        # Extract the new data objects part from new_js_data (everything after videosData)
        new_data_objects_to_insert = "\n".join(new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[1:]).strip()
        # Check if these data objects already exist to avoid duplication
        if not re.search(r'// ===== COMING SOON DATA STRUCTURE =====', updated_html_content):
            updated_html_content = updated_html_content[:match.start()] + new_data_objects_to_insert + "\n\n" + updated_html_content[match.start():]
        else:
            # If they exist, replace them. This requires more specific regex for each block.
            # Replace comingSoonData
            coming_soon_pattern = re.compile(r'\s*// ===== COMING SOON DATA STRUCTURE =====.*?^\s*\];', re.DOTALL | re.MULTILINE)
            coming_soon_data_block = re.search(r'// ===== COMING SOON DATA STRUCTURE =====.*?^\s*\];', new_js_data, re.DOTALL | re.MULTILINE).group(0)
            updated_html_content = coming_soon_pattern.sub(coming_soon_data_block, updated_html_content)

            # Replace exclusiveBtsData
            bts_pattern = re.compile(r'\s*// ===== EXCLUSIVE BTS DATA STRUCTURE =====.*?^\s*\];', re.DOTALL | re.MULTILINE)
            bts_data_block = re.search(r'// ===== EXCLUSIVE BTS DATA STRUCTURE =====.*?^\s*\];', new_js_data, re.DOTALL | re.MULTILINE).group(0)
            updated_html_content = bts_pattern.sub(bts_data_block, updated_html_content)

            # Replace newsroomData
            newsroom_pattern = re.compile(r'\s*// ===== NEWSROOM DATA STRUCTURE =====.*?^\s*\];', re.DOTALL | re.MULTILINE)
            newsroom_data_block = re.search(r'// ===== NEWSROOM DATA STRUCTURE =====.*?^\s*\];', new_js_data, re.DOTALL | re.MULTILINE).group(0)
            updated_html_content = newsroom_pattern.sub(newsroom_data_block, updated_html_content)

    else:
        print("Error: Could not find insertion point for new data objects in index.html")
        return False

    # 2. Update/Insert Rendering Logic
    # Find the document.addEventListener('DOMContentLoaded', ...) block to insert new render calls
    dom_content_loaded_pattern = re.compile(r'(document\.addEventListener\(\'DOMContentLoaded\', \(\) => \{.*?)(// Setup drag scroll functionality)', re.DOTALL)
    match = dom_content_loaded_pattern.search(updated_html_content)

    if match:
        # Existing rendering calls (ensure they are still there)
        existing_render_calls_block = """
                console.log('Rendering carousels...', videosData);
                renderVideoCarousel('recent-carousel', videosData.recent);
                renderVideoCarousel('media-carousel', videosData.media);
                console.log('Carousels rendered successfully');
        """
        # New rendering calls to be added
        new_render_calls_to_add = """
                // Render new content sections
                renderComingSoon();
                renderExclusiveBts();
                renderNewsroom();
        """
        # Check if new render calls are already present to avoid duplication
        if new_render_calls_to_add.strip() not in updated_html_content:
            updated_html_content = updated_html_content.replace(existing_render_calls_block, existing_render_calls_block + new_render_calls_to_add)

        # Insert the new rendering functions before the DOMContentLoaded event listener
        # Find the script tag closing
        script_end_pattern = re.compile(r'(\s*</script>\s*</body>)', re.DOTALL)
        script_end_match = script_end_pattern.search(updated_html_content)
        if script_end_match:
            # Find the last existing function before DOMContentLoaded to insert new functions after it
            last_func_pattern = re.compile(r'(initDragScroll = \(slider\) => \{.*?\};)', re.DOTALL)
            last_func_match = last_func_pattern.search(updated_html_content)
            if last_func_match:
                # Check if new rendering logic is already present to avoid duplication
                if new_js_rendering_logic.strip() not in updated_html_content:
                    updated_html_content = updated_html_content[:last_func_match.end()] + "\n" + new_js_rendering_logic.strip() + "\n" + updated_html_content[last_func_match.end():]
            else:
                print("Error: Could not find insertion point for new rendering logic (last function) in index.html")
                return False
        else:
            print("Error: Could not find script closing tag in index.html")
            return False

    else:
        print("Error: Could not find DOMContentLoaded block in index.html")
        return False

    # 3. Update HTML structure for new sections (add IDs for containers and remove hardcoded content)
    # Add ID to latest-feature content div if not already present
    if '<div id="latest-coming-soon-container"></div>' not in updated_html_content:
        updated_html_content = re.sub(
            r'(<section class="latest-feature" id="latest">\s*<div class="container">)',
            r'\1<div id="latest-coming-soon-container"></div>', # Insert a new div for dynamic content
            updated_html_content, count=1
        )
    # Remove hardcoded content within latest-feature if it exists
    updated_html_content = re.sub(
        r'(<div id="latest-coming-soon-container"></div>\s*)<div class="feature-grid">.*?</div>', r'\1', updated_html_content, flags=re.DOTALL
    )

    # Add ID to bts-slider div if not already present
    if '<div class="bts-slider reveal" id="bts-carousel">' not in updated_html_content:
        updated_html_content = re.sub(
            r'(<div class="bts-slider reveal">)',
            r'<div class="bts-slider reveal" id="bts-carousel">', # Add ID to existing div
            updated_html_content, count=1
        )
    # Remove hardcoded bts-items
    updated_html_content = re.sub(
        r'\s*<div class="bts-item"><img src=\".*?\" alt=\".*?\"></div>\s*', '', updated_html_content
    )

    # Add ID to news-grid div if not already present
    if '<div class="news-grid reveal" id="news-grid-container">' not in updated_html_content:
        updated_html_content = re.sub(
            r'(<div class="news-grid reveal">)',
            r'<div class="news-grid reveal" id="news-grid-container">', # Add ID to existing div
            updated_html_content, count=1
        )
    # Remove hardcoded news-cards
    updated_html_content = re.sub(
        r'\s*<div class="news-card">.*?<\/div>\s*', '', updated_html_content, flags=re.DOTALL
    )

    try:
        with open(html_filepath, 'w', encoding='utf-8') as f:
            f.write(updated_html_content)
        return True
    except Exception as e:
        print(f"Error writing to {html_filepath}: {e}")
        return False


if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    index_html_path = os.path.join(repo_root, 'index.html')

    print("=" * 60)
    print("Starting CMS Data Generation and HTML Update...")
    print("=" * 60)

    # 1. Collect data from Markdown files
    all_content = collect_content_data(repo_root)

    print("\n" + "=" * 60)
    print(f"Summary of Collected Data:")
    for key, value in all_content.items():
        print(f"  {key.replace('_', ' ').title()}: {len(value)} items")
    print("=" * 60)

    # 2. Generate the JavaScript data objects string
    new_js_data_objects = generate_js_data_objects(all_content)
    
    # 3. Generate the JavaScript rendering logic
    new_js_rendering_logic = generate_js_rendering_logic()

    # 4. Update index.html
    if update_index_html(index_html_path, new_js_data_objects, new_js_rendering_logic):
        print("\n✓ index.html updated successfully with new CMS data and rendering logic.")
    else:
        print("\n✗ Failed to update index.html")