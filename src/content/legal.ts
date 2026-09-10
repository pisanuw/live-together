// Versioned legal copy, kept in-repo and rendered via the info Markdown subset
// (@/components/info/markdown). Managers/counsel should review before launch;
// this is starter copy, not legal advice.

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  body: string;
}

const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  updated: "2026-09-09",
  body: `West Complex Village ("WCV", "we") provides this community app for
residents of the building. This policy explains what we collect and why.

## What we collect
- **Account details** you provide: name, email, and any preferred name or avatar.
- **Content you create**: forum posts, comments, reactions, event sign-ups,
  maintenance requests, and their attachments.
- **Settings**: theme, accent, and notification preferences.

## How we use it
- To run the community features you use — showing your posts to neighbors,
  registering you for events, and routing maintenance requests to management.
- To send notifications you have not turned off in Settings.

## Who can see it
- Other **approved residents** of your building can see forum content and your
  display name. Managers can see maintenance requests and event attendees.
- Access is enforced per building; residents of other buildings cannot see your
  data. We do not sell your data.

## Retention & control
- You can edit or delete your own posts and comments, and cancel sign-ups.
- You can export your data from **Settings → Account**.
- To close your account or ask a data question, contact building management.

## Security
- Data is stored in a managed Postgres database with row-level security. Access
  from the app requires signing in.

Questions? Reach out to your building's management team.`,
};

const TERMS: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  updated: "2026-09-09",
  body: `By using the West Complex Village community app you agree to these terms.

## Who can use WCV
- Access is limited to residents who have been **invited or approved** by
  building management. Accounts are personal; do not share your login.

## Community conduct
- Be respectful. Do not post content that is harassing, hateful, illegal, or
  that infringes others' rights.
- Do not use the forum for spam or commercial solicitation outside the
  designated categories.
- Managers may remove content or suspend accounts that violate these terms.

## Your content
- You keep ownership of what you post, and grant WCV permission to display it to
  other approved residents of your building for the app to function.
- You are responsible for the accuracy of maintenance requests and event details
  you submit.

## Events & maintenance
- Event capacity and waitlists are managed automatically; a spot is not
  guaranteed until you are shown as registered.
- Maintenance requests are a way to reach management, not an emergency service.
  **For emergencies, call the appropriate emergency number.**

## Changes
- We may update these terms; continued use after an update means you accept it.

Questions? Contact your building's management team.`,
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: PRIVACY,
  terms: TERMS,
};

export function getLegalDoc(slug: string): LegalDoc | null {
  return LEGAL_DOCS[slug] ?? null;
}
