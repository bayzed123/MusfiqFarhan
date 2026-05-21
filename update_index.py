import os
import re
import yaml
from bs4 import BeautifulSoup
import json

# Define the folders
FOLDERS = {
    'recent-releases': 'recent',
    'the-media-hub': 'media',
    'latest-coming-soon': 'latest_coming_soon',
    'premiering-2026': 'premiering_2026',
    'exclusive-bts-stills': 'bts_stills',
    'newsroom': 'newsroom'
}

def parse_frontmatter(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.match(r'^---\s*
(.*?)
---\s*
(.*)', content, re.DOTALL)
        if match:
            yaml_content = match.group(1)
            data = yaml.safe_load(yaml_content)
            return data if data else {}
        else:
            try:
                data = yaml.safe_load(content)
                if isinstance(data, dict): return data
            except: pass
            return {}
    except Exception as e:
        print(f'Error parsing {file_path}: {e}')
        return {}

def extract_youtube_id(url):
    if not url: return ''
    match = re.search(r'youtu\.be/([a-zA-Z0-9_-]+)', url)
    if match: return match.group(1)
    match = re.search(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)', url)
    if match: return match.group(1)
    match = re.search(r'youtube\.com/embed/([a-zA-Z0-9_-]+)', url)
    if match: return match.group(1)
    return ''

def process_folders():
    data = {k: [] for k in FOLDERS.values()}
    for folder, key in FOLDERS.items():
        if not os.path.exists(folder): continue
        for filename in os.listdir(folder):
            if filename.endswith(('.md', '.yml', '.yaml')):
                file_path = os.path.join(folder, filename)
                file_data = parse_frontmatter(file_path)
                if not file_data: continue
                if 'url' in file_data and ('youtube.com' in file_data['url'] or 'youtu.be' in file_data['url']):
                    file_data['id'] = extract_youtube_id(file_data['url'])
                data[key].append(file_data)
    for key in data: data[key].sort(key=lambda x: x.get('date', ''), reverse=True)
    return data

def update_index_html(data):
    index_path = 'index.html'
    if not os.path.exists(index_path): return False
    try:
        with open(index_path, 'r', encoding='utf-8') as f: html_content = f.read()
        recent_videos = [{'title': i.get('title', ''), 'id': i.get('id', ''), 'tag': i.get('tag', 'New')} for i in data['recent'] if 'title' in i and 'id' in i]
        media_videos = [{'title': i.get('title', ''), 'id': i.get('id', ''), 'tag': i.get('tag', 'Featured')} for i in data['media'] if 'title' in i and 'id' in i]
        new_videos_data_str = 'const videosData = {
            recent: ' + json.dumps(recent_videos, indent=16).strip() + ',
            media: ' + json.dumps(media_videos, indent=16).strip() + '
        };'
        pattern = r'const videosData = \{[\s\S]*?\};\s*
'
        if re.search(pattern, html_content): html_content = re.sub(pattern, new_videos_data_str + '
', html_content)
        soup = BeautifulSoup(html_content, 'html.parser')
        if data['latest_coming_soon']:
            latest = data['latest_coming_soon'][0]
            latest_section = soup.find('div', class_='latest-feature')
            if latest_section:
                if 'poster_url' in latest:
                    latest_section['style'] = f"background: linear-gradient(to right, rgba(5, 7, 10, 1), rgba(5, 7, 10, 0.8)), url('{latest['poster_url']}'); background-size: cover; background-position: center;"
                    poster_img = latest_section.find('div', class_='feature-poster').find('img')
                    if poster_img: poster_img['src'] = latest['poster_url']
                content_div = latest_section.find('div', class_='feature-content')
                if content_div:
                    tag = content_div.find('span', class_='feature-tag')
                    if tag and 'tag' in latest: tag.string = latest['tag']
                    title = content_div.find('h2')
                    if title and 'title' in latest: title.string = latest['title']
                    desc = content_div.find('p', class_='feature-desc')
                    if desc and 'description' in latest: desc.string = latest['description']
                    details = content_div.find_all('div', class_='detail-item')
                    for detail in details:
                        span, p = detail.find('span'), detail.find('p')
                        if span and p:
                            label = span.string.strip().lower()
                            if 'director' in label and 'director' in latest: p.string = latest['director']
                            elif 'cast' in label and 'cast' in latest: p.string = ', '.join(latest['cast']) if isinstance(latest['cast'], list) else latest['cast']
                            elif 'release' in label and 'release_date' in latest: p.string = latest['release_date']
                    trailer_btn = content_div.find('a', class_='btn-primary')
                    if trailer_btn and 'url' in latest: trailer_btn['href'] = latest['url']
        if data['premiering_2026']:
            premiering = data['premiering_2026'][0]
            cs_content = soup.find('div', class_='cs-content')
            if cs_content:
                tag = cs_content.find('span', class_='cs-tag')
                if tag and 'tag' in premiering: tag.string = premiering['tag']
                title = cs_content.find('h2', class_='cs-title')
                if title and 'title' in premiering: title.string = premiering['title']
                btn = cs_content.find('a', class_='btn-primary')
                if btn and 'url' in premiering: btn['href'] = premiering['url']
        html_content = str(soup)
        if data['bts_stills']:
            bts_html = ''.join([f'                <div class="bts-item"><img src="{img["url"]}" alt="{img.get("alt", "BTS Still")}"></div>
' for bts in data['bts_stills'] for img in bts.get('images', []) if isinstance(img, dict) and 'url' in img])
            if bts_html:
                pattern = re.compile(r'<!-- BTS_STILLS_INJECTION_START -->(.*?)<!-- BTS_STILLS_INJECTION_END -->', re.DOTALL)
                html_content = pattern.sub(f'<!-- BTS_STILLS_INJECTION_START -->
{bts_html}                <!-- BTS_STILLS_INJECTION_END -->', html_content)
        if data['newsroom']:
            news_html = ''.join([f'                <div class="news-card">
                    <span class="news-date">{n.get("date", "")}</span>
                    <h3 class="luxury-font">{n.get("title", "")}</h3>
                    <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 20px;">{n.get("summary", "")}</p>
                    <a href="{n.get("url", "#")}" style="color: var(--emerald); text-decoration: none; font-size: 12px; font-weight: 700;">READ MORE <i class="fas fa-arrow-right"></i></a>
                </div>
' for n in data['newsroom'][:3]])
            if news_html:
                pattern = re.compile(r'<!-- NEWSROOM_INJECTION_START -->(.*?)<!-- NEWSROOM_INJECTION_END -->', re.DOTALL)
                html_content = pattern.sub(f'<!-- NEWSROOM_INJECTION_START -->
{news_html}                <!-- NEWSROOM_INJECTION_END -->', html_content)
        with open(index_path, 'w', encoding='utf-8') as f: f.write(html_content)
        return True
    except Exception as e: print(f'Error: {e}'); return False

if __name__ == '__main__':
    data = process_folders()
    update_index_html(data)
