#!/usr/bin/env python3
"""
YouTube Ultra-Fresh Zero-Quota Scraper (Python)
Compatible with Python 3.8+ using pure standard library (urllib, xml.etree, json)
With optional enhancements for scrapetube / yt-dlp.

Features:
- Instant Channel RSS Scraping (0 quota, live views, real-time seconds-fresh)
- InnerTube Search & Video Extraction (no API key required)
- Batch export to JSON
"""

import sys
import json
import argparse
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
}

def get_channel_rss(channel_id: str):
    """Fetches real-time RSS feed without quota or API keys."""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={urllib.parse.quote(channel_id)}"
    req = urllib.request.Request(url, headers={"User-Agent": HEADERS["User-Agent"]})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            root = ET.fromstring(content)
            
            ns = {
                "atom": "http://www.w3.org/2005/Atom",
                "yt": "http://www.youtube.com/xml/schemas/2015",
                "media": "http://search.yahoo.com/mrss/",
            }
            
            videos = []
            for entry in root.findall("atom:entry", ns):
                vid_el = entry.find("yt:videoId", ns)
                title_el = entry.find("atom:title", ns)
                pub_el = entry.find("atom:published", ns)
                
                media_grp = entry.find("media:group", ns)
                views = 0
                desc = ""
                thumb = ""
                if media_grp is not None:
                    desc_el = media_grp.find("media:description", ns)
                    desc = desc_el.text if desc_el is not None else ""
                    
                    thumb_el = media_grp.find("media:thumbnail", ns)
                    thumb = thumb_el.get("url") if thumb_el is not None else ""
                    
                    comm = media_grp.find("media:community", ns)
                    if comm is not None:
                        stat = comm.find("media:statistics", ns)
                        if stat is not None and stat.get("views"):
                            views = int(stat.get("views"))
                
                videos.append({
                    "video_id": vid_el.text if vid_el is not None else "",
                    "title": title_el.text if title_el is not None else "",
                    "published_at": pub_el.text if pub_el is not None else "",
                    "views": views,
                    "thumbnail": thumb,
                    "description": desc,
                })
            return videos
    except Exception as e:
        print(f"Error fetching RSS: {e}", file=sys.stderr)
        return []

def search_innertube(query: str):
    """Performs an unlimited InnerTube search without Google API quota."""
    url = "https://www.youtube.com/youtubei/v1/search"
    payload = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20240401.01.00",
                "hl": "fr",
                "gl": "FR"
            }
        },
        "query": query
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **HEADERS})
    
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            contents = res.get("contents", {}).get("twoColumnSearchResultsRenderer", {}).get("primaryContents", {}).get("sectionListRenderer", {}).get("contents", [])
            
            channels = []
            videos = []
            
            for section in contents:
                items = section.get("itemSectionRenderer", {}).get("contents", [])
                for item in items:
                    if "channelRenderer" in item:
                        cr = item["channelRenderer"]
                        channels.append({
                            "channel_id": cr.get("channelId"),
                            "title": cr.get("title", {}).get("simpleText"),
                            "subscriber_text": cr.get("videoCountText", {}).get("simpleText") or cr.get("subscriberCountText", {}).get("simpleText"),
                        })
                    elif "videoRenderer" in item:
                        vr = item["videoRenderer"]
                        runs = vr.get("title", {}).get("runs", [])
                        title = "".join(r.get("text", "") for r in runs)
                        videos.append({
                            "video_id": vr.get("videoId"),
                            "title": title,
                            "views_text": vr.get("viewCountText", {}).get("simpleText"),
                            "published_time": vr.get("publishedTimeText", {}).get("simpleText"),
                            "duration": vr.get("lengthText", {}).get("simpleText"),
                        })
            return {"channels": channels, "videos": videos}
    except Exception as e:
        print(f"Error calling InnerTube: {e}", file=sys.stderr)
        return {"channels": [], "videos": []}

def main():
    parser = argparse.ArgumentParser(description="YouTube Ultra-Fresh Scraper (Zero Quota)")
    subparsers = parser.add_subparsers(dest="command")
    
    # RSS Command
    rss_parser = subparsers.add_parser("rss", help="Scrape channel recent live videos via RSS")
    rss_parser.add_argument("channel_id", help="Channel ID (UC...)")
    
    # Search Command
    search_parser = subparsers.add_parser("search", help="Search channels and videos via InnerTube")
    search_parser.add_argument("query", help="Search keywords")
    
    args = parser.parse_args()
    
    if args.command == "rss":
        results = get_channel_rss(args.channel_id)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    elif args.command == "search":
        results = search_innertube(args.query)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
