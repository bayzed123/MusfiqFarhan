import os
import re
import yaml

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

def parse_markdown_file(filepath):
    """
    Parse a Markdown file with flexible format support.
    
    Supports three formats:
    1. YAML frontmatter (---title: "..." id: "..." tag: "..."---)
    2. Markdown link ([Title](URL))
    3. HTML anchor tag (<a href="URL">Title</a>)
    
    Returns a dictionary with 'title', 'id', and 'tag' keys, or empty dict if parsing fails.
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
                if 'title' in frontmatter and 'id' in frontmatter:
                    return {
                        'title': frontmatter.get('title', ''),
                        'id': frontmatter.get('id', ''),
                        'tag': frontmatter.get('tag', 'New')
                    }
        except yaml.YAMLError as e:
            print(f"YAML parsing error in {filepath}: {e}")
    
    # ===== FORMAT 2: MARKDOWN LINK [Title](URL) =====
    markdown_link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', content)
    if markdown_link_match:
        title = markdown_link_match.group(1).strip()
        url = markdown_link_match.group(2).strip()
        youtube_id = extract_youtube_id(url)
        
        if youtube_id:
            return {
                'title': title,
                'id': youtube_id,
                'tag': 'New'
            }
    
    # ===== FORMAT 3: HTML ANCHOR TAG <a href="URL">Title</a> =====
    html_anchor_match = re.search(r'<a\s+href=["\']([^"\']+)["\']\s*>([^<]+)<\/a>', content, re.IGNORECASE)
    if html_anchor_match:
        url = html_anchor_match.group(1).strip()
        title = html_anchor_match.group(2).strip()
        youtube_id = extract_youtube_id(url)
        
        if youtube_id:
            return {
                'title': title,
                'id': youtube_id,
                'tag': 'New'
            }
    
    # ===== NO MATCH FOUND =====
    return {}

def collect_videos_data(base_path):
    """
    Collect video data from Markdown files in recent-releases and the-media-hub folders.
    """
    videos_data = {
        "recent": [],
        "media": []
    }

    # Collect Recent Releases
    recent_releases_path = os.path.join(base_path, 'recent-releases')
    if os.path.exists(recent_releases_path):
        for filename in sorted(os.listdir(recent_releases_path)):
            if filename.endswith('.md'):
                filepath = os.path.join(recent_releases_path, filename)
                data = parse_markdown_file(filepath)
                if data and 'title' in data and 'id' in data:
                    videos_data['recent'].append({
                        'title': data['title'],
                        'id': data['id'],
                        'tag': data.get('tag', 'New')
                    })
                    print(f"✓ Parsed: {filename} -> {data['title']}")
                else:
                    print(f"✗ Failed to parse: {filename}")

    # Collect Media Hub videos
    media_hub_path = os.path.join(base_path, 'the-media-hub')
    if os.path.exists(media_hub_path):
        for filename in sorted(os.listdir(media_hub_path)):
            if filename.endswith('.md'):
                filepath = os.path.join(media_hub_path, filename)
                data = parse_markdown_file(filepath)
                if data and 'title' in data and 'id' in data:
                    videos_data['media'].append({
                        'title': data['title'],
                        'id': data['id'],
                        'tag': data.get('tag', 'New')
                    })
                    print(f"✓ Parsed: {filename} -> {data['title']}")
                else:
                    print(f"✗ Failed to parse: {filename}")
    
    return videos_data

def generate_videos_data_js(videos_data):
    """
    Generate the JavaScript videosData object from collected video data.
    """
    js_string = "        // ===== VIDEO DATA STRUCTURE =====\n"
    js_string += "        const videosData = {\n"
    
    # Recent videos
    js_string += "            recent: [\n"
    for video in videos_data['recent']:
        # Escape quotes in title
        title_escaped = video['title'].replace('"', '\\"')
        js_string += f"                {{ title: \"{title_escaped}\", id: \"{video['id']}\", tag: \"{video['tag']}\" }},\n"
    js_string += "            ],\n"

    # Media videos
    js_string += "            media: [\n"
    for video in videos_data['media']:
        # Escape quotes in title
        title_escaped = video['title'].replace('"', '\\"')
        js_string += f"                {{ title: \"{title_escaped}\", id: \"{video['id']}\", tag: \"{video['tag']}\" }},\n"
    js_string += "            ]\n"
    js_string += "        };\n"
    
    return js_string

def update_index_html(html_filepath, new_videos_data_js):
    """
    Update the index.html file with the new videosData JavaScript object.
    """
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_filepath}: {e}")
        return False

    # Find and replace the existing videosData block
    pattern = re.compile(r'\s*// ===== VIDEO DATA STRUCTURE =====.*?^\s*};', re.DOTALL | re.MULTILINE)
    
    if pattern.search(html_content):
        updated_html_content = pattern.sub(new_videos_data_js.rstrip(), html_content)
    else:
        print("Warning: Existing videosData block not found. Attempting to insert before VIDEO RENDERING FUNCTION.")
        insert_pattern = re.compile(r'\s*// ===== VIDEO RENDERING FUNCTION =====')
        if insert_pattern.search(html_content):
            updated_html_content = insert_pattern.sub(new_videos_data_js.rstrip() + "\n\n        // ===== VIDEO RENDERING FUNCTION =====", html_content)
        else:
            print("Error: Could not find insertion point in index.html")
            return False

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
    print("Starting Video Data Generation...")
    print("=" * 60)

    # 1. Collect data from Markdown files
    videos_data = collect_videos_data(repo_root)

    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  Recent Releases: {len(videos_data['recent'])} videos")
    print(f"  Media Hub: {len(videos_data['media'])} videos")
    print("=" * 60)

    # 2. Generate the JavaScript string
    new_videos_data_js = generate_videos_data_js(videos_data)

    # 3. Update index.html
    if update_index_html(index_html_path, new_videos_data_js):
        print("\n✓ index.html updated successfully with new video data.")
    else:
        print("\n✗ Failed to update index.html")
