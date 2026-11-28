# Video spec format (`shorts/specs/<slug>.json`)

Frame is 1080×1920. Fixed layout, so keep content inside the **content zone y = 450–1420**:

- Title card: y ≈ 230 (automatic, from `title_card`)
- Captions: y ≈ 1570 (automatic, from narration)
- Bottom 300 px: YouTube's UI covers it, so nothing goes there.

```json
{
  "title_card": "Why Ice Floats",          // 2-5 words, shown upper-case
  "lang": "hi", "voice": "hm_omega", "speed": 1.15,   // Hindi narration (English: "en-us", "am_michael", 1.12)
  "lines": [ {"scene": 0, "text": "बोली जाने वाली हिंदी लाइन", "caption": "English subtitle for this line", "pause_after": 0.18}, ... ],
  "scenes": [ {"elements": [ ... ]}, ... ]
}
```

- Every scene index must have at least one line. A scene lasts from its first line until the next scene's first line.
- Use one line per sentence. Spell out numbers the way they should be spoken.
- Aim for 5–7 scenes, so there's a new visual every 6–10 s.

## Element timing (every element)
- `"at": 1.2`: seconds after the scene starts (default 0)
- `"at_line": 6`: when global narration line 6 starts (index into `lines`, 0-based)
- `"at_word": [6, 3]`: about when word 3 of line 6 is spoken
- `"until": 4.0`: hide after this many seconds into the scene
- `"anim"`: one value or a list: `pop` (default), `fade`, `float`, `shake`, `drop`, `bob`, `spin`, `pulse`, `rise`, `slide_left`, `slide_right`, `grow`, `shrink`, `none`
- `"to": [x, y], "move_dur": 1.0`: moves the element from x,y to here

## Element types
| type | fields |
|---|---|
| `emoji` | `char`, `x`, `y`, `size` (px, default 260). Any emoji, and the main illustration tool. |
| `text` | `text`, `x`, `y`, `size` (`xl` 130 / `lg` 96 / `md` 66 / `sm` 46 / `xs` 36 or px), `color`, `maxw` |
| `badge` | `text`, `x`, `y`, `color` (fill; default yellow), `outline: true` for outline style. Use it for the concept name-drop. |
| `steps` | `items` [str], `x`, `y` (centre of stack), `gap` s between items, `spacing` px, `size`. Last item is highlighted yellow. |
| `bars` | `items` [{`label`, `value`, `color`, `text`?}], `y` = baseline, `height` max px, `fmt`, `max`. Bars grow in. |
| `counter` | `from`, `to`, `dur`, `fmt` (python, e.g. `"{:,.0f}"`), `prefix`, `suffix`, `x`, `y`, `size`, `color` |
| `grid` | `char`, `n` (≤100), `cols`, `size`, `x`, `y`, `highlight` (count), `highlight_char`, `highlight_at` (s), `dim_rest`. Good for "1 in 20" statistics. |
| `arrow` | `from` [x,y], `to` [x,y], `color`, `width`. Draws itself in. |
| `cross` / `check` | `x`, `y`, `size`: a red X or green tick for myth vs. fact |
| `box` | `x`, `y`, `w`, `h`, `color`, `fill` |
| `progress` | `x`, `y`, `w`, `to` (0–1), `dur`, `color` |

Don't put emoji inside `text`, `badge` or `steps` strings, because they render as plain outlines. Use a separate `emoji` element.

Colors: `white dim yellow red blue lightblue green orange purple pink`, or `[r,g,b]`.

## Check before rendering
`./make_video.sh specs/<slug>.json --preview` writes `out/<slug>/preview.png` with one frame per scene. Look at it for overlaps, text running off the screen, and empty scenes, then render without `--preview`.

Worked examples: `specs/example-sky-blue-hindi.json` (Hindi voice, English subtitles) and `specs/example-sky-blue.json` (English).
