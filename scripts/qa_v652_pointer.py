"""Isolated viewport-coordinate regression for the theme pointer."""
import json
import os
from playwright.sync_api import sync_playwright
from qa_v65_feedback_home import seed, route_time


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={"width": 1512, "height": 982}, reduced_motion="no-preference")
        context.add_init_script(seed())
        context.route("**/api/server-time", route_time)
        context.route("**/api/time", route_time)
        page = context.new_page()
        page.goto(os.environ.get("AUDIT_URL", "http://127.0.0.1:5178/"))
        marker = page.locator(".v64-theme-pointer")
        marker.wait_for(state="attached")
        samples = []
        # Synthetic interactive target changes hover state without navigation.
        page.evaluate("""() => {
          const b = document.createElement('button'); b.id = 'pointer-fixture';
          Object.assign(b.style, {position:'fixed', left:'800px', top:'300px', width:'100px', height:'60px', zIndex:'10000'});
          b.textContent = 'Pointer fixture'; document.body.append(b);
        }""")
        for x, y in [(100, 100), (830, 330), (1300, 700)]:
            page.mouse.move(x, y)
            page.wait_for_timeout(150)
            row = marker.evaluate("""e => ({rect:e.getBoundingClientRect().toJSON(), parent:e.parentElement.tagName,
              enabled:e.dataset.enabled, scale:getComputedStyle(e).scale, hovering:e.classList.contains('is-hovering')})""")
            assert row["enabled"] == "true" and row["parent"] == "BODY", row
            assert abs(row["rect"]["x"] - x - 8) < 1 and abs(row["rect"]["y"] - y - 8) < 1, row
            assert row["scale"] == "none", row
            if x == 830:
                assert row["hovering"], row
                page.mouse.down()
                assert marker.evaluate("e => e.classList.contains('is-pressed')")
                page.mouse.up()
            samples.append(row)
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_timeout(100)
        assert marker.get_attribute("data-enabled") == "false"
        assert not marker.is_visible()
        print(json.dumps({"status": "PASS", "fixture": "isolated-local-family", "samples": samples, "reducedMotion": "PASS"}))
        browser.close()


if __name__ == "__main__":
    main()
