# GitHub Organization Manager

A modern single-page application built with Next.js for managing GitHub repositories, environments, and secrets across your organization.

## Features

- 🔐 **Secure Token Management** - Store GitHub tokens securely in memory
- 🏢 **Organization Management** - Browse and select from your GitHub organizations
- 📦 **Repository Overview** - View all repositories with environment status
- 🌍 **Environment Management** - Create and manage deployment environments
- 🔑 **Secrets & Variables** - Manage environment secrets and variables
- 🚀 **Bulk Operations** - Apply changes across multiple repositories and environments
- 🌙 **Dark Mode** - Beautiful dark theme interface
- 🏢 **Enterprise Support** - Works with GitHub Enterprise installations

## Getting Started

### Prerequisites

- Node.js 18+ 
- A GitHub personal access token with appropriate permissions:
  - `repo` - Full control of private repositories
  - `admin:org` - Full control of orgs and teams
  - `admin:repo_hook` - Full control of repository hooks

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd github-org-manager
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. (Optional) Configure GitHub Enterprise:
\`\`\`bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GITHUB_ENTERPRISE_URL if using GitHub Enterprise
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open your browser and navigate to `http://localhost:3000`

### Building for Production

\`\`\`bash
npm run build
npm run start
\`\`\`

## Usage

1. **Enter GitHub Token**: Start by entering your GitHub personal access token
2. **Select Organization**: Choose from your available organizations
3. **Manage Repositories**: View repository environments and manage secrets/variables
4. **Bulk Operations**: Use bulk operations to apply changes across multiple repositories

## Environment Variables

- `NEXT_PUBLIC_GITHUB_ENTERPRISE_URL` - (Optional) Your GitHub Enterprise URL if using GitHub Enterprise

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Modern React with hooks
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS v4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications

## Security

- Tokens are stored only in memory and never persisted
- All API calls are made directly to GitHub's API
- No data is sent to external services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
