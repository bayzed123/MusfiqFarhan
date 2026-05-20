
import os
import re
import yaml

def parse_markdown_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for YAML frontmatter
    match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if match:
        frontmatter = yaml.safe_load(match.group(1))
        return frontmatter
    return {}

def collect_videos_data(base_path):
    videos_data = {
        "recent": [],
        "media": []
    }

    # Collect Recent Releases
    recent_releases_path = os.path.join(base_path, 'recent-releases')
    if os.path.exists(recent_releases_path):
        for filename in os.listdir(recent_releases_path):
            if filename.endswith('.md'):
                filepath = os.path.join(recent_releases_path, filename)
                data = parse_markdown_file(filepath)
                if data and 'title' in data and 'id' in data and 'tag' in data:
                    videos_data['recent'].append({
                        'title': data['title'],
                        'id': data['id'],
                        'tag': data['tag']
                    })

    # Collect Media Hub videos
    media_hub_path = os.path.join(base_path, 'the-media-hub')
    if os.path.exists(media_hub_path):
        for filename in os.listdir(media_hub_path):
            if filename.endswith('.md'):
                filepath = os.path.join(media_hub_path, filename)
                data = parse_markdown_file(filepath)
                if data and 'title' in data and 'id' in data and 'tag' in data:
                    videos_data['media'].append({
                        'title': data['title'],
                        'id': data['id'],
                        'tag': data['tag']
                    })
    return videos_data

def generate_videos_data_js(videos_data):
    js_string = "        // ===== VIDEO DATA STRUCTURE =====\n"
    js_string += "        const videosData = {\n"
    
    # Recent videos
    js_string += "            recent: [\n"
    for video in videos_data['recent']:
        js_string += f"                {{ title: \"{video['title']}\", id: \"{video['id']}\", tag: \"{video['tag']}\" }},\n"
    js_string += "            ],\n"

    # Media videos
    js_string += "            media: [\n"
    for video in videos_data['media']:
        js_string += f"                {{ title: \"{video['title']}\", id: \"{video['id']}\", tag: \"{video['tag']}\" }},\n"
    js_string += "            ]\n"
    js_string += "        };\n"
    return js_string

def update_index_html(html_filepath, new_videos_data_js):
    with open(html_filepath, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Find the existing videosData block and replace it
    # This regex looks for the specific comment and the const videosData = {...} block
    pattern = re.compile(r'\s*// ===== VIDEO DATA STRUCTURE =====.*?^\s*};', re.DOTALL | re.MULTILINE)
    
    if pattern.search(html_content):
        updated_html_content = pattern.sub(new_videos_data_js.strip(), html_content)
    else:
        # Fallback if the pattern is not found, try to insert before VIDEO RENDERING FUNCTION
        print("Warning: Existing videosData block not found. Attempting to insert before VIDEO RENDERING FUNCTION.")
        insert_pattern = re.compile(r'\s*// ===== VIDEO RENDERING FUNCTION =====')
        updated_html_content = insert_pattern.sub(new_videos_data_js.strip() + '\n\n        // ===== VIDEO RENDERING FUNCTION =====', html_content)

    with open(html_filepath, 'w', encoding='utf-8') as f:
        f.write(updated_html_content)

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    index_html_path = os.path.join(repo_root, 'index.html')

    # 1. Collect data from Markdown files
    videos_data = collect_videos_data(repo_root)

    # 2. Generate the JavaScript string
    new_videos_data_js = generate_videos_data_js(videos_data)

    # 3. Update index.html
    update_index_html(index_html_path, new_videos_data_js)
    print("index.html updated successfully with new video data.")
