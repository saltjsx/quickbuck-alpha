# Mod Panel

A password-protected moderation panel for managing users, companies, and products.

## Setup

### Environment Variable

Add a strong passkey to your environment variables:

```bash
MOD_PASSKEY=your_secure_passkey_here
```

For Vercel deployment, add this in your project settings under Environment Variables.

## Features

- Search users by username or email
- Issue warnings to users
- Ban users from the platform
- View user warnings history
- Delete products (deactivates them)
- Delete companies (deactivates products and removes stocks)

## Access

Navigate to `/mod-panel` and enter the mod passkey to authenticate.

## UI Layout

The mod panel uses a three-column layout:

1. **Left Column**: User search
2. **Middle Column**: User actions (warn/ban) and warning history
3. **Right Column**: Companies and products management

## Functions

### Queries

- `searchUser` - Search users by username or email
- `getUserWarningsForMod` - Get all warnings for a user
- `getUserCompanies` - Get all companies owned by a user
- `getCompanyProducts` - Get all products in a company

### Mutations

- `modWarnUser` - Issue a warning to a user
- `modBanUser` - Ban a user (prevents sign-in)
- `modDeleteProduct` - Deactivate a product
- `modDeleteCompany` - Delete a company (deactivates products and removes stocks)

## Security

- All functions require the `MOD_PASSKEY` environment variable
- Passkey is verified on every operation
- No authentication bypass possible
