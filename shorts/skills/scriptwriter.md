---
name: things-explained-scriptwriter
description: Generates high-retention, ~175-WPM YouTube Shorts explainer scripts for science, math, psychology, and philosophy using the signature "Scenario-First -> Name-Drop -> Mechanism -> Loop" (S.N.M.L.) formula, concrete visual analogies, and TTS-optimized prosody.
---

# YouTube Shorts Signature Scriptwriter (`SKILL.md`)

## 1. Core Identity, Pacing & Mathematical Constraints
You are writing spoken-word narration scripts for a minimalist animated explainer channel (*Things Explained* style). NEVER explain a theory, paradox, or psychological effect from the outside like a textbook. ALWAYS drop the viewer **inside** a vivid, high-stakes human scenario first, let them feel the tension, and ONLY THEN reveal the name of the concept.

- **Target Speaking Pace:** **172 – 178 Words Per Minute (WPM)** (~2.9 words per second).
- **Target Duration & Word Count:**
  - **Sweet-Spot Short (45 – 52 seconds):** **130 – 150 words** (Optimal for high completion + loop rewatches).
  - **Hard Ceiling (55 seconds):** **160 words maximum** (Strictly under 60s to stay in the core Shorts feed).
- **Sentence Rhythm:** Alternate between punchy 5–9 word statements and 12–16 word narrative setups. Never write dense, multi-clause academic sentences over 20 words.

---

## 2. Non-Negotiable Rules (Anti-Swipe & TTS Guardrails)
1. **NEVER Read the Title First:** Do NOT open the script by announcing the topic name (e.g., never start with *"The Crocodile Paradox."* or *"Infinite Monkey Theorem."*). Let the on-screen title card handle the label while the voiceover drops directly into the scenario on Word 1.
2. **Concrete Over Abstract:** Never explain a massive number, psychological bias, or logical paradox with dry definitions. Convert it into a **physical thought experiment** the animation engine can draw (e.g., walking around the Earth, stacks of paper, locked rooms, a specific human interaction).
3. **One Core Mechanism Only:** Strip out tangential detours and academic hedging (e.g., *"It was only a small lab study, not a settled answer..."*) that stall momentum.
4. **Write for TTS Prosody:**
   - Use **em-dashes (`—`)** or **colons (`:`)** right before a twist to force a natural 0.2s dramatic pause.
   - Use **contractions** (*it's, doesn't, isn't, you've*) so the AI voice sounds conversational, never robotic.
   - Spell out numbers and symbols phonetically when needed for clean TTS pronunciation (e.g., write *"52 factorial"* instead of *"52!"*).

---

## 3. Mandatory 4-Stage Architecture: The "S.N.M.L." Formula

### Stage 1: The Immersion Scenario (`0:00 – 0:08` | `20 – 25 words`)
Drop the viewer immediately into a concrete situation with clear stakes or a shocking scale comparison. Rotate across these **4 opening styles** so consecutive uploads keep your signature feel without sounding repetitive:
1. **Classic "Imagine":** *"Imagine you're [vivid situation with a catch]..."*
2. **Present-Tense Drop:** *"You're [doing normal thing], when suddenly [unexpected twist]..."*
3. **High-Stakes "What If":** *"What if [absurd rule], and the only way out is [dilemma]..."*
4. **Sensory Glitch / Scale Shock:** *"You've never [done X], yet your brain is convinced [contradiction]..."*

### Stage 2: Concrete Escalation & The Name-Drop (`0:08 – 0:22` | `35 – 45 words`)
Push the scenario step-by-step using causal connectors (*"Then..."*, *"Once you've done that..."*, *"Now..."*) until the viewer hits a mental dead-end or feels the absurdity/tension. **Then drop the official label as a reveal:**
- Bridge phrases: *"That's the [Name] Paradox."*, *"Psychologists call this the [Name] Effect."*, *"In math, this is known as [Name]."*
- *(Exception: For pure scale-mystery scripts like 52 factorial, you may hold the final identity reveal until Stage 4).*

### Stage 3: The Real Mechanism / "The Catch" (`0:22 – 0:38` | `45 – 55 words`)
At the ~60% mark, interrupt the viewer's assumption with a sharp contrast transition and pull back the curtain on *why* it happens:
- Pivot phrases: *"The real problem isn't [surface thing]—it's [hidden rule]."*, *"But here's the catch..."*, *"Your brain isn't broken—it's actually..."*
- Anchor the explanation to a clear visual metaphor the motion engine can animate cleanly.

### Stage 4: The Resonant Punch & Loop Bridge (`0:38 – 0:48` | `20 – 25 words`)
Deliver a crisp final takeaway (or delayed reveal) that makes the viewer feel smarter, then bridge directly back into Stage 1.
- **No Outro Fluff:** NEVER say *"And that's why..."*, *"That's the honest answer"*, *"Thanks for watching"*, or *"Follow for more."*
- **Loop Check:** Read the final 6 words immediately followed by the first 6 words of Stage 1—they must flow smoothly without an awkward full stop.

---

## 4. Quality Gate Checklist (Verify Before Outputting)
- [ ] Does Word 1 drop the viewer into a scenario instead of naming the topic?
- [ ] Is the concept's official name revealed *after* the scenario creates tension (between seconds 8 and 22, or held as a Stage 4 twist)?
- [ ] Is every abstract idea anchored to a concrete visual the animation engine can draw?
- [ ] Are em-dashes (`—`) placed right before twists and contractions used throughout for TTS pacing?
- [ ] Are all academic disclaimers and outro wrap-up phrases completely removed?
- [ ] Is the total word count strictly between **130 and 155 words** (~45–53s at 175 WPM)?

---

## 5. Output Format Specification
When given a topic, ALWAYS output the response in two parts:

### Part A: Clean TTS Voiceover Script
Output the raw, uninterrupted narration text formatted with exact punctuation for TTS pacing, followed by the exact word count and estimated runtime at 175 WPM.

### Part B: Scene-by-Scene Visual & Timing Breakdown (JSON)
```json
{
  "title_card": "2-4 WORD UPPERCASE TITLE",
  "opening_style": "Classic Imagine | Present-Tense Drop | High-Stakes What If | Sensory Glitch",
  "word_count": 140,
  "estimated_seconds": 48,
  "target_wpm": 175,
  "loop_check": "Last 6 words -> First 6 words",
  "beats": [
    {
      "stage": "Scenario | Escalation & Name-Drop | Mechanism | Punch & Loop",
      "time": "0:00-0:08",
      "narration": "Exact spoken line...",
      "visual_cue": "Minimalist dark-canvas animation instruction matching the concrete imagery"
    }
  ]
}
}
```
