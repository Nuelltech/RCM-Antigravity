# Restaurante Cost Manager (RCM) - SaaS Multi-Tenant

## Setup

1.  **Prerequisites**: Node.js 20+, Docker.
2.  **Environment**: Copy `.env.example` to `.env` in backend and frontend (adapt as needed).
3.  **Database**:
    ```bash
    docker-compose up -d
    cd backend
    npx prisma migrate dev --name init
    ```
4.  **Backend**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
5.  **Frontend**:
    ```bash
    cd app/frontend
    npm install
    npm run dev
    ```

## Architecture

-   **Frontend**: Next.js 14, Tailwind, Shadcn/ui
-   **Backend**: Fastify, Prisma, MySQL
-   **Multi-tenancy**: Shared Schema (`tenant_id` column)
