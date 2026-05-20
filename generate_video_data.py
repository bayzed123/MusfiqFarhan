import os
import re
import yaml
from datetime import datetime

# =========================
# SAFE MARKER REPLACEMENT
# =========================

def replace_between_markers(html, start_marker, end_marker, new_content):
    start = html.find(start_marker)
    end = html.find(end_marker)

    if start == -1 or end == -1:
        print(f"⚠ Missing marker: {start_marker}")
        return html

    end = end + len(end_marker)

    return html[:start] + start_marker + "\n" + new_content + "\n" + html[end:]


# =========================
# YOUTUBE ID EXTRACT
# =========================

def extract_youtube_id(url):
    if not url:
        return None

    patterns = [
        r'youtu\.be/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})'
    ]

    for p in patterns:
        match = re.search(p, url)
        if match:
            return match.group(1)

    return None


# =========================
# IMAGE CHECK
# =========================

def is_image_url(url):
    if not url:
        return False

    ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    if any(url.lower().endswith(e) for e in ext):
        return True

    domains = ['postimg.cc', 'imgur.com', 'ibb.co', 'unsplash.com', 'i.ytimg.com']
    return any(d in url.lower() for d in domains)


# =========================
# PARSE MARKDOWN FILE
# =========================

def parse_markdown_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error: {filepath} -> {e}")
        return {}

    data = {}
    raw = content

    # YAML frontmatter
    yaml_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if yaml_match:
        try:
            front = yaml.safe_load(yaml_match.group(1))
            if isinstance(front, dict):
                data.update(front)
                raw = content[yaml_match.end():].strip()
        except:
            pass

    url = data.get("url")

    if not url and data.get("id"):
        url = f"https://www.youtube.com/watch?v={data['id']}"

    if not url:
        md = re.search(r'\[([^\]]+)\]\(([^)]+)\)', raw)
        if md:
            data["title"] = data.get("title", md.group(1))
            url = md.group(2)

    if url:
        yt = extract_youtube_id(url)
        if yt:
            data["type"] = "video"
            data["id"] = yt
        elif is_image_url(url):
            data["type"] = "image"
            data["url"] = url
        else:
            data["type"] = "link"
            data["url"] = url

    data["tag"] = data.get("tag", "New")
    return data


# =========================
# COLLECT CONTENT
# =========================

def collect_content(base_path):
    folders = {
        "recent": "recent-releases",
        "media": "the-media-hub",
        "coming": "latest-coming-soon",
        "premiere": "premiering-2026",
        "bts": "exclusive-bts-stills",
        "news": "newsroom"
    }

    all_data = {k: [] for k in folders}

    for key, folder in folders.items():
        path = os.path.join(base_path, folder)

        if not os.path.exists(path):
            continue

        for file in sorted(os.listdir(path)):
            if file.endswith(".md"):
                data = parse_markdown_file(os.path.join(path, file))
                if data:
                    data["filename"] = file
                    all_data[key].append(data)

    return all_data


# =========================
# GENERATE JS DATA
# =========================

def generate_js(all_data):
    return f"""
// AUTO GENERATED DATA

const videosData = {{
    recent: {all_data['recent']},
    media: {all_data['media']}
}};

const comingSoonData = {all_data['coming'] + all_data['premiere']};

const exclusiveBtsData = {all_data['bts']};

const newsroomData = {all_data['news']};
"""


# =========================
# MAIN
# =========================

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(root, "index.html")

    print("🚀 CMS Builder Running...")

    data = collect_content(root)
    js_data = generate_js(data)

    # read html
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # SAFE MARKER UPDATES ONLY (NO REGEX HTML DAMAGE)

    html = replace_between_markers(
        html,
        "<!-- CMS:VIDEO_START -->",
        "<!-- CMS:VIDEO_END -->",
        "const videosData = " + str(data['recent'])
    )

    html = replace_between_markers(
        html,
        "<!-- CMS:COMING_START -->",
        "<!-- CMS:COMING_END -->",
        "const comingSoonData = " + str(data['coming'] + data['premiere'])
    )

    html = replace_between_markers(
        html,
        "<!-- CMS:BTS_START -->",
        "<!-- CMS:BTS_END -->",
        "const exclusiveBtsData = " + str(data['bts'])
    )

    html = replace_between_markers(
        html,
        "<!-- CMS:NEWS_START -->",
        "<!-- CMS:NEWS_END -->",
        "const newsroomData = " + str(data['news'])
    )

    # write back
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ CMS Updated Safely")
