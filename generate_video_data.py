
import os
import re
import yaml
import json

def extract_youtube_id(url):
    """
    Extract the 11-character YouTube ID from various URL formats.
    """
    if not url:
        return None
    
    match = re.search(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|v/|shorts/))([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
    
    return None

def parse_markdown_file(filepath):
    """
    Parse a Markdown file with flexible format support.
    Supports YAML frontmatter, Markdown links, and HTML anchor tags.
    Returns a dictionary with extracted data, or empty dict if parsing fails.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return {}
    
    # ===== FORMAT 1: YAML FRONTMATTER =====
    yaml_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if yaml_match:
        try:
            frontmatter = yaml.safe_load(yaml_match.group(1))
            if frontmatter and isinstance(frontmatter, dict):
                return frontmatter
        except yaml.YAMLError as e:
            print(f"YAML parsing error in {filepath}: {e}")
    
    # ===== FORMAT 2: MARKDOWN LINK [Title](URL) =====
    markdown_link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', content)
    if markdown_link_match:
        title = markdown_link_match.group(1).strip()
        url = markdown_link_match.group(2).strip()
        youtube_id = extract_youtube_id(url)
        return {'title': title, 'id': youtube_id, 'tag': 'New', 'url': url} if youtube_id else {'title': title, 'url': url, 'tag': 'New'}
    
    # ===== FORMAT 3: HTML ANCHOR TAG <a href="URL">Title</a> =====
    html_anchor_match = re.search(r'<a\s+href=[\"\"]([^\"\"]+)[\"\"]\s*>([^<]+)<\/a>', content, re.IGNORECASE)
    if html_anchor_match:
        url = html_anchor_match.group(1).strip()
        title = html_anchor_match.group(2).strip()
        youtube_id = extract_youtube_id(url)
        return {'title': title, 'id': youtube_id, 'tag': 'New', 'url': url} if youtube_id else {'title': title, 'url': url, 'tag': 'New'}
    
    return {}

def collect_content_data(base_path, folder_name, file_extension=".md"):
    """
    Collect data from files in a specified folder.
    """
    data_list = []
    folder_path = os.path.join(base_path, folder_name)
    if os.path.exists(folder_path):
        for filename in sorted(os.listdir(folder_path)):
            if filename.endswith(file_extension):
                filepath = os.path.join(folder_path, filename)
                data = parse_markdown_file(filepath)
                if data:
                    data_list.append(data)
                    print(f"\u2713 Parsed: {filename} -> {data.get('title', 'No Title')}")
                else:
                    print(f"\u2717 Failed to parse: {filename}")
    return data_list

def generate_js_data_block(variable_name, data_object):
    """
    Generates a JavaScript block for the given data object.
    """
    json_data = json.dumps(data_object, indent=4)
    js_string = f"        // ===== {variable_name.upper()} DATA STRUCTURE =====\n"
    js_string += f"        const {variable_name} = {json_data};\n"
    return js_string

def generate_latest_coming_soon_html(data):
    if not data:
        return ""
    item = data[0] # Assuming only one item for the mega banner
    html = f"""
    <!-- 6. Latest Coming Soon Mega Banner (Dynamically Generated) -->
    <section class="reveal">
        <div class="coming-soon">
            <div class="cs-content">
                <span class="cs-tag cinematic-font">{item.get('tag', 'Coming Soon').upper()}</span>
                <h2 class="cs-title luxury-font">{item.get('title', 'New Project')}</h2>
                <p class="cs-description">{item.get('description', '')}</p>
                <div class="feature-details">
                    <div class="detail-item">
                        <span>Director</span>
                        <p>{item.get('director', 'N/A')}</p>
                    </div>
                    <div class="detail-item">
                        <span>Cast</span>
                        <p>{', '.join(item.get('cast', ['N/A']))}</p>
                    </div>
                    <div class="detail-item">
                        <span>Release</span>
                        <p>{item.get('release_date', 'N/A')}</p>
                    </div>
                </div>
                <a href="{item.get('url', '#')}" target="_blank" class="btn btn-primary">Watch Trailer</a>
            </div>
        </div>
    </section>
    """
    return html

def generate_premiering_2026_html(data):
    if not data:
        return ""
    cards_html = ""
    for item in data:
        cards_html += f"""
                <div class="project-card">
                    <h3 class="luxury-font">{item.get('title', 'Upcoming Project')}</h3>
                    <p>Status: {item.get('status', 'N/A')}</p>
                    <p>Expected Release: {item.get('expected_release', 'N/A')}</p>
                </div>
        """
    html = f"""
    <!-- Premiering 2026 Section (Dynamically Generated) -->
    <section class="section-padding" id="premiering-2026">
        <div class="container">
            <h2 class="luxury-font reveal" style="margin-bottom: 50px; font-size: 32px;">Premiering 2026</h2>
            <div class="premiering-grid reveal">
                {cards_html}
            </div>
        </div>
    </section>
    """
    return html

def generate_exclusive_bts_stills_html(data):
    if not data:
        return ""
    images_html = ""
    for item in data:
        for img in item.get('images', []):
            images_html += f'<div class="bts-item"><img src="{img.get("url", "#")}" alt="{img.get("alt", "BTS Image")}"></div>\n'
    html = f"""
    <!-- Exclusive BTS Stills Section (Dynamically Generated) -->
    <section class="section-padding">
        <div class="container">
            <h2 class="luxury-font reveal" style="margin-bottom: 50px; font-size: 32px;">Exclusive BTS Stills</h2>
            <div class="bts-slider reveal">
                {images_html}
            </div>
        </div>
    </section>
    """
    return html

def generate_newsroom_html(data):
    if not data:
        return ""
    news_cards_html = ""
    for item in data:
        news_cards_html += f"""
                <div class="news-card">
                    <span class="news-date">{item.get('date', 'N/A')}</span>
                    <h3 class="luxury-font">{item.get('title', 'No Title')}</h3>
                    <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 20px;">{item.get('summary', '')}</p>
                    <a href="{item.get('url', '#')}" style="color: var(--emerald); text-decoration: none; font-size: 12px; font-weight: 700;">READ MORE <i class="fas fa-arrow-right"></i></a>
                </div>
        """
    html = f"""
    <!-- Newsroom & PR Grid (Dynamically Generated) -->
    <section class="section-padding" id="news">
        <div class="container">
            <h2 class="luxury-font reveal" style="margin-bottom: 50px; font-size: 42px;">Newsroom</h2>
            <div class="news-grid reveal">
                {news_cards_html}
            </div>
        </div>
    </section>
    """
    return html

def update_index_html(html_filepath, new_js_data_blocks, new_html_sections):
    """
    Update the index.html file with new JavaScript data blocks and dynamic HTML sections.
    """
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_filepath}: {e}")
        return False

    updated_html_content = html_content

    # Update JavaScript data blocks
    for var_name, js_block in new_js_data_blocks.items():
        pattern = re.compile(r'\s*// ===== ' + re.escape(var_name.upper()) + r' DATA STRUCTURE =====.*?^\s*};', re.DOTALL | re.MULTILINE)
        if pattern.search(updated_html_content):
            updated_html_content = pattern.sub(js_block.rstrip(), updated_html_content)
            print(f"\u2713 Replaced existing {var_name} block.")
        else:
            # Fallback for initial insertion if block not found
            insert_marker = "        // ===== VIDEO RENDERING FUNCTION ====="
            if insert_marker in updated_html_content:
                updated_html_content = updated_html_content.replace(insert_marker, js_block.rstrip() + "\n\n        // ===== VIDEO RENDERING FUNCTION =====")
                print(f"\u2713 Inserted {var_name} block before video rendering function.")
            else:
                print(f"\u2717 Error: Could not find insertion point for {var_name} in index.html")
                return False

    # Update HTML sections
    # Latest Coming Soon
    updated_html_content = re.sub(
        r'<!-- LATEST COMING SOON DYNAMIC CONTENT -->',
        new_html_sections['latestComingSoonHtml'],
        updated_html_content, flags=re.DOTALL
    )
    print("\u2713 Updated Latest Coming Soon HTML section.")

    # Premiering 2026
    updated_html_content = re.sub(
        r'<!-- PREMIERING 2026 DYNAMIC CONTENT -->',
        new_html_sections['premiering2026Html'],
        updated_html_content, flags=re.DOTALL
    )
    print("\u2713 Updated Premiering 2026 HTML section.")

    # Exclusive BTS Stills
    updated_html_content = re.sub(
        r'<!-- EXCLUSIVE BTS STILLS DYNAMIC CONTENT -->',
        new_html_sections['exclusiveBtsStillsHtml'],
        updated_html_content, flags=re.DOTALL
    )
    print("\u2713 Updated Exclusive BTS Stills HTML section.")

    # Newsroom
    updated_html_content = re.sub(
        r'<!-- NEWSROOM DYNAMIC CONTENT -->',
        new_html_sections['newsroomHtml'],
        updated_html_content, flags=re.DOTALL
    )
    print("\u2713 Updated Newsroom HTML section.")

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
    print("Starting Content Data Generation...")
    print("=" * 60)

    # 1. Collect data from all specified folders
    all_content_data = {
        "videosData": {
            "recent": collect_content_data(repo_root, 'recent-releases'),
            "media": collect_content_data(repo_root, 'the-media-hub')
        },
        "latestComingSoon": collect_content_data(repo_root, 'latest-coming-soon'),
        "premiering2026": collect_content_data(repo_root, 'premiering-2026'),
        "exclusiveBtsStills": collect_content_data(repo_root, 'exclusive-bts-stills'),
        "newsroom": collect_content_data(repo_root, 'newsroom')
    }

    print("\n" + "=" * 60)
    print(f"Summary:")
    for key, value in all_content_data.items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                print(f"  {key.replace('Data', '').replace('videos', 'Videos ')} {sub_key.capitalize()}: {len(sub_value)} items")
        else:
            print(f"  {key.replace('Data', '')}: {len(value)} items")
    print("=" * 60)

    # 2. Generate the JavaScript data blocks
    js_data_blocks = {
        "videosData": generate_js_data_block("videosData", all_content_data["videosData"]),
        "latestComingSoonData": generate_js_data_block("latestComingSoonData", all_content_data["latestComingSoon"]),
        "premiering2026Data": generate_js_data_block("premiering2026Data", all_content_data["premiering2026"]),
        "exclusiveBtsStillsData": generate_js_data_block("exclusiveBtsStillsData", all_content_data["exclusiveBtsStills"]),
        "newsroomData": generate_js_data_block("newsroomData", all_content_data["newsroom"])
    }

    # 3. Generate dynamic HTML sections
    html_sections = {
        "latestComingSoonHtml": generate_latest_coming_soon_html(all_content_data["latestComingSoon"]),
        "premiering2026Html": generate_premiering_2026_html(all_content_data["premiering2026"]),
        "exclusiveBtsStillsHtml": generate_exclusive_bts_stills_html(all_content_data["exclusiveBtsStills"]),
        "newsroomHtml": generate_newsroom_html(all_content_data["newsroom"])
    }

    # 4. Update index.html
    if update_index_html(index_html_path, js_data_blocks, html_sections):
        print("\n\u2713 index.html updated successfully with all new content data and dynamic sections.")
    else:
        print("\n\u2717 Failed to update index.html")
