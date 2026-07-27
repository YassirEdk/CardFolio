# CardFolio

A digital business card platform for freelancers and professionals. Each user gets a
personal link (`card-folio-hazel.vercel.app/yourname`) and a downloadable QR code that opens their card.

Built with React 18, React Router 6, Tailwind CSS v4, Lucide icons, `qrcode` and Recharts.
All data is mocked — no backend required to preview any screen.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview
```

## Routes

| Route          | What it is                                                          |
| -------------- | ------------------------------------------------------------------- |
| `/`            | Landing page — hero, features, how it works, templates, pricing, FAQ |
| `/signup`      | Sign up with live username-availability check                        |
| `/login`       | Log in (any valid email + password works)                            |
| `/onboarding`  | 5-step wizard with a live preview panel                              |
| `/dashboard`   | Overview, Edit, Templates, QR Code, Analytics, Settings              |
| `/:username`   | The public card — try `/demo`, `/sarahkim`, `/marcusdev`             |
| `/404`         | Not-found page                                                       |

`/:username` is matched last and filtered through a reserved-word list in
[src/App.jsx](src/App.jsx), so app routes can never be shadowed by a card.

## Structure

```
src/
├─ templates/          one component per card design, all sharing the same props
│  ├─ Minimal.jsx  Executive.jsx  Split.jsx  DarkPro.jsx  PhotoFocus.jsx
│  ├─ shared.jsx       helpers every template reuses (contact list, avatar, actions)
│  └─ index.jsx        the template registry + <CardRenderer>
├─ components/         UI primitives, layouts, toast, phone frame, QR, card form sections
├─ pages/              one file per route
├─ data/               mock cards, analytics series, platform registry
└─ lib/                QR generation and vCard (.vcf) export
```

### Adding a template

Create `src/templates/YourTemplate.jsx` taking
`{ card, publicUrl, onSaveContact, onShare }`, then add it to the `TEMPLATES`
array in `src/templates/index.jsx`. It immediately appears in the onboarding
picker, the dashboard and the landing-page showcase.

## Notes

- The QR code is generated client-side from the card URL; PNG (1024px) and vector SVG export.
- "Save contact" builds a vCard 3.0 file in the browser — no server round-trip.
- Deploying: this is a SPA, so rewrite all unmatched paths to `index.html`
  (Netlify `_redirects`, Vercel `rewrites`, or `try_files` on nginx) or `/demo`
  will 404 on a hard refresh.
