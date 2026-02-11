import asyncio
import os
import sys
import argparse
from pathlib import Path
from playwright.async_api import async_playwright

async def export_tabs(html_path, output_root):
    html_path = os.path.abspath(html_path)
    if not os.path.exists(html_path):
        print(f"Error: File {html_path} not found.")
        return

    # Find the path relative to 'docs/' to mirror structure
    # Fallback to relpath from current project root if 'docs/' not in path
    try:
        rel_to_docs = os.path.relpath(html_path, os.path.join(os.getcwd(), 'docs'))
    except ValueError:
        rel_to_docs = os.path.relpath(html_path, os.getcwd())
    
    # If it starts with '..', it means it's not inside docs/
    if rel_to_docs.startswith('..'):
        rel_to_docs = os.path.basename(html_path)

    # Subfolder and html name
    rel_dir = os.path.dirname(rel_to_docs)
    basename = os.path.splitext(os.path.basename(html_path))[0]
    
    target_dir = os.path.join(output_root, rel_dir, basename)
    os.makedirs(target_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Set a large viewport for "full screen" effect
        context = await browser.new_context(viewport={'width': 1200, 'height': 800})
        page = await context.new_page()

        # Load the file
        await page.goto(f"file://{html_path}")
        
        # Wait for any initial animations or loads
        await page.wait_for_timeout(1000)

        # Find all tab buttons
        tabs = await page.query_selector_all('[data-role="tab"]')
        
        if not tabs:
            print(f"No tabs found in {html_path}. Taking a single screenshot.")
            await page.screenshot(path=os.path.join(target_dir, f"{basename}.png"), full_page=True)
        else:
            print(f"Found {len(tabs)} tabs. Capturing...")
            for i, tab in enumerate(tabs):
                tab_id = await tab.get_attribute('data-tab') or f"tab_{i}"
                tab_text = (await tab.inner_text()).strip()
                print(f"Capturing tab: {tab_text} ({tab_id})")
                
                # Click the tab
                await tab.click()
                
                # Wait for transitions/animations to finish
                await page.wait_for_timeout(1000)
                
                # Take screenshot of the animation container specifically or the whole page
                # The container is usually .ai-mat
                container = await page.query_selector('.ai-mat')
                if container:
                    await container.screenshot(path=os.path.join(target_dir, f"{i+1}_{tab_id}.png"))
                else:
                    await page.screenshot(path=os.path.join(target_dir, f"{i+1}_{tab_id}.png"), full_page=True)

        await browser.close()
        print(f"Done! PNGs saved to {target_dir}")

def main():
    parser = argparse.ArgumentParser(description="Export HTML animation tabs to PNG.")
    parser.add_argument("html_path", help="Path to the HTML file.")
    parser.add_argument("--output", "-o", default="exports", help="Output directory root.")
    
    args = parser.parse_args()
    
    asyncio.run(export_tabs(args.html_path, args.output))

if __name__ == "__main__":
    main()
