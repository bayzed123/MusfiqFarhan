
import os
import re
import yaml
import json
from datetime import datetime

def extract_youtube_id(url):
    """
    Extract the 11-character YouTube ID from various URL formats.
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
    Checks if a URL is likely an image based on extension or common image hosting domains.
    """
    if not url:
        return False
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']
    if any(url.lower().endswith(ext) for ext in image_extensions):
        return True
    image_hosting_domains = ['postimg.cc', 'imgur.com', 'ibb.co', 'flickr.com', 'unsplash.com', 'i.ytimg.com']
    if any(domain in url.lower() for domain in image_hosting_domains):
        return True
    return False

def parse_markdown_file(filepath):
    """
    Parse a Markdown file with flexible format support for various content types.
    Supports YAML frontmatter, Markdown links, and HTML tags.
    Intelligently differentiates between video and image links.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return {}
    
    data = {}
    
    # ===== FORMAT 1: YAML FRONTMATTER =====
    yaml_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if yaml_match:
        try:
            frontmatter = yaml.safe_load(yaml_match.group(1))
            if frontmatter and isinstance(frontmatter, dict):
                data.update(frontmatter)
        except yaml.YAMLError as e:
            print(f"YAML parsing error in {filepath}: {e}")
    
    # Extract link/URL from remaining content if not already in frontmatter
    link_url = None
    if 'url' in data:
        link_url = data['url']
    elif 'id' in data: # For existing video IDs
        link_url = f"https://www.youtube.com/watch?v={data['id']}"
    else:
        # Try Markdown link ([Title](URL))
        markdown_link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', content)
        if markdown_link_match:
            data['title'] = data.get('title', markdown_link_match.group(1).strip())
            link_url = markdown_link_match.group(2).strip()
        
        # Try HTML anchor tag (<a href="URL">Title</a>) or image tag (<img src="URL">)
        if not link_url:
            html_anchor_match = re.search(r'<a\s+href=["\’]([^"\’]+)["\’][^>]*>([^<]+)<\/a>', content, re.IGNORECASE)
            if html_anchor_match:
                data['title'] = data.get('title', html_anchor_match.group(2).strip())
                link_url = html_anchor_match.group(1).strip()
            else:
                html_img_match = re.search(r'<img\s+src=["\’]([^"\’]+)["\’][^>]*>', content, re.IGNORECASE)
                if html_img_match:
                    link_url = html_img_match.group(1).strip()
                    # Try to get title from alt attribute if available
                    alt_match = re.search(r'alt=["\’]([^"\’]+)["\’]', html_img_match.group(0), re.IGNORECASE)
                    if alt_match:
                        data['title'] = data.get('title', alt_match.group(1).strip())

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
    elif 'title' in data and 'description' in data: # Assume it's an article if title and description are present
        data['type'] = 'article'
    
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
    for article in all_content['newsroom']:
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
    rendering_logic.append("            if (!container || comingSoonData.length === 0) return;")
    rendering_logic.append("            const item = comingSoonData[0]; // Display the first item for now")
    rendering_logic.append("            ")
    rendering_logic.append("            let mediaHtml = '';")
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
                        <!-- Add more details if needed -->
                        <a href=\"#\" class=\"btn btn-primary\">Learn More</a>
                    </div>
                </div>
            `;")
    rendering_logic.append("        }\n")

    rendering_logic.append("        // ===== EXCLUSIVE BTS RENDERING FUNCTION =====")
    rendering_logic.append("        function renderExclusiveBts() {")
    rendering_logic.append("            const container = document.getElementById('bts-carousel');")
    rendering_logic.append("            if (!container || exclusiveBtsData.length === 0) return;")
    rendering_logic.append("            container.innerHTML = exclusiveBtsData.map(item => `
                <div class=\"bts-item\"><img src=\"${item.url}\" alt=\"${item.title}\"></div>
            `).join('');")
    rendering_logic.append("        }\n")

    rendering_logic.append("        // ===== NEWSROOM RENDERING FUNCTION =====")
    rendering_logic.append("        function renderNewsroom() {")
    rendering_logic.append("            const container = document.getElementById('news-grid-container');")
    rendering_logic.append("            if (!container || newsroomData.length === 0) return;")
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
    """
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_filepath}: {e}")
        return False

    # 1. Update/Insert Data Objects
    # Find and replace the existing videosData block
    videos_data_pattern = re.compile(r'\s*// ===== VIDEO DATA STRUCTURE =====.*?^\s*};', re.DOTALL | re.MULTILINE)
    if videos_data_pattern.search(html_content):
        updated_html_content = videos_data_pattern.sub(new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[0].strip(), html_content)
    else:
        print("Warning: Existing videosData block not found. Attempting to insert before VIDEO RENDERING FUNCTION.")
        insert_pattern = re.compile(r'\s*// ===== VIDEO RENDERING FUNCTION =====')
        if insert_pattern.search(html_content):
            updated_html_content = insert_pattern.sub(new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[0].strip() + "\n\n        // ===== VIDEO RENDERING FUNCTION =====", html_content)
        else:
            print("Error: Could not find insertion point for videosData in index.html")
            return False

    # Insert new data objects (comingSoonData, exclusiveBtsData, newsroomData)
    # Find the end of the existing videosData block or the start of the rendering functions
    # We'll insert the new data objects right after videosData and before rendering functions
    insertion_point_pattern = re.compile(r'(\s*// ===== VIDEO RENDERING FUNCTION =====)', re.DOTALL)
    match = insertion_point_pattern.search(updated_html_content)
    if match:
        # Extract the new data objects part from new_js_data
        new_data_objects_to_insert = "\n".join(new_js_data.split('// ===== COMING SOON DATA STRUCTURE =====')[1:])
        updated_html_content = updated_html_content[:match.start()] + new_data_objects_to_insert.strip() + "\n\n" + updated_html_content[match.start():]
    else:
        print("Error: Could not find insertion point for new data objects in index.html")
        return False

    # 2. Update/Insert Rendering Logic
    # Find the document.addEventListener('DOMContentLoaded', ...) block
    dom_content_loaded_pattern = re.compile(r'(document\.addEventListener\(\'DOMContentLoaded\', \(\) => \{.*?)(// Setup drag scroll functionality)', re.DOTALL)
    match = dom_content_loaded_pattern.search(updated_html_content)

    if match:
        # Existing rendering calls
        existing_render_calls = """
                console.log('Rendering carousels...', videosData);
                renderVideoCarousel('recent-carousel', videosData.recent);
                renderVideoCarousel('media-carousel', videosData.media);
                console.log('Carousels rendered successfully');
        """
        # New rendering calls
        new_render_calls = """
                // Render new content sections
                renderComingSoon();
                renderExclusiveBts();
                renderNewsroom();
        """
        # Replace existing render calls and add new ones
        updated_html_content = updated_html_content.replace(existing_render_calls, existing_render_calls + new_render_calls)

        # Insert the new rendering functions before the DOMContentLoaded event listener
        # Find the script tag closing
        script_end_pattern = re.compile(r'(\s*</script>\s*</body>)', re.DOTALL)
        script_end_match = script_end_pattern.search(updated_html_content)
        if script_end_match:
            # Insert new rendering logic before the existing script end, but after the existing functions
            # This is a bit tricky, let's find the last existing function before DOMContentLoaded
            last_func_pattern = re.compile(r'(initDragScroll = \(slider\) => \{.*?\};)', re.DOTALL)
            last_func_match = last_func_pattern.search(updated_html_content)
            if last_func_match:
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

    # 3. Update HTML structure for new sections if needed (add IDs for containers)
    # This part needs to be done carefully to avoid breaking layout.
    # For 'latest-feature' section, add id='latest-coming-soon-container' to the div that holds the content
    # For 'bts-slider' section, add id='bts-carousel'
    # For 'news-grid' section, add id='news-grid-container'

    # Add ID to latest-feature content div
    updated_html_content = re.sub(
        r'(<section class="latest-feature" id="latest">\s*<div class="container">)',
        r'\1<div id="latest-coming-soon-container"></div>', # Insert a new div for dynamic content
        updated_html_content, count=1
    )

    # Add ID to bts-slider div
    updated_html_content = re.sub(
        r'(<div class="bts-slider reveal">)',
        r'<div class="bts-slider reveal" id="bts-carousel">', # Add ID to existing div
        updated_html_content, count=1
    )
    # Remove hardcoded bts-items
    updated_html_content = re.sub(
        r'\s*<div class="bts-item"><img src=\".*?\" alt=\".*?\"></div>\s*', '', updated_html_content
    )

    # Add ID to news-grid div
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

