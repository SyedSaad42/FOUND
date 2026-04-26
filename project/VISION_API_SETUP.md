# Google Cloud Vision API Setup Guide

This guide helps you set up Google Cloud Vision for ID verification in the FOUND app.

## Steps to Configure

### 1. Create a Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Click "Select a Project" > "New Project"
- Enter a project name (e.g., "FOUND-ID-Verification")
- Click "Create"

### 2. Enable the Vision API
- In the Cloud Console, go to "APIs & Services" > "Library"
- Search for "Cloud Vision API"
- Click on it and press "Enable"

### 3. Create an API Key
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "API Key"
- Copy the generated API key

### 4. Add the API Key to Your App
- Open `src/screens/ProfileScreen.tsx`
- Find the line: `const VISION_API_KEY = 'YOUR_GOOGLE_CLOUD_VISION_API_KEY';`
- Replace `'YOUR_GOOGLE_CLOUD_VISION_API_KEY'` with your actual API key

### 5. (Optional) Restrict Your API Key
For security, restrict your API key to your app:
- In Credentials, click on your API key
- Under "API restrictions", select "Cloud Vision API"
- Under "Application restrictions", select "Android app" and add your app's package name
- Save the changes

## How It Works

When a user taps "Authenticate ID":
1. Camera opens to capture the ID photo
2. Image is sent to Google Cloud Vision API
3. API detects:
   - Document text (OCR)
   - Face detection
4. If both text and face are detected, ID is marked as verified
5. Verification status is saved to user's profile

## Features Detected

- **Document Text Detection**: Verifies that the image contains readable text (ID information)
- **Face Detection**: Confirms there's a face on the ID (valid ID card)

## Security Notes

- API keys should ideally be kept in environment variables, not hardcoded
- Consider backend verification for production apps
- Add request signing and validation on your server

## Troubleshooting

### "Vision API failed" error
- Check that your API key is correct
- Ensure the Vision API is enabled in Google Cloud Console
- Check your API quota and billing setup

### "Could not detect valid ID information"
- Ensure the ID is clearly visible in the photo
- Make sure both the ID text and face are visible
- Try with better lighting

### Permission denied
- Check that camera permissions are granted in app settings
