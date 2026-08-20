# Screenshots

Images referenced by the main [README](../../README.md).

## Slides

Five slides, rendered from `slides/slides.html` — a local file, gitignored, because the screenshots
are what ship. Open it in a browser, screenshot each slide, and save it here under the name below.
Every slide is laid out at exactly **1280 × 720**, so crop to the rounded slide edge and they will
all match; the label printed above each slide is page furniture and does not belong in the shot.
Printing the page to PDF (Ctrl+P, background graphics on) gives the same five frames as pages.

| File | Slide | Where it appears in the README |
|---|---|---|
| `slide1.png` | Title | At the top, under the opening paragraphs |
| `slide2.png` | System architecture | *How it works*, above the detailed pipeline |
| `slide3.png` | The problem | End of *The problem* |
| `slide4.png` | The decision and the confidence rules | *How it works*, after the confidence thresholds |
| `slide5.png` | Built for the learner | Top of *Accessibility* |

They are deliberately **not** in one block: each sits in the section it argues for, so the README
reads as prose with illustrations rather than as a deck bolted onto a document.

## Application screenshots

Each one is currently a placeholder: the `<img>` tag is commented out beside a line of italic text
saying what belongs there. Add the file, then uncomment the tag and delete the placeholder line.

| File | What to capture |
|---|---|
| `landing.png` | The landing screen — the URL form, and the ready-to-play list if this server has processed anything. |
| `player.png` | A video playing, showing the transport controls and the prepared description list below them. |
| `bangla.png` | The same app with the language switched to বাংলা, showing Bengali descriptions. |

A few things worth getting right, since these are the first thing anyone sees:

- Capture at a window width of about 1440px. Narrower and the layout collapses to one column, which
  reads as a phone screenshot rather than the tool it is.
- Use a video whose descriptions are actually interesting — code, a diagram, an equation. A video
  Shruti stayed silent on demonstrates the restraint but not the capability.
- Include the "speaking now" banner in at least one shot. It is the clearest single image of what
  the project does.
- Crop to the browser viewport, without the OS chrome or the tab bar.
