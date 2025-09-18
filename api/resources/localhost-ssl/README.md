# SSL key and certificate (development only)

This folder contains a private RSA key and a self-signed certificate. These resources are used for exposing
the application via HTTPS in development environment. They must not be used in other environments,
as their purpose is to provide consistency, not security.

Note: the `localhost.key` and `localhost.crt` files are **not stored in git**.  
Each developer must generate or obtain these files locally in order to run the application with HTTPS.
