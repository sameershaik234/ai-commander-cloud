# Scheduled Shorts run: make and publish ONE video

Each run makes one video. The scheduled task fires every 8 hours, which gives 3 videos a day. vidIQ's free plan allows exactly 3 YouTube uploads a day; the count resets at midnight Pacific time.

The owner has approved this pipeline publishing **public** videos to the YouTube channel
**ClutchVerseGaming1** (platformAccountId `UCmJAGzzDKpxoX1Y_fVhzCag`) through the vidIQ connector without asking each time.
Never publish anywhere else, and never publish more than one video per run.

## 1. Setup
```bash
cd shorts && ./setup.sh
```

## 2. Pick a TRENDING topic
The goal is a topic people are searching for right now, explained in the channel's explainer style.
1. Check if a run already happened for this slot: if `vidiq_social_post_list` shows a YouTube post from the last 6 hours, **stop without publishing.**
2. Gather trends (all free vidIQ calls): `vidiq_trending_videos` (India / Hindi and global, the science, education and tech categories), `vidiq_outliers`,
   `vidiq_youtube_video_idea`, and `vidiq_keyword_research` to confirm search demand for your candidate.
3. Choose ONE topic that is (a) trending or high-demand right now, (b) explainable as a "why/how" science, tech, psychology,
   space, money or body explainer in under 60 s, (c) family-friendly and **not** breaking news, politics, religion, tragedy, medical advice,
   or someone else's copyrighted show, game or character.
   Good example: a viral space event becomes "why does that happen".
4. Duplicate check: `vidiq_channel_videos` or `vidiq_user_videos` for the channel. Don't repeat a topic already on it.
5. If nothing trending fits, fall back to `topics.csv`: row `k % 90` where `k = floor((now_utc - 2026-11-26T18:30:00Z) / 8h)`,
   skipping topics already on the channel.

## 3. Script: Hindi voice, English subtitles
Follow the structure in `skills/scriptwriter.md` (Scenario → Name-drop → Mechanism → Loop; the last line flows back into the first), but:
- Each line has `text` = **spoken Hindi** in Devanagari: natural, everyday conversational Hindi, the way a friendly Indian
  science YouTuber talks. Common English science words are fine in Devanagari (साइंटिस्ट, स्कैटरिंग).
  Write numbers as Hindi words. Avoid heavy Sanskritised Hindi.
- Each line has `caption` = a natural **English** translation of that line. These become the on-screen subtitles.
- Length: **110–125 Hindi words** in total, because Hindi takes longer to say. Spec settings: `"lang": "hi", "voice": "hm_omega", "speed": 1.15`.
- **Fact-check every claim and number.** If you aren't sure a number is right, cut it.

## 4. Spec and render
- Write `specs/<slug>.json` following `SPEC.md` (see `specs/example-sky-blue-hindi.json`). Every scene needs a clear emoji or diagram that matches what's being said.
  On-screen labels, badges and the title card are in **English**.
- `./make_video.sh specs/<slug>.json --preview`, then **look at** `out/<slug>/preview.png`. Fix overlaps, text off the screen or empty scenes, then repeat.
- `./make_video.sh specs/<slug>.json`. Check that the video is 40–58 s long: `ffprobe -v error -show_entries format=duration -of csv=p=0 out/<slug>/video.mp4`.
  If it's longer than 58 s, cut Hindi words and re-render. Over 60 s it isn't a Short.

## 5. Metadata
Follow `skills/metadata.md`, in **English**. Add "(Hindi)" or "| हिंदी" at the end only if it fits in 55 characters. Use the Option A (curiosity) title, built around the trending keyword. Include `#hindi` among the hashtags. The description is the summary, a question for comments, a blank line, then 4–5 hashtags starting with `#shorts`. Write one pinned-comment line.

## 6. Publish (vidIQ)
1. `vidiq_video_upload` with `localFile` {path, sizeBytes (`wc -c`), contentType `video/mp4`}. Run the returned shell command exactly, then call `vidiq_video_upload` with `uploadId` until the status is `ready`.
2. `vidiq_social_post_draft_create`: one YOUTUBE destination, `platformAccountId` `UCmJAGzzDKpxoX1Y_fVhzCag`, `title`, `privacyStatus` `"public"`, `categoryId` 27, tags (5–8), `text` = description, media = the video uploadId.
3. If `ready` is true, call `vidiq_social_post_publish` with the postId and revision. This is pre-approved by the owner for this pipeline.
4. Check `vidiq_social_post_status` until it's finished (wait about 30–60 s between checks). Record the `postUrl`.
If the daily upload limit is hit, or anything else fails, **don't retry in a loop**. Report it and stop.

## 7. Report
End with a short summary: the topic, the title, the YouTube URL (or why it failed) and the pinned-comment text for the owner to post.
Don't commit or push anything. The channel itself is the record of what was posted.
