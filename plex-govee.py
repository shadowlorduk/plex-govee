import logging
import json
import os
import requests

# --- Configuration ---
GOVEE_API_KEY = os.environ.get("GOVEE_API_KEY")
GOVEE_DEVICE_ID = os.environ.get("GOVEE_DEVICE_ID")


# --- Govee API Interaction ---
def control_govee_light(device_id, on):
    if not GOVEE_API_KEY:
        logging.error("GOVEE_API_KEY not set!")
        return

    url = "https://developer-api.govee.com/v1/devices/control"
    headers = {"Govee-API-Key": GOVEE_API_KEY}
    payload = {
        "device": device_id,
        "model": "H605C",  # You might need to adjust this
        "cmd": {"name": "turn", "value": "on" if on else "off"},
    }

    try:
        response = requests.put(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for bad status
        logging.info(f"Govee device '{device_id}' turned {'on' if on else 'off'}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error controlling Govee device: {e}")
    except Exception as e:
        logging.error(f"Unexpected error: {e}")


# --- Cloud Function Entry Point ---
def plex_webhook_handler(request):
    """Handles Plex webhooks."""
    logging.info("--- Function Started ---")
    try:
        # Parse JSON payload directly from the request
        payload = request.get_json(silent=True)
        if not payload:
            logging.error("No payload received in request.")
            return "No payload", 400

        # Log the raw payload for debugging
        logging.info(f"Raw Payload: {json.dumps(payload)}")

        event = payload.get("event")

        if event == "media.play":
            logging.info("Plex started playing.")
            if GOVEE_DEVICE_ID:
                control_govee_light(GOVEE_DEVICE_ID, True)
            else:
                logging.warning("GOVEE_DEVICE_ID not set!")
        elif event == "media.stop":
            logging.info("Plex stopped.")
            if GOVEE_DEVICE_ID:
                control_govee_light(GOVEE_DEVICE_ID, False)
            else:
                logging.warning("GOVEE_DEVICE_ID not set!")
        else:
            logging.info(f"Unhandled event: {event}")

        return "OK", 200

    except Exception as e:
        logging.error(f"Error processing webhook: {e}")
        return "ERROR", 500
