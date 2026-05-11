# S-LMS school logo reuse prompt

Use this prompt when adding the same school-logo system to another S-edu product, such as Desk Portal or Instructor Portal.

```text
Add school logos beside every visible school name.

Use the existing S-LMS static assets under `assets/school-logos/` and keep the same filename mapping:

경기고=gyeonggi-high.svg
경원중=gyeongwon-middle.svg
계원예고=kaywon-arts-high.svg
국제초=gukje-elementary.svg
동덕여고=dongduk-girls-high.svg
동작고=dongjak-high.svg
반원초=banwon-elementary.svg
반포고=banpo-high.svg
방배중=bangbae-middle.svg
배문고=baemoon-high.svg
보성여고=boseong-girls-high.svg
상문고=sangmoon-high.svg
서문여고=seomun-girls-high.svg
서운중=seoun-middle.svg
서울고=seoul-high.svg
서일중=seoil-middle.svg
서초고=seocho-high.svg
선린고=sunrin-high.svg
선린중=sunrin-middle.svg
세화고=sehwa-high.svg
세화여고=sehwa-girls-high.svg
세화여중=sehwa-girls-middle.svg
수도여고=sudo-girls-high.svg
신반포중=shinbanpo-middle.svg
압구정고=apgujeong-high.svg
오산고=osan-high.svg
용강중=yonggang-middle.svg
원촌중=wonchon-middle.svg
원촌초=wonchon-elementary.svg
이화여고=ewha-girls-high.svg
잠원초=jamwon-elementary.svg
중경고=jungkyung-high.svg
중대부고=caau-high.svg
중대부중=caau-middle.svg
청담고=cheongdam-high.svg
현대고=hyundai-high.svg

Implementation rules:
1. Create one shared renderer, for example `renderSchoolNameWithLogo(schoolName)`.
2. The renderer should output `<img src="assets/school-logos/{filename}" alt="{schoolName} 로고">` before the school name when a mapped file exists.
3. Do not wrap the logo in a circular badge or decorative background. Show only the transparent logo image.
4. If an asset is missing or the image fails to load, fall back to a small plain text initial and keep the school name visible.
5. Do not try to place images inside native `<option>` elements. Keep select dropdown options as text, and render the logo in the selected cards, tables, chips, rows, headers, summaries, and detail panels.
6. Keep the asset path relative (`assets/school-logos/...`) so the same files work in GitHub Pages and local static hosting.
```

