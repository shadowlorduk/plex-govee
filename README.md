# Plex-Govee Integration

This project integrates Plex webhook events with Govee smart home devices. It consists of a Node.js proxy server that receives Plex webhooks and a Python script designed for cloud deployment (e.g., Google Cloud Functions) to handle the Govee control.

## Key Components

* **`docker-compose.yml`**: Defines a Docker configuration to build and run the Node.js proxy.
* **`server.js`**: A Node.js Express server that acts as a proxy for Plex webhooks. It has been modified from the original [plex-webhook-proxy](https://github.com/jfklingler/plex-webhook-proxy) to include Plex client ID validation.
* **`package.json`** / **`package-lock.json`**: Node.js project dependencies and lockfile.
* **`env.js`**: Node.js configuration file for environment variables.
* **`plex-govee.py`**: A Python script intended for cloud deployment. It receives the forwarded webhook events and controls Govee lights.

## Modifications

The `server.js` from the original [plex-webhook-proxy](https://github.com/jfklingler/plex-webhook-proxy) has been modified to add validation for the Plex client ID. This allows you to restrict webhook processing to specific Plex clients.

## Functionality

1.  **Plex Webhook Proxy (`server.js`)**:
    * Receives webhooks from a Plex server.
    * **Validates the Plex client ID** against a list of allowed IDs (defined by the `ALLOWED_CLIENT_IDS` environment variable).
    * Forwards the webhook payload to a specified `POST_URL`.
    * Includes logging and health check endpoints.
    * Can be containerized using Docker.

2.  **Govee Control (`plex-govee.py`)**:
    * Designed to be deployed as a cloud function (e.g., on Google Cloud Functions).
    * Receives the forwarded webhook events.
    * Extracts relevant event information (e.g., media play/stop).
    * Uses the Govee API to control Govee lights based on Plex events.

## Setup

### Node.js Proxy

1.  **Configuration (`env.js` or Environment Variables):**
    * `LISTEN_PORT`: The port the proxy server listens on (default: 8080).
    * `LISTEN_PATH`: The path the proxy server listens on (default: `/`).
    * `POST_URL`: The URL to forward the webhook payloads to (e.g., your cloud function URL).
    * `ALLOWED_CLIENT_IDS`: A comma-separated list of Plex client IDs that are allowed to send webhooks.
    * `LOG_LEVEL`: The log level for the proxy server (e.g., `info`, `debug`, `warn`, `error`).

### Process to Obtain Plex Client IDs

To set up the allowed Plex client IDs, follow these steps:

1. **Log in to Plex**:
   - Visit [https://www.plex.tv/](https://www.plex.tv/) and log in with your Plex account.

2. **Access Devices XML**:
   - After logging in, navigate to [https://www.plex.tv/devices.xml](https://www.plex.tv/devices.xml). Here you will find a list of all devices associated with your Plex account.

3. **Find Client IDs**:
   - Look for the `<clientIdentifier>` tags in the XML file. These represent the client IDs for your devices.

4. **Add to Allowed List**:
   - Include the desired client IDs in the `ALLOWED_CLIENT_IDS` environment variable in your Node.js proxy configuration as a comma-separated list.

By completing these steps, you can restrict access to your Plex webhooks to specific devices.

2.  **Docker Deployment (Optional):**
    * Build the Docker image: `docker build -t plex-govee .`
    * Run the container (example):

    ```bash
    docker run -d \
      -p 10000:8080 \  # Map port 8080 in the container to 10000 on the host
      -e POST_URL="YOUR_CLOUD_FUNCTION_URL" \
      -e ALLOWED_CLIENT_IDS="PlexClientID1,PlexClientID2" \
      -e LOG_LEVEL="info" \
      --name plex-govee \
      --network proxy \  # Change network name
      plex-govee
    ```

    * The `docker-compose.yml` file provides a convenient way to manage this. You will need to update the environment variables in the `docker-compose.yml` file. Then run `docker-compose up -d`.

3.  **Manual Deployment (Alternative):**
    * Install Node.js and npm.
    * Run `npm install` to install dependencies.
    * Set the necessary environment variables.
    * Run the server: `npm start` or `node server.js`.

### Cloud Function (`plex-govee.py`)

1.  **Deployment:**
    * Deploy `plex-govee.py` to your cloud provider's function service (e.g., Google Cloud Functions).
    * Configure the following environment variables in your cloud function:
        * `GOVEE_API_KEY`: Your Govee API key.
        * `GOVEE_DEVICE_ID`: The Govee device ID to control.

2.  **Trigger:**
    * Set up the cloud function to be triggered by HTTP requests.
    * The URL of this cloud function should be set as the `POST_URL` in the Node.js proxy configuration.

### Plex Webhook Configuration

1.  In your Plex Media Server settings, navigate to the "Webhooks" section.
2.  Add a new webhook.
3.  **Enter the URL of your Node.js proxy server** (e.g., `http://your-server-ip:10000/` or `http://your-docker-host-ip:10000/`, adjusting the port if necessary) as the webhook URL.  If you changed the `LISTEN_PATH` from the default `/`, include that in the URL (e.g. `http://your-server:10000/plex`).
4.  Save the webhook configuration.

## Important Notes

* **Security:** Protect your Govee API key and cloud function URL. Consider using environment secrets or secure storage mechanisms provided by your cloud provider.
* **Error Handling:** The code includes basic error handling and logging, but you may want to enhance it for production use.
* **Dependencies:** Ensure that all dependencies are installed correctly (Node.js modules and Python libraries).
* **Govee Device Compatibility:** The `plex-govee.py` script may need adjustments to the `"model"` parameter in the `control_govee_light` function to match your specific Govee device.
* **Network Configuration:** If using Docker, ensure that the container can communicate with your Plex server and the cloud function. The `docker-compose.yml` file uses a network named `proxy`. You may need to create this network or modify the `docker-compose.yml` file.
