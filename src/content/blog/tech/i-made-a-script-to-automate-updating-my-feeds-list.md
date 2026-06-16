---
title: "I Made A Script To Automate Updating My Feeds List"
description: "I wrote a Python script to read a portion of my .opml file and output a markdown-friendly version."
date: 2026-01-08T09:00:00
tags: [tech, "2026"]
---

Today I made a Python script to make my life a little easier when it comes to updating my [Feeds](/feeds) page. I follow and un-follow blogs occasionally, so exporting that and then writing it up in Markdown is kind of a bummer.

Instead, I have this script, which extracts the name of the blog, the URL, and the feed URL, then outputs it in the terminal so you can copy and paste it as markdown. Easy to share!

Note that I made this **specifically** for how my .opml file works (I exported mine from Unread). YMMV. The syntax is:
`python opml_to_markdown.py Subscriptions.opml "Personal Blogs"`

That last argument is because I have a tagging system. All of my personal blogs are under that tag I created in my reader. That way, readers of this blog who are interested in social blogging aren't getting stuff like The Verge or Ars Technica on my Feeds page. *Only* personal, indie blogs.

`opml_to_markdown.py`
```python
import xml.etree.ElementTree as ET
import html
import sys


def escape_pipes(text: str) -> str:
    """Escape pipe characters for Markdown tables."""
    return text.replace("|", "\\|")


def extract_markdown_table(opml_path, section_title):
    tree = ET.parse(opml_path)
    root = tree.getroot()

    outlines = root.findall(".//outline")

    target_section = None
    for outline in outlines:
        if outline.attrib.get("title") == section_title:
            target_section = outline
            break

    if target_section is None:
        raise ValueError(f'Section "{section_title}" not found in OPML.')

    print("## Links\n")

    # Table header
    print("| Blog | Feed |")
    print("| ---- | ---- |")

    for child in target_section.findall("outline"):
        title = child.attrib.get("title") or child.attrib.get("text")
        site_url = child.attrib.get("htmlUrl")
        feed_url = child.attrib.get("xmlUrl")

        if not title or not site_url:
            continue

        title = escape_pipes(html.unescape(title))

        blog_cell = f"[{title}]({site_url})"
        feed_cell = f"[Feed]({feed_url})" if feed_url else ""

        print(f"| {blog_cell} | {feed_cell} |")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python opml_to_markdown.py <opml_file> <section_title>")
        sys.exit(1)

    extract_markdown_table(sys.argv[1], sys.argv[2])
```
