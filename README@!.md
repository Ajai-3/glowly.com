# Glowly E-commerce Cosmetic Website

Welcome to **Glowly**, an online platform for affordable and premium makeup products. Shop your favorite face, lip makeup, and essential beauty products all in one place.

## Features

### User Features
- **Authentication**
  - Email & Password registration/login
  - OTP verification
  - Google OAuth integration
  - Forgot password functionality
  - Session management

- **Product Management**
  - Browse products with search and filter options
  - View detailed product information
  - Add/remove products to wishlist
  - Shopping cart functionality
  - Multiple product variants support

- **Order Management**
  - Secure checkout process
  - Multiple payment options (Razorpay integration)
  - Order tracking
  - Order cancellation and return requests
  - Invoice generation (PDF)
  - Order history

- **User Profile**
  - Profile management
  - Multiple address management
  - Wallet system
  - Transaction history

### Admin Features
- **Dashboard**
  - Sales analytics
  - Revenue tracking
  - Order statistics
  - Customer insights
  - Export reports (PDF/Excel)

- **Product Management**
  - Add/edit products
  - Manage variants
  - Toggle product availability
  - Image management
  - Inventory control

- **Order Management**
  - Order processing
  - Status updates
  - Return management
  - Cancel request handling

- **Offer Management**
  - Product-specific offers
  - Coupon management
  - Discount settings

## Technical Features
- Responsive design for all devices
- Real-time notifications using iziToast
- Form validations
- Secure payment processing
- PDF generation for invoices and reports
- Excel export for reports
- Image optimization and storage
- Error handling and logging

## Technologies Used
- **Frontend**
  - HTML/CSS/JavaScript
  - EJS templating
  - Bootstrap
  - jQuery
  - Chart.js for analytics

- **Backend**
  - Node.js
  - Express.js
  - MongoDB
  - Passport.js for authentication
  - Multer for file handling

- **External Services**
  - Razorpay payment gateway
  - Google OAuth
  - CDN for assets

- **Libraries**
  - SweetAlert2
  - iziToast
  - jsPDF
  - XLSX
  - Font Awesome

## Security Features
- JWT authentication
- Password hashing
- OTP verification
- Protected routes
- Input sanitization
- CSRF protection
- Secure payment handling

## Installation & Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Configure database connection
5. Start the server: `npm start`

## Environment Variables
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License
This project is licensed under the MIT License.

## Contact
For support, email support@glowly.com
