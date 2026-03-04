# CRM Admin Panel

CRM Admin Panel (Super Admin Panel) is a comprehensive administration dashboard for a multi-tenant CRM platform. It provides a central interface for managing tenants (companies), subscriptions, billing, payment gateways, reports, communication (email and notifications), and system settings. The application features a modern UI with RTL support, dark mode, and Arabic/English localization.

## Key Features

*   **Dashboard**: Real-time overview of key metrics including MRR (Monthly Recurring Revenue), active companies, new and expiring subscriptions, revenue fees, plan distribution, and latest tenants and payments. Interactive charts powered by Recharts.
*   **Tenant Management**: List, filter, add, and edit tenants (companies). Activate or deactivate tenants. Impersonate a tenant owner to sign into the CRM application on their behalf.
*   **Subscriptions & Billing**: Manage subscriptions, plans, invoices, and payments in one place.
*   **Payment Gateways**: Add and configure payment gateways, enable or disable them, and test connectivity.
*   **Reports**: View and filter reports by date range and other criteria.
*   **Communication**: Broadcast emails and notifications; send immediately or schedule for later.
*   **System Settings**: Database backup, audit logs, USD/IQD exchange rate, limited-admin management, and password change.
*   **Role-Based Access**: Super Admin has full access; Limited Admins have granular permissions per section (dashboard, tenants, subscriptions, payment gateways, reports, communication, settings).
*   **User Experience**: Arabic/English support (i18n), dark mode, and RTL layout.

## Technology Stack & Architecture

The project is built with a modern React-based stack and communicates with a Django REST backend.

*   **Framework**: React 19 with TypeScript.
*   **Routing**: React Router v7 for client-side navigation and protected routes.
*   **Build**: Vite 6 for fast development and optimized production builds.
*   **UI**: Tailwind CSS (via CDN) and custom components for a consistent, responsive interface.
*   **Charts**: Recharts for data visualization on the dashboard and reports.
*   **State**: React Context for user session (UserContext), theme (ThemeContext), alerts (AlertContext), audit log (AuditLogContext), and internationalization (i18n).
*   **API**: Centralized REST client in `services/api.ts` for the Django backend. JWT authentication with access and refresh tokens; automatic token refresh on 401.

## Project Structure

The codebase lives at the project root (no `src/` folder). Layout is organized by feature and concern:

```
CRM-admin-panel/
├── pages/          # Screen components (Dashboard, Tenants, Subscriptions, Reports, Communication, SystemSettings, PaymentGateways, LoginPage)
├── components/     # Reusable UI (Sidebar, Header, Modals, ProtectedRoute, PermissionGuard, form and layout components)
├── context/        # React context (User, Theme, Alert, AuditLog, i18n)
├── services/       # API layer (api.ts)
├── utils/          # Helpers (API error translation, colors)
├── hooks/          # Custom hooks (e.g. useDarkMode)
├── docs/           # Documentation (e.g. DEPLOYMENT.md for VPS deployment)
├── types.ts        # TypeScript types
├── App.tsx         # App shell, routing, and permission guards
└── index.tsx       # Entry point
```

For production deployment and server setup, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Note: that guide may reference a `src/` folder; the current structure uses the root for source files.

## Setup and Installation

To run the project locally:

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd CRM-admin-panel
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Create `.env` file:**
    Create a file named `.env` in the project root with at least the API base URL. Optional variables are listed below.
    ```env
    VITE_API_URL=https://api.loop-crm.app/api
    VITE_API_KEY=your-api-key-here
    VITE_CRM_APP_URL=https://app.loop-crm.app
    GEMINI_API_KEY=your-gemini-api-key-here
    ```
    *   `VITE_API_URL` (required): Backend API base URL.
    *   `VITE_API_KEY` (optional): Sent in the `X-API-Key` header when set.
    *   `VITE_CRM_APP_URL` (optional): Used for impersonation redirect to the CRM app.
    *   `GEMINI_API_KEY` (optional): Used if any features rely on Gemini.

4.  **Run the application:**
    ```sh
    npm run dev
    ```
    The app will be available at `http://localhost:3001` (port is set in `vite.config.ts`).

5.  **Backend**: Ensure the Django API is running and CORS is configured to allow the admin panel origin.

For production deployment (e.g. on a VPS with Nginx and SSL), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
