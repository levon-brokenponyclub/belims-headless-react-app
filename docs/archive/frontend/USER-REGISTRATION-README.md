# User Registration & Account Management System

Complete user registration and authentication system integrated with WordPress user management.

## 🎯 Features

- **User Registration**: Create new customer accounts with email/password
- **WordPress Integration**: All users stored in WP database with `customer` role
- **Admin Testing Interface**: Easy-to-use admin panel for creating/managing test accounts
- **Email Validation**: Checks for duplicate emails before registration
- **Auto-Login**: Users are automatically logged in after successful registration
- **Profile Management**: Update user details, billing/shipping addresses

## 📡 API Endpoints

All endpoints are available at: `https://your-domain.com/wp-json/belims/v1/users/`

### 1. Register User

**POST** `/users/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+27123456789"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "username": "user",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["customer"],
    ...
  }
}
```

### 2. Login User

**POST** `/users/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### 3. Get Current User

**GET** `/users/me`

Requires: Authenticated user (cookies)

### 4. Update Profile

**PUT** `/users/me`

```json
{
  "first_name": "Jane",
  "phone": "+27987654321",
  "billing_address_1": "123 Main St",
  "billing_city": "Cape Town"
}
```

### 5. Check Email Exists

**POST** `/users/check-email`

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "exists": true,
  "email": "user@example.com"
}
```

### 6. List All Users (Admin Only)

**GET** `/users`

Requires: Administrator or Shop Manager role

---

## 💻 Frontend Integration

### Using the Auth Service

```typescript
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "./services/authService";

// Register new user
try {
  const result = await registerUser({
    email: "user@example.com",
    password: "SecurePass123!",
    first_name: "John",
    last_name: "Doe",
    phone: "+27123456789",
  });

  console.log("User registered:", result.user);
} catch (error) {
  console.error("Registration failed:", error.message);
}

// Login
try {
  const result = await loginUser({
    email: "user@example.com",
    password: "SecurePass123!",
  });

  console.log("Logged in:", result.user);
} catch (error) {
  console.error("Login failed:", error.message);
}

// Get current user
const user = await getCurrentUser();
if (user) {
  console.log("Current user:", user);
} else {
  console.log("Not authenticated");
}
```

### Checkout Integration

The checkout component now includes an account creation button:

```tsx
// Checkout.tsx
<button
  onClick={handleCreateAccount}
  className="w-full bg-[#1f2a68] text-white..."
>
  <Rocket size={16} />
  Create an account (save your details)
</button>
```

When clicked, it:

1. Validates customer details are filled
2. Prompts for password
3. Calls `registerUser()` API
4. Creates WordPress user account
5. Auto-logs them in

---

## 🧪 Testing in WordPress Admin

Navigate to: **User Testing** menu in WordPress admin

### Quick Test Registration

1. Auto-generates test email (e.g., `test1705234567@belims.co.za`)
2. Pre-fills form with test data
3. Click "Create Test User"
4. User appears in table below

### Viewing Registered Customers

- See all customer accounts
- View registration date, contact info
- Edit users directly via WordPress
- Delete test users (emails containing "test")

---

## 🔒 Security Features

- **Password Validation**: Minimum 8 characters enforced
- **Email Validation**: Checks format and uniqueness
- **Sanitization**: All inputs sanitized via WordPress functions
- **CORS Protection**: Only allowed origins can access API
- **Role Management**: New users automatically get `customer` role
- **Duplicate Prevention**: Cannot register with existing email

---

## 🚀 Usage Scenarios

### 1. Guest Checkout with Account Creation

User fills checkout form → Clicks "Create Account" → Password prompt → Account created → Order saved to their profile

### 2. Multiple Test Accounts for Admins

Admin panel lets you quickly create multiple test accounts with different emails for testing order flows, user roles, etc.

### 3. Customer Profile Management

Registered users can:

- Update personal details
- Save billing/shipping addresses
- View order history (when integrated with orders endpoint)

---

## 📝 WordPress User Management

All users are stored in WordPress `wp_users` and `wp_usermeta` tables:

- **User Role**: `customer` (WooCommerce compatible)
- **Meta Fields**:
  - `first_name`
  - `last_name`
  - `billing_phone`
  - `billing_address_1`, `billing_city`, `billing_state`, `billing_postcode`, `billing_country`

You can manage users via:

- WordPress Admin → Users
- WooCommerce → Customers
- Custom admin panel: "User Testing"

---

## 🛠 Development Notes

### Files Structure

```
wp-content/plugins/global-site-settings/
├── includes/
│   ├── class-user-endpoint.php       # REST API endpoints
│   └── class-user-admin-page.php     # Admin testing interface
└── global-site-settings.php          # Plugin initialization

frontend/
└── services/
    └── authService.ts                 # Frontend API client
```

### Adding New User Meta

To store additional user data:

```php
// In registration endpoint
update_user_meta($user_id, 'custom_field', $value);

// In format_user_data()
'custom_field' => get_user_meta($user->ID, 'custom_field', true)
```

---

## 🎉 Next Steps

1. **Login Page**: Create dedicated login UI component
2. **Account Dashboard**: User profile page to view/edit details
3. **Order History**: Link orders to user accounts
4. **Password Reset**: Email-based password recovery
5. **Social Login**: OAuth integration (Google, Facebook)

---

## 📞 Support

For issues or questions about user registration:

- Check WordPress error logs
- Test in admin panel first
- Verify CORS headers are set correctly
- Ensure cookies are being sent (`credentials: 'include'`)

---

**Last Updated**: January 26, 2026
**Plugin Version**: 2.1.1
