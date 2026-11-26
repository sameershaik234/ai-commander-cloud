# Scheduled Shorts run: make and publish ONE video

Each run makes one video. The scheduled task fires every 8 hours, which gives 3 videos a day. vidIQ's free plan allows exactly 3 YouTube uploads a day; the count resets at midnight Pacific time.

The owner has approved this pipeline publishing **public** videos to the YouTube channel
**ClutchVerseGaming1** (platformAccountId `UCmJAGzzDKpxoX1Y_fVhzCag`) through the vidIQ connector without asking each time.
Never publish anywhere else, and never publish more than one video per run.

## 1. Setup
```bash
cd shorts && ./setup.sh
```

## 2. Pick the topic
- Slot index: `k = floor((now_utc - 2026-11-26T18:30:00Z) / 8h)`. Topic = row `index == k % 90` of `topics.csv`.
- Duplicate check: call `vidiq_channel_videos` (or `vidiq_user_videos`) for the channel and look at the recent titles.
  If this topic is already covered, use the next row that isn't. If every row is covered, choose a new
  science/psychology/math "why/how" topic that isn't on the channel.
- If `vidiq_social_post_list` shows a YouTube post from the last 6 hours, a run already happened for this slot. **Stop without publishing.**

## 3. Script
Follow `skills/scriptwriter.md` exactly (also available as the skill `youtube-shorts-automation-main:things-explained-scriptwriter`):
130–150 words, Scenario → Name-drop → Mechanism → Loop. The last line flows back into the first.
**Fact-check every claim and number.** If you aren't sure a number is right, cut it.
Keep it family-friendly: no medical advice, politics or disasters involving real victims.

## 4. Spec and render
- Write `specs/<slug>.json` following `SPEC.md` (see `specs/example-sky-blue.json`). Every scene needs a clear emoji or diagram that matches what's being said.
- `./make_video.sh specs/<slug>.json --preview`, then **look at** `out/<slug>/preview.png`. Fix overlaps, text off the screen or empty scenes, then repeat.
- `./make_video.sh specs/<slug>.json`. Check that the video is 40–58 s long: `ffprobe -v error -show_entries format=duration -of csv=p=0 out/<slug>/video.mp4`.
  If it's longer than 58 s, shorten the script. Over 60 s it isn't a Short.

## 5. Metadata
Follow `skills/metadata.md`. Use the Option A (curiosity) title, under 55 characters. The description is the summary, a question for comments, a blank line, then 4–5 hashtags starting with `#shorts`. Write one pinned-comment line.

## 6. Publish (vidIQ)
1. `vidiq_video_upload` with `localFile` {path, sizeBytes (`wc -c`), contentType `video/mp4`}. Run the returned shell command exactly, then call `vidiq_video_upload` with `uploadId` until the status is `ready`.
2. `vidiq_social_post_draft_create`: one YOUTUBE destination, `platformAccountId` `UCmJAGzzDKpxoX1Y_fVhzCag`, `title`, `privacyStatus` `"public"`, `categoryId` 27, tags (5–8), `text` = description, media = the video uploadId.
3. If `ready` is true, call `vidiq_social_post_publish` with the postId and revision. This is pre-approved by the owner for this pipeline.
4. Check `vidiq_social_post_status` until it's finished (wait about 30–60 s between checks). Record the `postUrl`.
If the daily upload limit is hit, or anything else fails, **don't retry in a loop**. Report it and stop.

## 7. Report
End with a short summary: the topic, the title, the YouTube URL (or why it failed) and the pinned-comment text for the owner to post.
Don't commit or push anything. The channel itself is the record of what was posted.
