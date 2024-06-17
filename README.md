# email-sync-engine
A web application built for managing and synchronizing email data from Outlook using Node.js and Elasticsearch. Features include OAuth integration, real-time data synchronization, and scalable database design.

## Demo
[demo.webm](https://github.com/yugal-jain/email-sync-engine/assets/56795035/19a4dda8-63c2-4770-9551-d53b998c09a6)


## Prerequisites

To run this project, ensure you have the following installed:

- [Node.js](https://nodejs.org) on your development machine. If Node.js is not installed, follow the link for download instructions.
- A Microsoft account, either personal with an Outlook.com mailbox, or a Microsoft work or school account.


## Register a Web Application in Azure Active Directory

1. Open a browser and go to the Azure Active Directory admin center. Sign in using either a personal Microsoft account or a Work or School Account.
2. In the left-hand navigation pane, select **Azure Active Directory**, then under **Manage**, select **App registrations**.
3. Click on **New registration**. On the **Register an application** page, provide the following details:
   - **Name**: `Email Sync Engine`
   - **Supported account types**: Choose **Accounts in any organizational directory and personal Microsoft accounts**.
   - **Redirect URI**: Set the first drop-down to `Web` and enter `http://localhost:3000/auth/redirect`.
4. Click **Register**. On the application's overview page, note down the **Application (client) ID** as you will need it later.
5. Navigate to **Certificates & secrets** under **Manage**. Click on **New client secret**, provide a description, select an expiration period, and click **Add**.
6. Copy the client secret value. Ensure you save it as it will not be shown again.

   > **Important:** The client secret value is shown only once, so make sure to copy it.

7. Go to **API permissions** in your `Email Sync Engine` app and select **Microsoft Graph**. Add the following delegated permissions:
   - `User.Read`
   - `Calendars.ReadWrite`
   - `MailboxSettings.Read`
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `openid`
   - `profile`
   - `offline_access`

   After adding these permissions, click on **Grant admin consent for Default Directory**.

## Configure the Application

1. Rename the `example.env` file to `.env`.
2. Edit the `.env` file with the following changes:
   - Replace `YOUR_CLIENT_ID_HERE` with the **Application Id** obtained from the Azure App Registration.
   - Replace `YOUR_CLIENT_SECRET_HERE` with the client secret obtained from the Azure App Registration.

3. Open a terminal, navigate to the `src` directory, and run the Docker Compose file with `docker-compose up --build`. This will set up Elasticsearch and run the app in a container.
4. Run the setup script to create indices in Elasticsearch: `docker exec -it email-engine-app /bin/sh`.
5. Inside the container, navigate to the `setup` directory with `cd setup` and run `node createIndices.js`.
6. Open a browser and go to `http://localhost:3000`.

By following these steps, you'll have the Email Sync Engine up and running with the necessary configurations and prerequisites.
