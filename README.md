# VidFlow

A modern, full-stack short-form video streaming and creator community platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma, and React Query.

---

## ✨ Features

### 🎬 Video Feed & Discovery
- **Immersive Feed**: Smooth vertical video feed with custom controls, play/pause toggles, and volume persistence.
- **Engaging Interactions**: Instant double-tap to like, slide-in comments panel with threaded replies, pinned creator comments, and copyable share links.
- **Search & Explore**: Discover videos by trending genres (Action, Comedy, Drama, Sci-Fi, Animation, etc.) or creator handles.

### 👥 Role-Isolated Architecture
VidFlow features strict role separation across UI, state management, API routes, and database constraints:
- **Consumer**: Personalized viewer profile, private liked videos collection, private ratings management, and creator application flow.
- **Creator**: Public creator profile with niche categorization, video catalog management, audience rating summary, and Creator Studio analytics.
- **Admin**: Platform oversight portal, user moderation, video status management, and creator application review pipeline.

### ⭐ Multi-Dimensional Creator Ratings
- **Qualified Eligibility Engine**: Prevents review bombing by requiring consumers to watch at least 3 qualifying videos ($\ge 50\%$ completion) from a creator before submitting a rating.
- **5-Dimension Evaluation**: Quality, Value, Creativity, Entertainment, and Consistency.
- **Bayesian Scoring**: Authoritative Bayesian average calculations to ensure fair ranking across creators with varying review counts.

### 🎨 Centralized Avatar & Asset Storage
- Built-in permanent asset upload pipeline with client-side file validation and optimized local/object storage.
- Reusable, responsive avatar components with fallback initial styling and error resilience.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) / [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) & [TanStack React Query v5](https://tanstack.com/query/latest)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Database & ORM**: [SQLite](https://www.sqlite.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) / JWT Session Management
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/vidflow.git
cd vidflow
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your variables:
```bash
cp .env.example .env
```

### 4. Database Setup & Seeding
Initialize the SQLite database schema and populate seed data (creators, consumers, sample videos):
```bash
npm run db:push
npm run db:seed
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start exploring.

---

## 🔑 Administrator Provisioning

To create your initial super administrator account securely without hardcoding credentials in Git, run:

```bash
npx tsx scripts/create-admin.ts <your-email> "<your-secure-password>" "[Your Name]" "[username]"
```

Example:
```bash
npx tsx scripts/create-admin.ts admin@yourdomain.com "YourStrongPassword123!" "Admin" "admin"
```

In production on Microsoft Azure, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your Azure App Service Application Settings.

---

## 📁 Project Structure

```text
├── prisma/
│   ├── schema.prisma           # Prisma database schema definition
│   └── seed.ts                 # Database seeder with sample data
├── public/                     # Static assets & public uploads
│   └── uploads/                # Permanent upload directories (avatars/videos)
├── src/
│   ├── app/
│   │   ├── api/                # Next.js App Router API endpoints
│   │   │   ├── admin/          # Admin management & creator application reviews
│   │   │   ├── auth/           # Authentication routes (login, logout, session)
│   │   │   ├── creator/        # Creator Studio & application submission
│   │   │   ├── creators/       # Public creator profiles, ratings & follow APIs
│   │   │   ├── users/          # User profile, avatar uploads & private collections
│   │   │   └── videos/         # Video feed, search, likes, comments & watch events
│   │   ├── layout.tsx          # Root application layout
│   │   └── page.tsx            # Main view router & client providers
│   ├── components/
│   │   ├── common/             # Reusable UI components (UserAvatar, VideoCard, etc.)
│   │   ├── feed/               # Video feed player & slide-in comment panel
│   │   ├── layout/             # Desktop sidebar & mobile bottom navigation
│   │   ├── modals/             # Follow list and interactive modal dialogs
│   │   └── views/              # Page views (Feed, Discover, Creator Studio, Admin)
│   │       └── profile/        # Role-isolated profile views (Consumer, Creator, Admin)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Shared utilities, Prisma client & API SDK
│   ├── store/                  # Zustand global application store
│   └── types/                  # TypeScript interfaces and domain types
├── package.json
└── README.md
```

---

## 📜 Available Scripts

- `npm run dev` — Starts the development server.
- `npm run build` — Builds the application for production.
- `npm run start` — Starts the production Next.js server.
- `npm run lint` — Runs ESLint code quality checks.
- `npm run db:push` — Syncs the Prisma schema with the database.
- `npm run db:seed` — Runs the database seed script.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
