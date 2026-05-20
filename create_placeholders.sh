#!/bin/bash

# Latest Coming Soon
cat <<EOF > latest-coming-soon/doob.md
---
title: "Doob"
tag: "Latest Coming Soon"
director: "Toufiqul Islam"
cast: ["Musfiq R. Farhan", "Keya Payel"]
poster_url: "./assets/doob-poster.jpg"
description: "Experience the serene love story 'Doob' starring Musfiq R. Farhan and Keya Payel. Coming this Eid on CMV YouTube."
release_date: "Eid 2026"
---
EOF

# Recent Releases
cat <<EOF > recent-releases/tor-name-hridoye.md
---
title: "Tor name Hridoye"
id: "ofXi8zgQlus"
tag: "New"
cast: ["Musfiq R Farhan", "Safa Kabir"]
---
EOF

# The Media Hub
cat <<EOF > the-media-hub/vp.md
---
title: "VP"
id: "g9GRWSbIFck"
tag: "Featured"
cast: ["Musfiq R Farhan"]
---
EOF

# Premiering 2026
cat <<EOF > premiering-2026/upcoming-project-1.md
---
title: "Upcoming Project 2026"
status: "In Production"
expected_release: "Late 2026"
---
EOF

# Exclusive BTS Stills
cat <<EOF > exclusive-bts-stills/bts-session-1.md
---
title: "Behind The Scenes - Session 1"
images:
  - url: "https://i.postimg.cc/XZh004Yd/image.jpg"
    alt: "BTS 1"
---
EOF

# Newsroom
cat <<EOF > newsroom/award-nomination.md
---
title: "5th BIFA Best Actor Nomination"
date: "2026-05-20"
summary: "Musfiq R. Farhan has been nominated for the 5th BIFA Best Actor (Drama) Award."
---
EOF
