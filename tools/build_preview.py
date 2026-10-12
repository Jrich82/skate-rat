"""Builds preview/index.html: the widget plus fake-event buttons, with the art embedded."""
import json, pathlib, shutil
root = pathlib.Path(__file__).resolve().parent.parent
src = root / "widget"
out = root / "preview"
out.mkdir(exist_ok=True)
html, css, js = (src / "widget.html").read_text(), (src / "widget.css").read_text(), (src / "widget.js").read_text()
fields = json.loads((src / "fields.json").read_text())
defaults = {k: v["value"] for k, v in fields.items() if v["type"] != "button"}
import base64
def uri(p): return "data:image/png;base64," + base64.b64encode((root / "art" / p).read_bytes()).decode()
defaults.update(ratImage=uri("rat-ride.png"), ratIdleImage=uri("rat-idle.png"), ratAirImage=uri("rat-air.png"), boardImage=uri("board.png"))

preview = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Skate Rat Preview</title>
<style>{css}
html,body{{overflow:auto;background:#140c1e}}
body{{font-family:system-ui,sans-serif;color:#eee;padding:20px;box-sizing:border-box}}
h1{{font:700 26px system-ui;margin:0 0 4px}} p{{margin:0 0 14px;color:#bba9d2;font-size:14px}}
.stage{{width:100%;max-width:1080px;aspect-ratio:1080/720;border-radius:14px;overflow:hidden;position:relative;
  background:radial-gradient(ellipse at 20% 0%,rgba(255,43,214,.45),transparent 60%),radial-gradient(ellipse at 90% 100%,rgba(39,245,255,.35),transparent 60%),#0b0612}}
.stage #lane{{position:absolute;inset:0}}
.btns{{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;max-width:1080px}}
.btns button{{font:600 14px system-ui;padding:10px 14px;border-radius:10px;border:1px solid #4a3166;background:#22143a;color:#fff;cursor:pointer}}
.btns button:hover{{border-color:#ff2bd6}}
</style></head><body>
<h1>Skate Rat — preview</h1>
<p>The rat waits on the deck. Click to fire fake stream events — bigger superchats get bigger air. Click a few fast for a combo. In StreamElements these come from real superchats, members and chat.</p>
<div class="stage">{html}</div>
<div class="btns">
<button data-l="sponsor-latest">New member</button>
<button data-l="subscriber-latest">New subscriber</button>
<button data-l="superchat-latest" data-a="2">Superchat A$2</button>
<button data-l="superchat-latest" data-a="10">Superchat A$10</button>
<button data-l="superchat-latest" data-a="25">Superchat A$25</button>
<button data-l="superchat-latest" data-a="60">Superchat A$60</button>
<button data-l="message">Chat: !kickflip</button>
<button data-bail>Force a bail</button>
</div>
<script>{js}
const NAMES=["SewerKing","RaveRat99","CheeseThief","GutterGremlin","BassRodent"];
const fire=(listener,event)=>window.dispatchEvent(new CustomEvent("onEventReceived",{{detail:{{listener,event}}}}));
window.dispatchEvent(new CustomEvent("onWidgetLoad",{{detail:{{fieldData:{json.dumps(defaults)}}}}}));
F.chatCooldown=0;
document.querySelectorAll(".btns button").forEach(b=>b.onclick=()=>{{
  const n=NAMES[Math.floor(Math.random()*NAMES.length)];
  if("bail" in b.dataset) return fire("event:test",{{listener:"widget-button",value:"bail"}});
  if(b.dataset.l==="message") return fire("message",{{data:{{text:"!kickflip",displayName:n}}}});
  fire(b.dataset.l,{{name:n,amount:+(b.dataset.a||0),message:b.dataset.a?"send it rat":""}});
}});
</script></body></html>"""
(out / "index.html").write_text(preview)
print("built", out)
