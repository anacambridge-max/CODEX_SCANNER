# Upstox Analytics Token setup

This app is configured to use the Upstox Analytics Access Token server-side instead of the OAuth redirect/login flow.

Set this deployment environment variable:

`UPSTOX_ANALYTICS_TOKEN=<your Upstox Analytics Access Token>`

Never commit the token to this repository and never expose it from a client component. The Analytics Token is read-only; it cannot place, modify, or cancel trading orders.
