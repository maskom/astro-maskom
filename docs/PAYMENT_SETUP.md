# Payment Gateway Environment Variables

To enable the payment gateway functionality, you need to configure the following environment variables in your deployment environment:

## Midtrans Configuration

```bash
# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_ENVIRONMENT=sandbox  # or 'production' for live
MIDTRANS_MERCHANT_ID=your_merchant_id
```

### Getting Midtrans Credentials

1. **Sign up for a Midtrans account** at [https://midtrans.com](https://midtrans.com)
2. **Create a new application** in your Midtrans dashboard
3. **Get your API keys** from the Settings > API Keys section
4. **Configure webhook URL** to: `https://yourdomain.com/api/payments/webhook`

### Environment Details

- **Sandbox Mode**: Use `sandbox` for testing and development
- **Production Mode**: Use `production` for live transactions
- **Server Key**: Used for server-side API calls (keep secret)
- **Client Key**: Used in frontend for Snap integration (public)

## Security Notes

- Never commit your server key to version control
- Use environment variables or secret management services
- Ensure webhook endpoint is publicly accessible
- Enable HTTPS in production
- Regularly rotate your API keys

## Testing

Midtrans provides test credentials for sandbox mode:

- Test card numbers: `4811111111111114` (Visa), `5211111111111117` (Mastercard)
- Use any future expiry date and 3-digit CVV
- Test bank transfer and e-wallet options through Midtrans sandbox

## Webhook Configuration

Configure your Midtrans webhook settings to point to:

```
https://yourdomain.com/api/payments/webhook
```

The webhook handles:

- Payment status updates
- Transaction confirmations
- Fraud detection notifications
- Refund processing
